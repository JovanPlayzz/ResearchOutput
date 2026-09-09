import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { hashPassword } from "@/lib/password";
import { newId } from "@/lib/ids";

type Db = LibSQLDatabase<typeof schema>;

export const DEMO_PASSWORD = "password123";

const DAY = 24 * 60 * 60 * 1000;
function at(daysFromNow: number, hour = 8, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return new Date(d.getTime() + daysFromNow * DAY);
}

/**
 * Fills an empty database with a believable demo school so the portal is
 * worth looking at the first time it starts. Safe to call repeatedly.
 */
export async function seedIfEmpty(db: Db) {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .limit(1)
    .all();
  if (existing.length > 0) return;

  const now = new Date();
  const passwordHash = hashPassword(DEMO_PASSWORD);

  /* ---------- school ---------- */
  const schoolId = newId();
  await db
    .insert(schema.schools)
    .values({
      id: schoolId,
      name: "Lakeside Academy",
      code: "LAKE26",
      motto: "Learn well. Live kindly.",
      schoolYear: "2026 – 2027",
      currentQuarter: 1,
      createdAt: now,
    })
    .run();

  /* ---------- people ---------- */
  const mk = async (
    name: string,
    email: string,
    role: schema.Role,
    extra: { department?: string; sectionId?: string } = {},
  ) => {
    const id = newId();
    await db
      .insert(schema.users)
      .values({
        id,
        name,
        email,
        passwordHash,
        role,
        schoolId,
        department: extra.department ?? null,
        sectionId: extra.sectionId ?? null,
        createdAt: now,
      })
      .run();
    return id;
  };

  const admin = await mk(
    "Principal Ana Marquez",
    "admin@lakeside.edu",
    "admin",
  );
  const reyes = await mk("Elena Reyes", "reyes@lakeside.edu", "teacher", {
    department: "Science",
  });
  const cruz = await mk("Daniel Cruz", "cruz@lakeside.edu", "teacher", {
    department: "Mathematics",
  });
  const lim = await mk("Hannah Lim", "lim@lakeside.edu", "teacher", {
    department: "English",
  });
  const villar = await mk("Marco Villar", "villar@lakeside.edu", "teacher", {
    department: "Science",
  });
  const dizon = await mk("Rosa Dizon", "dizon@lakeside.edu", "teacher", {
    department: "Filipino",
  });
  const pramos = await mk("Paolo Ramos", "pramos@lakeside.edu", "teacher", {
    department: "MAPEH",
  });

  /* ---------- sections ---------- */
  let sectionOrder = 0;
  const mkSection = async (
    gradeLevel: string,
    name: string,
    adviserId: string,
  ) => {
    const id = newId();
    await db
      .insert(schema.sections)
      .values({
        id,
        schoolId,
        gradeLevel,
        name,
        adviserId,
        sortOrder: sectionOrder++,
        createdAt: now,
      })
      .run();
    return id;
  };
  const core12 = await mkSection("12", "CORE", cruz);
  const stemB12 = await mkSection("12", "STEM B", villar);
  const stemA11 = await mkSection("11", "STEM A", reyes);
  const humssA11 = await mkSection("11", "HUMSS A", lim);

  const roster = (sectionId: string, people: Array<[string, string]>) =>
    Promise.all(people.map(([n, e]) => mk(n, e, "student", { sectionId })));

  const [maya, liam, aria, noah, sofia, ethan] = await roster(core12, [
    ["Maya Santos", "maya@lakeside.edu"],
    ["Liam Torres", "liam@lakeside.edu"],
    ["Aria Villanueva", "aria@lakeside.edu"],
    ["Noah Dela Cruz", "noah@lakeside.edu"],
    ["Sofia Mendoza", "sofia@lakeside.edu"],
    ["Ethan Bautista", "ethan@lakeside.edu"],
  ]);
  const coreStudents = [maya, liam, aria, noah, sofia, ethan];

  roster(stemB12, [
    ["Chloe Ramos", "chloe@lakeside.edu"],
    ["Lucas Garcia", "lucas@lakeside.edu"],
    ["Isabella Navarro", "isabella@lakeside.edu"],
    ["Gabriel Ocampo", "gabriel@lakeside.edu"],
    ["Mia Fernandez", "mia@lakeside.edu"],
    ["Jacob Castillo", "jacob@lakeside.edu"],
  ]);
  const stemAStudents = await roster(stemA11, [
    ["Zoe Aquino", "zoe@lakeside.edu"],
    ["Nathan Pascual", "nathan@lakeside.edu"],
    ["Ella Domingo", "ella@lakeside.edu"],
    ["Adrian Salazar", "adrian@lakeside.edu"],
    ["Hazel Mercado", "hazel@lakeside.edu"],
    ["Kai Manalo", "kai@lakeside.edu"],
  ]);
  roster(humssA11, [
    ["Bea Soriano", "bea@lakeside.edu"],
    ["Marcus Yap", "marcus@lakeside.edu"],
    ["Lea Bernardo", "lea@lakeside.edu"],
    ["Rafael Tan", "rafael@lakeside.edu"],
    ["Nina Alcantara", "nina@lakeside.edu"],
    ["Elijah Roxas", "elijah@lakeside.edu"],
  ]);
  // One student who signed up but hasn't been placed yet, so the admin has something to file.
  await mk("Tomas Reyes", "tomas@lakeside.edu", "student");

  /* ---------- classes + a conflict-free weekly timetable ---------- */
  const BLOCKS: Array<[number, number]> = [
    [450, 510], // 7:30 – 8:30
    [510, 570], // 8:30 – 9:30
    [585, 645], // 9:45 – 10:45
    [645, 705], // 10:45 – 11:45
    [780, 840], // 1:00 – 2:00
    [840, 900], // 2:00 – 3:00
    [915, 975], // 3:15 – 4:15
  ];
  const DAY_ORDER = [1, 3, 5, 2, 4]; // Mon Wed Fri first, then Tue Thu, so 3-slot classes land on M/W/F
  const busy = new Set<string>();
  const homeroom: Record<string, string> = {
    [core12]: "Room 301",
    [stemB12]: "Room 302",
    [stemA11]: "Room 204",
    [humssA11]: "Room 205",
  };
  let classIndex = 0;

  const mkClass = async (
    sectionId: string,
    teacherId: string,
    name: string,
    color: schema.ClassColor,
    slotsPerWeek: number,
    opts: { room?: string; description?: string; semester?: number } = {},
  ) => {
    const id = newId();
    const semester = opts.semester ?? 1;
    await db
      .insert(schema.classrooms)
      .values({
        id,
        schoolId,
        sectionId,
        teacherId,
        name,
        color,
        semester,
        schoolYear: "2026 – 2027",
        description: opts.description ?? null,
        createdAt: at(-45),
      })
      .run();

    // Three-a-week classes prefer Mon/Wed/Fri; twice-a-week prefer Tue/Thu; once-a-week fill Tue/Thu/Fri.
    const dayOrder =
      slotsPerWeek >= 3
        ? DAY_ORDER
        : slotsPerWeek === 2
          ? [2, 4, 1, 3, 5]
          : [2, 4, 5, 1, 3];
    const candidates: Array<[number, number]> = [];
    for (let b = 0; b < BLOCKS.length; b++)
      for (const d of dayOrder) candidates.push([d, b]);
    const rot = (classIndex * DAY_ORDER.length) % candidates.length;
    const ordered = [...candidates.slice(rot), ...candidates.slice(0, rot)];
    const usedDays = new Set<number>();
    let placed = 0;
    for (const [day, b] of ordered) {
      if (placed >= slotsPerWeek) break;
      if (usedDays.has(day)) continue;
      const sKey = `s:${semester}:${sectionId}:${day}:${b}`;
      const tKey = `t:${semester}:${teacherId}:${day}:${b}`;
      if (busy.has(sKey) || busy.has(tKey)) continue;
      busy.add(sKey);
      busy.add(tKey);
      usedDays.add(day);
      await db
        .insert(schema.scheduleSlots)
        .values({
          id: newId(),
          classroomId: id,
          day,
          startMin: BLOCKS[b][0],
          endMin: BLOCKS[b][1],
          room: opts.room ?? homeroom[sectionId],
        })
        .run();
      placed++;
    }
    classIndex++;
    return id;
  };

  // 12-CORE
  const bio2Core = await mkClass(
    core12,
    reyes,
    "General Biology 2",
    "green",
    3,
    {
      room: "Lab 2",
      description: "Genetics, evolution, and the organ systems.",
    },
  );
  const calcCore = await mkClass(core12, cruz, "Basic Calculus", "blue", 3, {
    description: "Limits, derivatives, and an introduction to integrals.",
  });
  const cwCore = await mkClass(core12, lim, "Creative Writing", "rose", 2, {
    description:
      "Poetry, fiction, and drama, with a workshop every other week.",
  });
  const filCore = await mkClass(
    core12,
    dizon,
    "Filipino sa Piling Larangan",
    "amber",
    2,
    {
      description: "Akademikong pagsulat sa larangan ng agham at teknolohiya.",
    },
  );
  const peCore = await mkClass(
    core12,
    pramos,
    "Physical Education & Health 3",
    "teal",
    1,
    { room: "Gym" },
  );

  // 12-STEM B
  const bio2StemB = await mkClass(
    stemB12,
    villar,
    "General Biology 2",
    "green",
    3,
    { room: "Lab 1" },
  );
  await mkClass(stemB12, cruz, "Basic Calculus", "blue", 3);
  await mkClass(stemB12, lim, "Creative Writing", "rose", 2);
  await mkClass(stemB12, pramos, "Physical Education & Health 3", "teal", 1, {
    room: "Gym",
  });

  // 11-STEM A
  const bio1StemA = await mkClass(
    stemA11,
    reyes,
    "General Biology 1",
    "green",
    3,
    {
      room: "Lab 2",
      description:
        "Cell structure, biological molecules, and the basics of genetics.",
    },
  );
  const precalcStemA = await mkClass(stemA11, cruz, "Pre-Calculus", "blue", 3, {
    description:
      "Functions, conic sections, trigonometry, and an introduction to limits.",
  });
  await mkClass(stemA11, lim, "Reading & Writing", "rose", 2);
  await mkClass(stemA11, dizon, "Komunikasyon at Pananaliksik", "amber", 2);

  // Second semester for 12-CORE: different subjects, one new teacher.
  await mkClass(core12, villar, "General Physics 2", "violet", 3, {
    room: "Lab 1",
    semester: 2,
    description: "Electricity, magnetism, and optics.",
  });
  await mkClass(core12, cruz, "Statistics & Probability", "blue", 3, {
    semester: 2,
  });
  await mkClass(core12, lim, "Media & Information Literacy", "rose", 2, {
    semester: 2,
  });
  await mkClass(core12, pramos, "Physical Education & Health 4", "teal", 1, {
    room: "Gym",
    semester: 2,
  });

  // 11-HUMSS A
  await mkClass(humssA11, villar, "Earth Science", "amber", 2, {
    room: "Lab 1",
  });
  await mkClass(humssA11, cruz, "General Mathematics", "blue", 2);
  await mkClass(humssA11, lim, "Reading & Writing", "rose", 2);
  await mkClass(humssA11, dizon, "Komunikasyon at Pananaliksik", "violet", 2);
  await mkClass(humssA11, pramos, "Physical Education & Health 1", "teal", 1, {
    room: "Gym",
  });

  /* ---------- announcements ---------- */
  const announce = async (
    authorId: string,
    title: string,
    body: string,
    opts: {
      classroomId?: string;
      sectionId?: string;
      priority?: schema.Priority;
      pinned?: boolean;
      daysAgo?: number;
    } = {},
  ) => {
    await db
      .insert(schema.announcements)
      .values({
        id: newId(),
        schoolId,
        sectionId: opts.sectionId ?? null,
        classroomId: opts.classroomId ?? null,
        authorId,
        title,
        body,
        priority: opts.priority ?? "normal",
        pinned: opts.pinned ?? false,
        createdAt: at(-(opts.daysAgo ?? 0), 7, 30),
      })
      .run();
  };

  await announce(
    admin,
    "Midterm examination schedule is out",
    "Midterms run from Monday to Wednesday next week. Check the calendar for the exact slots per subject. Students with conflicts should coordinate with their adviser before Friday.\n\nReminder: bring your school ID and at least two pencils. Phones stay in bags during exams.",
    { priority: "important", pinned: true, daysAgo: 1 },
  );
  await announce(
    admin,
    "Water interruption on Thursday morning",
    "The city water utility scheduled maintenance from 7:00 to 10:00 on Thursday. Drinking stations on the ground floor will still work. Please bring your own water bottle.",
    { priority: "urgent", daysAgo: 0 },
  );
  await announce(
    admin,
    "Intramurals week: sign-ups open",
    "Sign-up sheets for basketball, volleyball, chess, and the dance showcase are at the Student Affairs office. Each section may field one team per sport. Sign-ups close two weeks before Intramurals.",
    { daysAgo: 3 },
  );
  await announce(
    admin,
    "Foundation Day: half-day classes",
    "Classes end at 12:00 on Foundation Day. The afternoon program starts at 1:30 in the covered court. Attendance for the afternoon program is optional but encouraged.",
    { daysAgo: 6 },
  );
  await announce(
    cruz,
    "Homeroom: clearance forms due Friday",
    "Please hand your signed clearance forms to me before Friday's homeroom. If your parent or guardian needs another copy, ask at the registrar's window.",
    { sectionId: core12, priority: "important", daysAgo: 1 },
  );
  await announce(
    reyes,
    "Lab safety refresher before the microscope activity",
    "Before Wednesday's lab we'll do a ten-minute safety refresher. Closed shoes are required in Lab 2. If you wear contacts, bring your glasses for the day.",
    { classroomId: bio2Core, daysAgo: 2 },
  );
  await announce(
    cruz,
    "Quiz 2 moved to Thursday",
    "A few of you asked for one more day on derivatives, so Quiz 2 moves from Tuesday to Thursday. Coverage stays the same: limits and the power rule only.",
    { classroomId: calcCore, priority: "important", daysAgo: 1 },
  );
  await announce(
    lim,
    "Reading for next week: two short stories",
    "Read the two stories in the shared folder before Monday. Come with one question about structure and one about the narrator's choices. We'll use these in our workshop.",
    { classroomId: cwCore, daysAgo: 4 },
  );
  await announce(
    reyes,
    "Bring your lab notebooks on Wednesday",
    "We're starting the onion cell activity. Bring your notebook and a pencil; sketches go in the notebook, not on loose paper.",
    { classroomId: bio1StemA, daysAgo: 2 },
  );

  /* ---------- calendar events ---------- */
  const ev = async (
    title: string,
    startsAt: Date,
    kind: schema.EventKind,
    opts: {
      endsAt?: Date;
      description?: string;
      location?: string;
      classroomId?: string;
      sectionId?: string;
      allDay?: boolean;
      createdBy?: string;
    } = {},
  ) => {
    await db
      .insert(schema.events)
      .values({
        id: newId(),
        schoolId,
        sectionId: opts.sectionId ?? null,
        classroomId: opts.classroomId ?? null,
        createdBy: opts.createdBy ?? admin,
        title,
        description: opts.description ?? null,
        location: opts.location ?? null,
        kind,
        startsAt,
        endsAt: opts.endsAt ?? null,
        allDay: opts.allDay ?? true,
        createdAt: now,
      })
      .run();
  };

  await ev("Parent–Teacher Conference", at(4, 13, 0), "meeting", {
    endsAt: at(4, 17, 0),
    allDay: false,
    location: "Homerooms",
    description:
      "Advisers meet parents by appointment. Sign-up sheets posted outside each homeroom.",
  });
  await ev("Midterm Examinations", at(7), "exam", {
    endsAt: at(9),
    description: "Three exam days. Regular classes are suspended.",
  });
  await ev("Foundation Day", at(12), "school", {
    location: "Covered Court",
    description: "Half-day classes, afternoon program at 1:30.",
  });
  await ev("National Holiday · No Classes", at(19), "holiday");
  await ev("Intramurals Week", at(26), "activity", {
    endsAt: at(30),
    location: "Field & Gym",
  });
  await ev("Science Fair", at(41), "activity", {
    location: "Auditorium",
    description: "Group projects from all science classes on display.",
  });
  await ev("Club Fair", at(-3), "activity", { location: "Quadrangle" });
  await ev("Biology Lab: Microscope Activity", at(2, 8, 30), "class", {
    endsAt: at(2, 9, 30),
    allDay: false,
    classroomId: bio2Core,
    location: "Lab 2",
    createdBy: reyes,
  });
  await ev("Basic Calc Quiz 2 · Derivatives", at(3, 9, 45), "exam", {
    endsAt: at(3, 10, 45),
    allDay: false,
    classroomId: calcCore,
    location: "Room 301",
    createdBy: cruz,
  });
  await ev("12-CORE Homeroom: clearance day", at(4, 7, 30), "meeting", {
    endsAt: at(4, 8, 30),
    allDay: false,
    sectionId: core12,
    location: "Room 301",
    createdBy: cruz,
  });

  /* ---------- classwork (quarter 1) ---------- */
  const work = async (
    classroomId: string,
    title: string,
    kind: schema.WorkKind,
    points: number,
    dueAt: Date | null,
    instructions: string,
    createdDaysAgo = 7,
  ) => {
    const id = newId();
    await db
      .insert(schema.assignments)
      .values({
        id,
        classroomId,
        title,
        kind,
        quarter: 1,
        points,
        dueAt,
        instructions,
        createdAt: at(-createdDaysAgo, 9),
      })
      .run();
    return id;
  };

  const bioCell = await work(
    bio2Core,
    "Cell division diagram",
    "assignment",
    50,
    at(-5, 23, 59),
    "Draw and label the stages of mitosis. One sentence per stage describing what happens. Hand-drawn is fine, just take a clear photo.",
    14,
  );
  const bioLab = await work(
    bio2Core,
    "Lab report: Onion root tip observation",
    "assignment",
    100,
    at(2, 23, 59),
    "Write up Wednesday's microscope activity using the lab report template: objective, materials, procedure, observations (with sketches), and conclusion. Two pages max.",
    4,
  );
  const bioQuiz = await work(
    bio2Core,
    "Quiz 1: DNA and heredity",
    "quiz",
    30,
    at(-9, 9, 0),
    "Covers DNA structure, replication, and Mendelian inheritance.",
    16,
  );
  await work(
    bio2Core,
    "Science Fair group project proposal",
    "project",
    100,
    at(14, 23, 59),
    "Submit a one-page proposal for your group's Science Fair project: research question, hypothesis, materials, and a rough timeline.",
    3,
  );

  const calcSet3 = await work(
    calcCore,
    "Problem Set 3: Derivatives",
    "assignment",
    40,
    at(1, 17, 0),
    "Textbook page 148, numbers 1–20 (even only). Show your work. Box your final answers.",
    5,
  );
  const calcQuiz1 = await work(
    calcCore,
    "Quiz 1: Limits",
    "quiz",
    25,
    at(-12, 9, 30),
    "Evaluating limits algebraically and from graphs.",
    20,
  );
  const calcSet2 = await work(
    calcCore,
    "Problem Set 2: Continuity",
    "assignment",
    40,
    at(-8, 17, 0),
    "Page 132, numbers 1–15.",
    15,
  );
  await work(
    calcCore,
    "Problem Set 4: The chain rule",
    "assignment",
    40,
    at(6, 17, 0),
    "Page 161, numbers 1–16.",
    1,
  );

  const cwEssay = await work(
    cwCore,
    "Flash fiction: A place that changed you",
    "assignment",
    100,
    at(5, 23, 59),
    "Write a 600–800 word piece of flash fiction. Use a clear structure (hook, turn, ending). Submit as a document link or paste your text directly.",
    6,
  );
  const cwQuiz = await work(
    cwCore,
    "Quiz: Elements of fiction",
    "quiz",
    20,
    at(-6, 13, 0),
    "Identify point of view, conflict, and setting from short passages.",
    12,
  );
  await work(
    cwCore,
    "Annotated reading: Stories 1 & 2",
    "activity",
    20,
    at(4, 13, 0),
    "Annotate both stories and bring your annotations to class. Photo upload is fine.",
    2,
  );

  const filQuiz = await work(
    filCore,
    "Pagsusulit 1: Mga uri ng teksto",
    "quiz",
    20,
    at(-4, 13, 0),
    "Pagkilala sa mga uri ng akademikong teksto.",
    10,
  );
  await work(
    filCore,
    "Sanaysay: Agham at lipunan",
    "assignment",
    50,
    at(7, 23, 59),
    "Sumulat ng 500-salitang sanaysay tungkol sa isang isyung pang-agham sa inyong komunidad.",
    3,
  );
  await work(
    peCore,
    "Weekly fitness log",
    "activity",
    20,
    at(9, 23, 59),
    "Log at least three 30-minute activities this week. Photo or text is fine.",
    2,
  );

  // Ms. Reyes and Mr. Cruz also have work in 11-STEM A, so their views show two sections.
  const bio1Quiz = await work(
    bio1StemA,
    "Quiz 1: Biological molecules",
    "quiz",
    30,
    at(-7, 8, 0),
    "Carbohydrates, lipids, proteins, nucleic acids.",
    12,
  );
  await work(
    bio1StemA,
    "Lab report: Onion cell observation",
    "assignment",
    100,
    at(3, 23, 59),
    "Write up the onion cell activity using the lab report template.",
    3,
  );
  await work(
    precalcStemA,
    "Problem Set 3: Parabolas",
    "assignment",
    40,
    at(2, 17, 0),
    "Page 148, numbers 1–20 (even only).",
    4,
  );
  await work(
    bio2StemB,
    "Quiz 1: DNA and heredity",
    "quiz",
    30,
    at(-9, 9, 0),
    "Covers DNA structure, replication, and Mendelian inheritance.",
    16,
  );

  /* ---------- submissions ---------- */
  const submit = async (
    assignmentId: string,
    studentId: string,
    opts: {
      content?: string;
      linkUrl?: string;
      submittedDaysAgo: number;
      hour?: number;
      score?: number;
      feedback?: string;
    },
  ) => {
    const submittedAt = at(-opts.submittedDaysAgo, opts.hour ?? 20, 15);
    await db
      .insert(schema.submissions)
      .values({
        id: newId(),
        assignmentId,
        studentId,
        content: opts.content ?? null,
        linkUrl: opts.linkUrl ?? null,
        submittedAt,
        score: opts.score ?? null,
        feedback: opts.feedback ?? null,
        gradedAt:
          opts.score != null ? new Date(submittedAt.getTime() + DAY) : null,
      })
      .run();
  };

  const quizScores: Record<string, number[]> = {
    [bioQuiz]: [28, 24, 27, 19, 30, 22],
    [calcQuiz1]: [22, 18, 24, 15, 25, 20],
    [cwQuiz]: [18, 15, 19, 14, 20, 16],
    [filQuiz]: [17, 14, 19, 12, 18, 16],
  };
  for (const [assignmentId, scores] of Object.entries(quizScores)) {
    for (const [i, studentId] of coreStudents.entries())
      await submit(assignmentId, studentId, {
        content: "Submitted in class.",
        submittedDaysAgo: 9,
        hour: 7,
        score: scores[i],
      });
  }
  for (const [i, studentId] of stemAStudents.entries())
    await submit(bio1Quiz, studentId, {
      content: "Submitted in class.",
      submittedDaysAgo: 7,
      hour: 7,
      score: [26, 21, 28, 18, 24, 29][i],
    });

  await submit(bioCell, maya, {
    content: "Attached my diagram with all five stages labeled.",
    submittedDaysAgo: 6,
    score: 48,
    feedback:
      "Beautiful, clear labels. Add a sentence on cytokinesis next time.",
  });
  await submit(bioCell, liam, {
    content: "Diagram attached.",
    submittedDaysAgo: 5,
    score: 41,
    feedback: "Good work. Missing telophase and one description.",
  });
  await submit(bioCell, aria, {
    content: "Here is my diagram. I also added interphase.",
    submittedDaysAgo: 6,
    score: 50,
    feedback: "Excellent.",
  });
  await submit(bioCell, noah, {
    content: "Sorry this is late, ma'am.",
    submittedDaysAgo: 3,
  });
  await submit(bioCell, sofia, {
    content: "Diagram (photo).",
    submittedDaysAgo: 6,
    score: 45,
  });
  await submit(bioCell, ethan, {
    content: "Diagram attached.",
    submittedDaysAgo: 5,
    score: 38,
    feedback: "Labels are hard to read. Please write more clearly.",
  });

  const ps2Scores = [38, 30, 40, 26, 39, 33];
  for (const [i, studentId] of coreStudents.entries())
    await submit(calcSet2, studentId, {
      content: "Solutions attached.",
      submittedDaysAgo: 9,
      score: ps2Scores[i],
    });

  await submit(calcSet3, maya, {
    content: "Finished all even numbers. Boxed answers on page 2.",
    submittedDaysAgo: 0,
  });
  await submit(calcSet3, aria, {
    content: "Solutions attached.",
    submittedDaysAgo: 1,
  });
  await submit(cwEssay, sofia, {
    linkUrl: "https://docs.google.com/document/d/example-sofia-story",
    submittedDaysAgo: 1,
  });
  await submit(bioLab, aria, {
    content: "Lab report attached. I included two sketches.",
    submittedDaysAgo: 0,
  });

  /* ---------- materials ---------- */
  const mat = async (
    classroomId: string,
    title: string,
    url: string | null,
    note?: string,
  ) => {
    await db
      .insert(schema.materials)
      .values({
        id: newId(),
        classroomId,
        title,
        url,
        note: note ?? null,
        createdAt: at(-20),
      })
      .run();
  };
  await mat(
    bio2Core,
    "Lab report template",
    "https://example.com/lab-report-template",
    "Use this for every lab write-up.",
  );
  await mat(bio2Core, "Mitosis slides", "https://example.com/bio-slides-week3");
  await mat(
    calcCore,
    "Derivative rules sheet",
    "https://example.com/derivative-rules",
    "Allowed during quizzes.",
  );
  await mat(
    calcCore,
    "Desmos graphing calculator",
    "https://www.desmos.com/calculator",
  );
  await mat(
    cwCore,
    "Shared reading folder",
    "https://example.com/reading-folder",
  );
  await mat(
    cwCore,
    "Workshop rubric",
    "https://example.com/workshop-rubric",
    "How pieces are scored in workshop.",
  );
  await mat(
    bio1StemA,
    "Lab report template",
    "https://example.com/lab-report-template",
  );

  /* ---------- personal to-do lists ---------- */
  const todo = async (
    userId: string,
    title: string,
    opts: { notes?: string; dueAt?: Date; done?: boolean } = {},
  ) => {
    await db
      .insert(schema.todos)
      .values({
        id: newId(),
        userId,
        title,
        notes: opts.notes ?? null,
        dueAt: opts.dueAt ?? null,
        done: opts.done ?? false,
        createdAt: at(-2),
      })
      .run();
  };
  await todo(maya, "Finish lab report sketches", {
    dueAt: at(1),
    notes: "Two sketches: low power and high power view.",
  });
  await todo(maya, "Review derivatives before Quiz 2", { dueAt: at(2) });
  await todo(maya, "Buy index cards for Bio", { done: true });
  await todo(maya, "Ask Ms. Lim about the word count");
  await todo(maya, "Sign up for intramurals volleyball", { dueAt: at(10) });
  await todo(liam, "Redo Problem Set 3 #14", { dueAt: at(1) });
  await todo(reyes, "Grade onion root tip lab reports", { dueAt: at(4) });
  await todo(reyes, "Order slides for next lab", { done: true });
  await todo(reyes, "Post Science Fair grouping", { dueAt: at(3) });
  await todo(admin, "Finalize midterm room assignments", { dueAt: at(2) });
  await todo(admin, "Send PTC reminder to advisers", { dueAt: at(1) });
}
