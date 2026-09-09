import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const bool = (name: string) => integer(name, { mode: "boolean" });

export const ROLES = ["admin", "teacher", "student"] as const;
export type Role = (typeof ROLES)[number];

export const PRIORITIES = ["normal", "important", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EVENT_KINDS = ["school", "holiday", "exam", "activity", "meeting", "class"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const WORK_KINDS = ["assignment", "quiz", "project", "activity", "exam"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

export const CLASS_COLORS = ["blue", "red", "green", "amber", "violet", "teal", "rose", "slate"] as const;
export type ClassColor = (typeof CLASS_COLORS)[number];

export const QUARTERS = [1, 2, 3, 4] as const;
export type Quarter = (typeof QUARTERS)[number];

/* ---------- school ---------- */

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  motto: text("motto"),
  schoolYear: text("school_year"),
  currentQuarter: integer("current_quarter").notNull().default(1),
  createdAt: ts("created_at").notNull(),
});

/**
 * A homeroom group, e.g. grade "12" + name "CORE" = 12-CORE.
 * Students belong to exactly one section; teachers rotate through sections.
 */
export const sections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    gradeLevel: text("grade_level").notNull(),
    name: text("name").notNull(),
    adviserId: text("adviser_id"),
    /** Manual folder order on the admin People page (drag to reorder). */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("sections_unique_idx").on(t.schoolId, t.gradeLevel, t.name)],
);

/* ---------- people ---------- */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ROLES }).notNull(),
    schoolId: text("school_id").references(() => schools.id, { onDelete: "set null" }),
    /** Students: the section they belong to. */
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    /** Teachers: e.g. "Science", "Mathematics". Used to group teachers into folders. */
    department: text("department"),
    /** Set when an admin hands out a temporary password; cleared once the user picks their own. */
    mustChangePassword: bool("must_change_password").notNull().default(false),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_section_idx").on(t.sectionId)],
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
});

/* ---------- classes: one subject taught to one section by one teacher ---------- */

export const classrooms = sqliteTable(
  "classrooms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The subject, e.g. "General Biology 2". */
    name: text("name").notNull(),
    description: text("description"),
    color: text("color", { enum: CLASS_COLORS }).notNull().default("blue"),
    /** 1 = quarters 1–2, 2 = quarters 3–4. Subjects, teachers, and timetables can change between semesters. */
    semester: integer("semester").notNull().default(1),
    /** The school year this class belonged to, e.g. "2026 – 2027". Filled in when a year is rolled over. */
    schoolYear: text("school_year"),
    archived: bool("archived").notNull().default(false),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("classrooms_school_idx").on(t.schoolId), index("classrooms_section_idx").on(t.sectionId), index("classrooms_teacher_idx").on(t.teacherId)],
);

/** A weekly timetable slot for a class: day 0 = Sunday … 6 = Saturday, times in minutes from midnight. */
export const scheduleSlots = sqliteTable(
  "schedule_slots",
  {
    id: text("id").primaryKey(),
    classroomId: text("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
    room: text("room"),
  },
  (t) => [index("slots_class_idx").on(t.classroomId)],
);

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  classroomId: text("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url"),
  note: text("note"),
  createdAt: ts("created_at").notNull(),
});

/* ---------- announcements: whole school, one section, or one class ---------- */

export const announcements = sqliteTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }),
    classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("normal"),
    pinned: bool("pinned").notNull().default(false),
    /** Optional attached image (a poster, a photo of a memo). Stored under uploads/. */
    imagePath: text("image_path"),
    imageName: text("image_name"),
    imageType: text("image_type"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("announcements_school_idx").on(t.schoolId)],
);

export const announcementReads = sqliteTable(
  "announcement_reads",
  {
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: ts("read_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId] })],
);

/* ---------- calendar ---------- */

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }),
    classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    kind: text("kind", { enum: EVENT_KINDS }).notNull().default("school"),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at"),
    allDay: bool("all_day").notNull().default(true),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("events_school_idx").on(t.schoolId)],
);

/* ---------- classwork ---------- */

export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    classroomId: text("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    instructions: text("instructions"),
    kind: text("kind", { enum: WORK_KINDS }).notNull().default("assignment"),
    quarter: integer("quarter").notNull().default(1),
    points: real("points").notNull().default(100),
    dueAt: ts("due_at"),
    allowLate: bool("allow_late").notNull().default(true),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("assignments_class_idx").on(t.classroomId)],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content"),
    linkUrl: text("link_url"),
    fileName: text("file_name"),
    filePath: text("file_path"),
    submittedAt: ts("submitted_at").notNull(),
    score: real("score"),
    feedback: text("feedback"),
    gradedAt: ts("graded_at"),
  },
  (t) => [uniqueIndex("submissions_unique_idx").on(t.assignmentId, t.studentId)],
);

/* ---------- personal to-do ---------- */

export const todos = sqliteTable(
  "todos",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    dueAt: ts("due_at"),
    done: bool("done").notNull().default(false),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("todos_user_idx").on(t.userId)],
);

/* ---------- relations ---------- */

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  school: one(schools, { fields: [sections.schoolId], references: [schools.id] }),
  adviser: one(users, { fields: [sections.adviserId], references: [users.id] }),
  students: many(users),
  classrooms: many(classrooms),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  section: one(sections, { fields: [users.sectionId], references: [sections.id] }),
  taughtClasses: many(classrooms),
}));

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  teacher: one(users, { fields: [classrooms.teacherId], references: [users.id] }),
  section: one(sections, { fields: [classrooms.sectionId], references: [sections.id] }),
  school: one(schools, { fields: [classrooms.schoolId], references: [schools.id] }),
  slots: many(scheduleSlots),
  assignments: many(assignments),
  materials: many(materials),
}));

export const scheduleSlotsRelations = relations(scheduleSlots, ({ one }) => ({
  classroom: one(classrooms, { fields: [scheduleSlots.classroomId], references: [classrooms.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
  classroom: one(classrooms, { fields: [announcements.classroomId], references: [classrooms.id] }),
  section: one(sections, { fields: [announcements.sectionId], references: [sections.id] }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  classroom: one(classrooms, { fields: [assignments.classroomId], references: [classrooms.id] }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  student: one(users, { fields: [submissions.studentId], references: [users.id] }),
}));

/* ---------- inferred types ---------- */
export type School = typeof schools.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type User = typeof users.$inferSelect;
export type Classroom = typeof classrooms.$inferSelect;
export type ScheduleSlot = typeof scheduleSlots.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type CalendarEvent = typeof events.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Material = typeof materials.$inferSelect;
