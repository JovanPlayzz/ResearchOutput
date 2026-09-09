import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  db,
  announcements,
  announcementReads,
  assignments,
  classrooms,
  events,
  materials,
  scheduleSlots,
  sections,
  submissions,
  todos,
  users,
  type Assignment,
  type Classroom,
  type ScheduleSlot,
  type Section,
  type Submission,
} from "@/db";
import { sectionLabel, type SchoolUser } from "./auth";
import { percent } from "./utils";
import { sortSlots, slotsOverlap, fmtRange, DAY_SHORT } from "./schedule";

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export type SectionSummary = Section & {
  label: string;
  adviserName: string | null;
  studentCount: number;
  classCount: number;
};

function sortSections<T extends Section>(list: T[]) {
  return [...list].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      Number(a.gradeLevel) - Number(b.gradeLevel) ||
      a.gradeLevel.localeCompare(b.gradeLevel) ||
      a.name.localeCompare(b.name),
  );
}

export async function schoolSections(
  schoolId: string,
): Promise<SectionSummary[]> {
  const rows = await db
    .select({ section: sections, adviserName: users.name })
    .from(sections)
    .leftJoin(users, eq(sections.adviserId, users.id))
    .where(eq(sections.schoolId, schoolId))
    .all();
  const studentCounts = await db
    .select({
      sectionId: users.sectionId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "student")))
    .groupBy(users.sectionId)
    .all();
  const classCounts = await db
    .select({
      sectionId: classrooms.sectionId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(classrooms)
    .where(
      and(eq(classrooms.schoolId, schoolId), eq(classrooms.archived, false)),
    )
    .groupBy(classrooms.sectionId)
    .all();
  const sc = new Map(studentCounts.map((r) => [r.sectionId, r.n]));
  const cc = new Map(classCounts.map((r) => [r.sectionId, r.n]));
  return sortSections(rows.map((r) => r.section)).map((s) => ({
    ...s,
    label: sectionLabel(s),
    adviserName: rows.find((r) => r.section.id === s.id)?.adviserName ?? null,
    studentCount: sc.get(s.id) ?? 0,
    classCount: cc.get(s.id) ?? 0,
  }));
}

export async function getSection(id: string) {
  return (
    (await db.select().from(sections).where(eq(sections.id, id)).get()) ?? null
  );
}

export async function sectionStudents(sectionId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.sectionId, sectionId), eq(users.role, "student")))
    .orderBy(asc(users.name))
    .all();
}

export async function unassignedStudents(schoolId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.schoolId, schoolId),
        eq(users.role, "student"),
        isNull(users.sectionId),
      ),
    )
    .orderBy(asc(users.name))
    .all();
}

/** Sections a user "belongs to": their own (student), the ones they advise or teach (teacher), or all (admin). */
export async function userSectionIds(user: SchoolUser): Promise<string[]> {
  if (user.role === "student") return user.sectionId ? [user.sectionId] : [];
  if (user.role === "admin")
    return (
      await db
        .select({ id: sections.id })
        .from(sections)
        .where(eq(sections.schoolId, user.schoolId))
        .all()
    ).map((r) => r.id);
  const advised = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.adviserId, user.id))
    .all();
  const taught = await db
    .select({ id: classrooms.sectionId })
    .from(classrooms)
    .where(eq(classrooms.teacherId, user.id))
    .all();
  return [
    ...new Set([...advised.map((r) => r.id), ...taught.map((r) => r.id)]),
  ];
}

/* ------------------------------------------------------------------ */
/* Teachers                                                            */
/* ------------------------------------------------------------------ */

export type TeacherSummary = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  createdAt: Date;
  classCount: number;
  sectionCount: number;
  advises: string[];
};

export async function schoolTeachers(
  schoolId: string,
): Promise<TeacherSummary[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "teacher")))
    .orderBy(asc(users.name))
    .all();
  const loads = await db
    .select({
      teacherId: classrooms.teacherId,
      sectionId: classrooms.sectionId,
    })
    .from(classrooms)
    .where(
      and(eq(classrooms.schoolId, schoolId), eq(classrooms.archived, false)),
    )
    .all();
  const advised = await db
    .select({
      adviserId: sections.adviserId,
      gradeLevel: sections.gradeLevel,
      name: sections.name,
    })
    .from(sections)
    .where(eq(sections.schoolId, schoolId))
    .all();
  return rows.map((t) => {
    const mine = loads.filter((l) => l.teacherId === t.id);
    return {
      ...t,
      classCount: mine.length,
      sectionCount: new Set(mine.map((l) => l.sectionId)).size,
      advises: advised
        .filter((s) => s.adviserId === t.id)
        .map((s) => sectionLabel(s)),
    };
  });
}

export async function getTeacher(id: string, schoolId: string) {
  return (
    (await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        department: users.department,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.schoolId, schoolId),
          eq(users.role, "teacher"),
        ),
      )
      .get()) ?? null
  );
}

export async function schoolAdmins(schoolId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "admin")))
    .orderBy(asc(users.name))
    .all();
}

export type PersonHit = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  where: string;
  href: string | null;
};

/** Name/email search across the whole school, for the admin People page. */
export async function searchPeople(
  schoolId: string,
  q: string,
): Promise<PersonHit[]> {
  const term = `%${q.trim()}%`;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      section: sections,
    })
    .from(users)
    .leftJoin(sections, eq(users.sectionId, sections.id))
    .where(
      and(
        eq(users.schoolId, schoolId),
        or(like(users.name, term), like(users.email, term)),
      ),
    )
    .orderBy(asc(users.role), asc(users.name))
    .limit(60)
    .all();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    where:
      r.role === "student"
        ? r.section
          ? sectionLabel(r.section)
          : "No section yet"
        : r.role === "teacher"
          ? (r.department ?? "No department")
          : "Administrator",
    href:
      r.role === "student" && r.section
        ? `/admin/sections/${r.section.id}`
        : r.role === "teacher"
          ? `/admin/teachers/${r.id}`
          : null,
  }));
}

/* ------------------------------------------------------------------ */
/* Classes                                                             */
/* ------------------------------------------------------------------ */

export type ClassroomSummary = Classroom & {
  teacherName: string;
  teacherDepartment: string | null;
  section: Section;
  sectionLabel: string;
  studentCount: number;
  slots: ScheduleSlot[];
  scheduleText: string;
};

type ClassRow = {
  classroom: Classroom;
  teacherName: string;
  teacherDepartment: string | null;
  section: Section;
};

function classBase() {
  return db
    .select({
      classroom: classrooms,
      teacherName: users.name,
      teacherDepartment: users.department,
      section: sections,
    })
    .from(classrooms)
    .innerJoin(users, eq(classrooms.teacherId, users.id))
    .innerJoin(sections, eq(classrooms.sectionId, sections.id));
}

async function decorateClasses(rows: ClassRow[]): Promise<ClassroomSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.classroom.id);
  const slots = await db
    .select()
    .from(scheduleSlots)
    .where(inArray(scheduleSlots.classroomId, ids))
    .all();
  const sectionIds = [...new Set(rows.map((r) => r.section.id))];
  const counts = await db
    .select({
      sectionId: users.sectionId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(users)
    .where(and(inArray(users.sectionId, sectionIds), eq(users.role, "student")))
    .groupBy(users.sectionId)
    .all();
  const countMap = new Map(counts.map((c) => [c.sectionId, c.n]));
  return rows
    .map((r) => {
      const mine = sortSlots(
        slots.filter((s) => s.classroomId === r.classroom.id),
      );
      return {
        ...r.classroom,
        teacherName: r.teacherName,
        teacherDepartment: r.teacherDepartment,
        section: r.section,
        sectionLabel: sectionLabel(r.section),
        studentCount: countMap.get(r.section.id) ?? 0,
        slots: mine,
        scheduleText: describeSlotsShort(mine),
      };
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.sectionLabel.localeCompare(b.sectionLabel),
    );
}

function describeSlotsShort(slots: ScheduleSlot[]) {
  if (slots.length === 0) return "";
  const groups = new Map<
    string,
    { days: number[]; startMin: number; endMin: number }
  >();
  for (const s of slots) {
    const key = `${s.startMin}-${s.endMin}`;
    const g = groups.get(key) ?? {
      days: [],
      startMin: s.startMin,
      endMin: s.endMin,
    };
    g.days.push(s.day);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map(
      (g) =>
        `${g.days.map((d) => DAY_SHORT[d]).join(" · ")} ${fmtRange(g.startMin, g.endMin)}`,
    )
    .join(" / ");
}

/** The classes this user can see: taught (teacher), their section's (student), or every class in the school (admin). */
export async function visibleClassrooms(
  user: SchoolUser,
  opts: { includeArchived?: boolean; semester?: number } = {},
): Promise<ClassroomSummary[]> {
  const archived = opts.includeArchived
    ? undefined
    : eq(classrooms.archived, false);
  const sem = opts.semester
    ? eq(classrooms.semester, opts.semester)
    : undefined;
  let rows: ClassRow[];
  if (user.role === "admin") {
    rows = await classBase()
      .where(and(eq(classrooms.schoolId, user.schoolId), archived, sem))
      .all();
  } else if (user.role === "teacher") {
    rows = await classBase()
      .where(and(eq(classrooms.teacherId, user.id), archived, sem))
      .all();
  } else if (user.sectionId) {
    rows = await classBase()
      .where(and(eq(classrooms.sectionId, user.sectionId), archived, sem))
      .all();
  } else {
    rows = [];
  }
  return await decorateClasses(rows);
}

export async function visibleClassroomIds(user: SchoolUser) {
  return (await visibleClassrooms(user, { includeArchived: true })).map(
    (c) => c.id,
  );
}

export async function sectionClasses(
  sectionId: string,
  opts: { includeArchived?: boolean; semester?: number } = {},
) {
  const archived = opts.includeArchived
    ? undefined
    : eq(classrooms.archived, false);
  const sem = opts.semester
    ? eq(classrooms.semester, opts.semester)
    : undefined;
  return await decorateClasses(
    await classBase()
      .where(and(eq(classrooms.sectionId, sectionId), archived, sem))
      .all(),
  );
}

export async function teacherClasses(
  teacherId: string,
  opts: { includeArchived?: boolean; semester?: number } = {},
) {
  const archived = opts.includeArchived
    ? undefined
    : eq(classrooms.archived, false);
  const sem = opts.semester
    ? eq(classrooms.semester, opts.semester)
    : undefined;
  return await decorateClasses(
    await classBase()
      .where(and(eq(classrooms.teacherId, teacherId), archived, sem))
      .all(),
  );
}

export async function getClassroom(id: string) {
  return (
    (await db.select().from(classrooms).where(eq(classrooms.id, id)).get()) ??
    null
  );
}

export async function getClassroomSummary(
  id: string,
): Promise<ClassroomSummary | null> {
  const rows = await classBase().where(eq(classrooms.id, id)).all();
  return (await decorateClasses(rows))[0] ?? null;
}

export function canAccessClassroom(user: SchoolUser, classroom: Classroom) {
  if (classroom.schoolId !== user.schoolId) return false;
  if (user.role === "admin") return true;
  if (user.role === "teacher") return classroom.teacherId === user.id;
  return Boolean(user.sectionId) && classroom.sectionId === user.sectionId;
}

/** Everyone in the class = everyone in its section. */
export async function classroomStudents(classroomId: string) {
  const c = await getClassroom(classroomId);
  return c ? await sectionStudents(c.sectionId) : [];
}

export async function classroomMaterials(classroomId: string) {
  return await db
    .select()
    .from(materials)
    .where(eq(materials.classroomId, classroomId))
    .orderBy(desc(materials.createdAt))
    .all();
}

/* ------------------------------------------------------------------ */
/* Timetable                                                           */
/* ------------------------------------------------------------------ */

export type TimetableSlot = {
  id: string;
  day: number;
  startMin: number;
  endMin: number;
  room: string | null;
  classroomId: string;
  className: string;
  classColor: string;
  teacherName: string;
  sectionLabel: string;
};

function slotBase() {
  return db
    .select({
      id: scheduleSlots.id,
      day: scheduleSlots.day,
      startMin: scheduleSlots.startMin,
      endMin: scheduleSlots.endMin,
      room: scheduleSlots.room,
      classroomId: scheduleSlots.classroomId,
      className: classrooms.name,
      classColor: classrooms.color,
      teacherName: users.name,
      section: sections,
    })
    .from(scheduleSlots)
    .innerJoin(classrooms, eq(scheduleSlots.classroomId, classrooms.id))
    .innerJoin(users, eq(classrooms.teacherId, users.id))
    .innerJoin(sections, eq(classrooms.sectionId, sections.id));
}

function toTimetable(
  rows: Array<Omit<TimetableSlot, "sectionLabel"> & { section: Section }>,
): TimetableSlot[] {
  return sortSlots(
    rows.map(({ section, ...r }) => ({
      ...r,
      sectionLabel: sectionLabel(section),
    })),
  );
}

export async function sectionSlots(sectionId: string, semester?: number) {
  const sem = semester ? eq(classrooms.semester, semester) : undefined;
  return toTimetable(
    await slotBase()
      .where(
        and(
          eq(classrooms.sectionId, sectionId),
          eq(classrooms.archived, false),
          sem,
        ),
      )
      .all(),
  );
}

export async function teacherSlots(teacherId: string, semester?: number) {
  const sem = semester ? eq(classrooms.semester, semester) : undefined;
  return toTimetable(
    await slotBase()
      .where(
        and(
          eq(classrooms.teacherId, teacherId),
          eq(classrooms.archived, false),
          sem,
        ),
      )
      .all(),
  );
}

export async function classroomSlots(classroomId: string) {
  return sortSlots(
    await db
      .select()
      .from(scheduleSlots)
      .where(eq(scheduleSlots.classroomId, classroomId))
      .all(),
  );
}

/** Timetable for whoever is signed in: their section (student) or their load (teacher). */
export async function mySlots(
  user: SchoolUser,
  semester?: number,
): Promise<TimetableSlot[]> {
  if (user.role === "student")
    return user.sectionId ? await sectionSlots(user.sectionId, semester) : [];
  if (user.role === "teacher") return await teacherSlots(user.id, semester);
  return [];
}

/** Human-readable clashes a new slot would cause for the class's section or teacher. */
export async function slotConflicts(
  classroom: Classroom,
  candidate: { day: number; startMin: number; endMin: number },
  excludeSlotId?: string,
) {
  const problems: string[] = [];
  const check = (list: TimetableSlot[], who: string) => {
    for (const s of list) {
      if (s.id === excludeSlotId || s.classroomId === classroom.id) continue;
      if (slotsOverlap(s, candidate))
        problems.push(
          `${who} already has ${s.className} on ${DAY_SHORT[s.day]} ${fmtRange(s.startMin, s.endMin)}.`,
        );
    }
  };
  // Only classes in the same semester can clash.
  const section = await getSection(classroom.sectionId);
  check(
    await sectionSlots(classroom.sectionId, classroom.semester),
    section ? sectionLabel(section) : "The section",
  );
  const teacher = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, classroom.teacherId))
    .get();
  check(
    await teacherSlots(classroom.teacherId, classroom.semester),
    teacher?.name ?? "The teacher",
  );
  return problems;
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  pinned: boolean;
  createdAt: Date;
  classroomId: string | null;
  className: string | null;
  classColor: string | null;
  sectionId: string | null;
  sectionLabel: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  imageUrl: string | null;
  imageName: string | null;
  read: boolean;
  /** Only filled in for the author and admins. */
  readCount: number | null;
  audienceCount: number | null;
  unreadNames: string[] | null;
};

/** Who an announcement is for: the section's students (class or section posts) or everyone else in the school. */
async function announcementAudience(
  a: { classroomId: string | null; sectionId: string | null; authorId: string },
  schoolId: string,
) {
  if (a.classroomId) {
    const c = await getClassroom(a.classroomId);
    return c ? await sectionStudents(c.sectionId) : [];
  }
  if (a.sectionId) return await sectionStudents(a.sectionId);
  return await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), ne(users.id, a.authorId)))
    .all();
}

/** SQL: school-wide, or in one of the user's sections, or in one of their classes. */
function audienceScope(
  user: SchoolUser,
  sectionIds: string[],
  classIds: string[],
): SQL {
  const parts: SQL[] = [
    and(isNull(announcements.classroomId), isNull(announcements.sectionId))!,
  ];
  if (sectionIds.length)
    parts.push(inArray(announcements.sectionId, sectionIds));
  if (classIds.length) parts.push(inArray(announcements.classroomId, classIds));
  return or(...parts)!;
}

export async function listAnnouncements(
  user: SchoolUser,
  opts: {
    classroomId?: string;
    sectionId?: string;
    limit?: number;
    filter?: "unread" | "school" | "section" | "classes";
  } = {},
): Promise<AnnouncementRow[]> {
  const sectionIds = await userSectionIds(user);
  const classIds = await visibleClassroomIds(user);

  let scope: SQL | undefined = audienceScope(user, sectionIds, classIds);
  if (opts.classroomId) scope = eq(announcements.classroomId, opts.classroomId);
  else if (opts.sectionId) scope = eq(announcements.sectionId, opts.sectionId);
  else if (opts.filter === "school")
    scope = and(
      isNull(announcements.classroomId),
      isNull(announcements.sectionId),
    );
  else if (opts.filter === "section")
    scope = sectionIds.length
      ? inArray(announcements.sectionId, sectionIds)
      : sql`0`;
  else if (opts.filter === "classes")
    scope = classIds.length
      ? inArray(announcements.classroomId, classIds)
      : sql`0`;

  const q = db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      priority: announcements.priority,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      classroomId: announcements.classroomId,
      className: classrooms.name,
      classColor: classrooms.color,
      sectionId: announcements.sectionId,
      section: sections,
      authorId: announcements.authorId,
      authorName: users.name,
      authorRole: users.role,
      imagePath: announcements.imagePath,
      imageName: announcements.imageName,
      readAt: announcementReads.readAt,
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .leftJoin(classrooms, eq(announcements.classroomId, classrooms.id))
    .leftJoin(sections, eq(announcements.sectionId, sections.id))
    .leftJoin(
      announcementReads,
      and(
        eq(announcementReads.announcementId, announcements.id),
        eq(announcementReads.userId, user.id),
      ),
    )
    .where(
      and(
        eq(announcements.schoolId, user.schoolId),
        scope,
        opts.filter === "unread" ? isNull(announcementReads.readAt) : undefined,
      ),
    )
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt));

  const rows = await (opts.limit ? q.limit(opts.limit) : q).all();
  return Promise.all(
    rows.map(async ({ readAt, section, imagePath, ...r }) => {
      const row: AnnouncementRow = {
        ...r,
        sectionLabel: section ? sectionLabel(section) : null,
        imageUrl: imagePath ? `/api/images/${r.id}` : null,
        read: Boolean(readAt),
        readCount: null,
        audienceCount: null,
        unreadNames: null,
      };
      if (user.role === "admin" || r.authorId === user.id) {
        const audience = await announcementAudience(r, user.schoolId);
        const readIds = new Set(
          (
            await db
              .select({ userId: announcementReads.userId })
              .from(announcementReads)
              .where(eq(announcementReads.announcementId, r.id))
              .all()
          ).map((x) => x.userId),
        );
        row.audienceCount = audience.length;
        row.readCount = audience.filter((u) => readIds.has(u.id)).length;
        row.unreadNames = audience
          .filter((u) => !readIds.has(u.id))
          .map((u) => u.name)
          .sort((a, b) => a.localeCompare(b));
      }
      return row;
    }),
  );
}

export async function visibleAnnouncementIds(user: SchoolUser) {
  const scope = audienceScope(
    user,
    await userSectionIds(user),
    await visibleClassroomIds(user),
  );
  return (
    await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(and(eq(announcements.schoolId, user.schoolId), scope))
      .all()
  ).map((r) => r.id);
}

export async function unreadAnnouncementCount(user: SchoolUser) {
  const scope = audienceScope(
    user,
    await userSectionIds(user),
    await visibleClassroomIds(user),
  );
  const row = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(announcements)
    .leftJoin(
      announcementReads,
      and(
        eq(announcementReads.announcementId, announcements.id),
        eq(announcementReads.userId, user.id),
      ),
    )
    .where(
      and(
        eq(announcements.schoolId, user.schoolId),
        scope,
        isNull(announcementReads.readAt),
      ),
    )
    .get();
  return row?.n ?? 0;
}

/** Where this user is allowed to post: whole school (admin), sections they advise/manage, classes they teach. */
export type Audience = {
  value: string;
  label: string;
  group: "School" | "Sections" | "Classes";
};
export async function postingAudiences(user: SchoolUser): Promise<Audience[]> {
  const out: Audience[] = [];
  if (user.role === "admin") {
    out.push({ value: "school", label: "Whole school", group: "School" });
    for (const s of await schoolSections(user.schoolId))
      out.push({ value: `section:${s.id}`, label: s.label, group: "Sections" });
  } else if (user.role === "teacher") {
    const advised = sortSections(
      await db
        .select()
        .from(sections)
        .where(eq(sections.adviserId, user.id))
        .all(),
    );
    for (const s of advised)
      out.push({
        value: `section:${s.id}`,
        label: `${sectionLabel(s)} (homeroom)`,
        group: "Sections",
      });
    for (const c of await teacherClasses(user.id))
      out.push({
        value: `class:${c.id}`,
        label: `${c.name} · ${c.sectionLabel}`,
        group: "Classes",
      });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export type CalendarItem = {
  id: string;
  title: string;
  kind:
    "school" | "holiday" | "exam" | "activity" | "meeting" | "class" | "due";
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  classroomId: string | null;
  className: string | null;
  classColor: string | null;
  sectionLabel: string | null;
  href: string | null;
  createdBy: string | null;
};

export async function calendarItems(
  user: SchoolUser,
  from: Date,
  to: Date,
): Promise<CalendarItem[]> {
  const sectionIds = await userSectionIds(user);
  const classIds = await visibleClassroomIds(user);
  const parts: SQL[] = [
    and(isNull(events.classroomId), isNull(events.sectionId))!,
  ];
  if (sectionIds.length) parts.push(inArray(events.sectionId, sectionIds));
  if (classIds.length) parts.push(inArray(events.classroomId, classIds));

  const eventRows = await db
    .select({
      id: events.id,
      title: events.title,
      kind: events.kind,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      location: events.location,
      description: events.description,
      classroomId: events.classroomId,
      className: classrooms.name,
      classColor: classrooms.color,
      section: sections,
      createdBy: events.createdBy,
    })
    .from(events)
    .leftJoin(classrooms, eq(events.classroomId, classrooms.id))
    .leftJoin(sections, eq(events.sectionId, sections.id))
    .where(
      and(
        eq(events.schoolId, user.schoolId),
        or(...parts),
        lte(events.startsAt, to),
        or(gte(events.startsAt, from), gte(events.endsAt, from)),
      ),
    )
    .orderBy(asc(events.startsAt))
    .all();

  const items: CalendarItem[] = eventRows.map(({ section, ...e }) => ({
    ...e,
    sectionLabel: section ? sectionLabel(section) : null,
    href: null,
  }));

  if (classIds.length > 0) {
    const dueRows = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        dueAt: assignments.dueAt,
        classroomId: assignments.classroomId,
        className: classrooms.name,
        classColor: classrooms.color,
        section: sections,
      })
      .from(assignments)
      .innerJoin(classrooms, eq(assignments.classroomId, classrooms.id))
      .innerJoin(sections, eq(classrooms.sectionId, sections.id))
      .where(
        and(
          inArray(assignments.classroomId, classIds),
          gte(assignments.dueAt, from),
          lte(assignments.dueAt, to),
        ),
      )
      .all();
    for (const d of dueRows) {
      items.push({
        id: `due-${d.id}`,
        title: d.title,
        kind: "due",
        startsAt: d.dueAt!,
        endsAt: null,
        allDay: false,
        location: null,
        description: null,
        classroomId: d.classroomId,
        className: d.className,
        classColor: d.classColor,
        sectionLabel: sectionLabel(d.section),
        href: `/classes/${d.classroomId}/work/${d.id}`,
        createdBy: null,
      });
    }
  }
  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/* ------------------------------------------------------------------ */
/* Classwork & grades                                                  */
/* ------------------------------------------------------------------ */

export type WorkWithStatus = Assignment & {
  className: string;
  classColor: string;
  sectionLabel: string;
  submission: Submission | null;
  submittedCount: number;
  ungradedCount: number;
  studentCount: number;
};

type WorkRow = {
  assignment: Assignment;
  className: string;
  classColor: string;
  section: Section;
};

function workBase() {
  return db
    .select({
      assignment: assignments,
      className: classrooms.name,
      classColor: classrooms.color,
      section: sections,
    })
    .from(assignments)
    .innerJoin(classrooms, eq(assignments.classroomId, classrooms.id))
    .innerJoin(sections, eq(classrooms.sectionId, sections.id));
}

async function decorateWork(
  rows: WorkRow[],
  studentId?: string,
): Promise<WorkWithStatus[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.assignment.id);
  const subs = await db
    .select()
    .from(submissions)
    .where(inArray(submissions.assignmentId, ids))
    .all();
  const sectionIds = [...new Set(rows.map((r) => r.section.id))];
  const counts = await db
    .select({
      sectionId: users.sectionId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(users)
    .where(and(inArray(users.sectionId, sectionIds), eq(users.role, "student")))
    .groupBy(users.sectionId)
    .all();
  const countMap = new Map(counts.map((c) => [c.sectionId, c.n]));
  return rows.map((r) => {
    const mine = subs.filter((s) => s.assignmentId === r.assignment.id);
    return {
      ...r.assignment,
      className: r.className,
      classColor: r.classColor,
      sectionLabel: sectionLabel(r.section),
      submission: studentId
        ? (mine.find((s) => s.studentId === studentId) ?? null)
        : null,
      submittedCount: mine.length,
      ungradedCount: mine.filter((s) => s.score == null).length,
      studentCount: countMap.get(r.section.id) ?? 0,
    };
  });
}

export async function classroomWork(
  classroomId: string,
  studentId?: string,
  quarter?: number,
): Promise<WorkWithStatus[]> {
  const rows = await workBase()
    .where(
      and(
        eq(assignments.classroomId, classroomId),
        quarter ? eq(assignments.quarter, quarter) : undefined,
      ),
    )
    .orderBy(desc(assignments.dueAt), desc(assignments.createdAt))
    .all();
  return await decorateWork(rows, studentId);
}

export async function getAssignment(id: string) {
  return (
    (await db.select().from(assignments).where(eq(assignments.id, id)).get()) ??
    null
  );
}

export async function assignmentSubmissions(assignmentId: string) {
  return await db
    .select({
      submission: submissions,
      student: { id: users.id, name: users.name, email: users.email },
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(eq(submissions.assignmentId, assignmentId))
    .orderBy(asc(users.name))
    .all();
}

export async function getSubmission(assignmentId: string, studentId: string) {
  return (
    (await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentId, studentId),
        ),
      )
      .get()) ?? null
  );
}

/** Work the student hasn't turned in yet, soonest due first. */
export async function studentUpcomingWork(
  user: SchoolUser,
  limit = 8,
): Promise<WorkWithStatus[]> {
  const ids = await visibleClassroomIds(user);
  if (ids.length === 0) return [];
  const rows = await workBase()
    .leftJoin(
      submissions,
      and(
        eq(submissions.assignmentId, assignments.id),
        eq(submissions.studentId, user.id),
      ),
    )
    .where(and(inArray(assignments.classroomId, ids), isNull(submissions.id)))
    .orderBy(
      sql`case when ${assignments.dueAt} is null then 1 else 0 end`,
      asc(assignments.dueAt),
    )
    .limit(limit)
    .all();
  return await decorateWork(rows, user.id);
}

/** Work in the teacher's classes that still has ungraded submissions. */
export async function teacherGradingQueue(
  user: SchoolUser,
  limit = 8,
): Promise<WorkWithStatus[]> {
  const ids = await visibleClassroomIds(user);
  if (ids.length === 0) return [];
  const rows = await workBase()
    .where(inArray(assignments.classroomId, ids))
    .orderBy(desc(assignments.dueAt))
    .all();
  return (await decorateWork(rows))
    .filter((w) => w.ungradedCount > 0)
    .slice(0, limit);
}

export type QuarterGrade = {
  quarter: number;
  earned: number;
  possible: number;
  pct: number | null;
  items: Array<{
    assignment: Assignment;
    submission: Submission | null;
    pct: number | null;
  }>;
};

export type ClassGrade = {
  classroom: ClassroomSummary;
  quarters: QuarterGrade[];
  overallPct: number | null;
  gradedCount: number;
  missingCount: number;
};

/** A student's standing in each class, split by quarter, from graded work only. */
export async function studentGrades(
  user: SchoolUser,
  studentId = user.id,
  semester?: number,
): Promise<ClassGrade[]> {
  const classes =
    user.role === "student" ? await visibleClassrooms(user, { semester }) : [];
  const now = Date.now();
  return Promise.all(
    classes.map(async (classroom) => {
      const rows = await db
        .select({ assignment: assignments, submission: submissions })
        .from(assignments)
        .leftJoin(
          submissions,
          and(
            eq(submissions.assignmentId, assignments.id),
            eq(submissions.studentId, studentId),
          ),
        )
        .where(eq(assignments.classroomId, classroom.id))
        .orderBy(desc(assignments.dueAt))
        .all();
      let gradedCount = 0;
      let missingCount = 0;
      const quarters: QuarterGrade[] = [1, 2, 3, 4].map((quarter) => {
        let earned = 0;
        let possible = 0;
        const items = rows
          .filter((r) => r.assignment.quarter === quarter)
          .map((r) => {
            const s = r.submission;
            if (s?.score != null) {
              earned += s.score;
              possible += r.assignment.points;
              gradedCount += 1;
            } else if (
              !s &&
              r.assignment.dueAt &&
              r.assignment.dueAt.getTime() < now
            ) {
              missingCount += 1;
            }
            return {
              assignment: r.assignment,
              submission: s,
              pct: percent(s?.score, r.assignment.points),
            };
          });
        return {
          quarter,
          earned,
          possible,
          pct: percent(earned, possible),
          items,
        };
      });
      const totalEarned = quarters.reduce((a, q) => a + q.earned, 0);
      const totalPossible = quarters.reduce((a, q) => a + q.possible, 0);
      return {
        classroom,
        quarters,
        overallPct: percent(totalEarned, totalPossible),
        gradedCount,
        missingCount,
      };
    }),
  );
}

/** Average of the quarters that have a grade, or null. Semester 1 = Q1+Q2, semester 2 = Q3+Q4. */
export function semesterAverage(quarters: QuarterGrade[], semester: 1 | 2) {
  const picks = quarters.filter(
    (q) => (semester === 1 ? q.quarter <= 2 : q.quarter >= 3) && q.pct != null,
  );
  if (picks.length === 0) return null;
  return (
    Math.round(
      (picks.reduce((a, q) => a + (q.pct as number), 0) / picks.length) * 10,
    ) / 10
  );
}

export type GradebookRow = {
  student: { id: string; name: string; email: string };
  cells: Array<{ assignment: Assignment; submission: Submission | null }>;
  earned: number;
  possible: number;
  pct: number | null;
};

export async function classGradebook(
  classroomId: string,
  quarter: number | null,
): Promise<{ work: Assignment[]; rows: GradebookRow[] }> {
  const work = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.classroomId, classroomId),
        quarter ? eq(assignments.quarter, quarter) : undefined,
      ),
    )
    .orderBy(asc(assignments.quarter), asc(assignments.dueAt))
    .all();
  const students = await classroomStudents(classroomId);
  const subs = work.length
    ? await db
        .select()
        .from(submissions)
        .where(
          inArray(
            submissions.assignmentId,
            work.map((w) => w.id),
          ),
        )
        .all()
    : [];
  const byKey = new Map(
    subs.map((s) => [`${s.assignmentId}:${s.studentId}`, s]),
  );
  const rows = students.map((student) => {
    let earned = 0;
    let possible = 0;
    const cells = work.map((assignment) => {
      const submission = byKey.get(`${assignment.id}:${student.id}`) ?? null;
      if (submission?.score != null) {
        earned += submission.score;
        possible += assignment.points;
      }
      return { assignment, submission };
    });
    return { student, cells, earned, possible, pct: percent(earned, possible) };
  });
  return { work, rows };
}

/* ------------------------------------------------------------------ */
/* To-do & school                                                      */
/* ------------------------------------------------------------------ */

export async function userTodos(userId: string) {
  return await db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(
      asc(todos.done),
      sql`case when ${todos.dueAt} is null then 1 else 0 end`,
      asc(todos.dueAt),
      desc(todos.createdAt),
    )
    .all();
}

export async function schoolStats(schoolId: string) {
  const count = async (where: SQL) =>
    (
      await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(users)
        .where(where)
        .get()
    )?.n ?? 0;
  return {
    students: await count(
      and(eq(users.schoolId, schoolId), eq(users.role, "student"))!,
    ),
    teachers: await count(
      and(eq(users.schoolId, schoolId), eq(users.role, "teacher"))!,
    ),
    admins: await count(
      and(eq(users.schoolId, schoolId), eq(users.role, "admin"))!,
    ),
    unassigned: await count(
      and(
        eq(users.schoolId, schoolId),
        eq(users.role, "student"),
        isNull(users.sectionId),
      )!,
    ),
    sections:
      (
        await db
          .select({ n: sql<number>`count(*)`.mapWith(Number) })
          .from(sections)
          .where(eq(sections.schoolId, schoolId))
          .get()
      )?.n ?? 0,
    classes:
      (
        await db
          .select({ n: sql<number>`count(*)`.mapWith(Number) })
          .from(classrooms)
          .where(
            and(
              eq(classrooms.schoolId, schoolId),
              eq(classrooms.archived, false),
            ),
          )
          .get()
      )?.n ?? 0,
  };
}
