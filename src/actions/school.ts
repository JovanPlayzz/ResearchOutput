"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schools, users, sections, classrooms } from "@/db";
import { requireUser, requireRole } from "@/lib/auth";
import { newId, newJoinCode } from "@/lib/ids";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

async function uniqueSchoolCode() {
  for (let i = 0; i < 20; i++) {
    const code = newJoinCode(6);
    const taken = await db.select({ id: schools.id }).from(schools).where(eq(schools.code, code)).get();
    if (!taken) return code;
  }
  return newJoinCode(8);
}

/* ---------- joining ---------- */

/** Admin: create a school and become its first member. */
export async function createSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowNoSchool: true });
  if (user.role !== "admin") return { error: "Only administrators can create a school." };
  if (user.schoolId) return { error: "You already belong to a school." };

  const name = str(formData, "name");
  const motto = str(formData, "motto");
  const schoolYear = str(formData, "schoolYear");
  if (name.length < 3) return { error: "Give your school a name." };

  const id = newId();
  await db.insert(schools)
    .values({ id, name, motto: motto || null, schoolYear: schoolYear || null, code: await uniqueSchoolCode(), createdAt: new Date() })
    .run();
  await db.update(users).set({ schoolId: id }).where(eq(users.id, user.id)).run();
  redirect("/admin/people?welcome=1");
}

/** Teacher or student: join an existing school with its code. Students then pick a section. */
export async function joinSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowNoSchool: true });
  if (user.schoolId) return { error: "You already belong to a school." };

  const code = str(formData, "code").toUpperCase();
  const department = str(formData, "department");
  if (!code) return { error: "Enter the school code." };

  const school = await db.select().from(schools).where(eq(schools.code, code)).get();
  if (!school) return { error: "No school has that code. Double-check it with your school admin." };

  await db.update(users)
    .set({ schoolId: school.id, department: user.role === "teacher" ? department || null : null })
    .where(eq(users.id, user.id))
    .run();
  redirect(user.role === "student" ? "/onboarding" : "/dashboard");
}

/** Student: pick (or change) the section they belong to. */
export async function chooseSection(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("student");
  const sectionId = str(formData, "sectionId");
  const section = await db.select().from(sections).where(and(eq(sections.id, sectionId), eq(sections.schoolId, user.schoolId))).get();
  if (!section) return { error: "Pick your section from the list." };
  await db.update(users).set({ sectionId: section.id }).where(eq(users.id, user.id)).run();
  revalidatePath("/", "layout");
  if (str(formData, "redirectTo") === "dashboard") redirect("/dashboard");
  return { ok: true };
}

/* ---------- school settings ---------- */

export async function updateSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin");
  const name = str(formData, "name");
  const motto = str(formData, "motto");
  const schoolYear = str(formData, "schoolYear");
  const quarter = Number(str(formData, "currentQuarter") || "1");
  if (name.length < 3) return { error: "The school needs a name." };
  if (![1, 2, 3, 4].includes(quarter)) return { error: "Quarter should be 1 to 4." };
  await db.update(schools)
    .set({ name, motto: motto || null, schoolYear: schoolYear || null, currentQuarter: quarter })
    .where(eq(schools.id, user.schoolId))
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Admin: roll into a new school year. Archives every subject (classwork and grades stay on
 * record), resets to Quarter 1, and takes students out of their sections so they pick again.
 */
export async function startNewSchoolYear(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin");
  const school = user.school!;
  const newYear = str(formData, "schoolYear");
  if (!newYear) return { error: "Name the new school year, like 2027 – 2028." };
  if (formData.get("sure") !== "on") return { error: "Tick the box to confirm you understand what this does." };
  if (newYear === school.schoolYear) return { error: "That is already the current school year." };

  const oldYear = school.schoolYear ?? "Earlier";
  await db.update(classrooms)
    .set({ archived: true, schoolYear: oldYear })
    .where(and(eq(classrooms.schoolId, user.schoolId), eq(classrooms.archived, false)))
    .run();
  await db.update(classrooms)
    .set({ schoolYear: oldYear })
    .where(and(eq(classrooms.schoolId, user.schoolId), isNull(classrooms.schoolYear)))
    .run();
  await db.update(users).set({ sectionId: null }).where(and(eq(users.schoolId, user.schoolId), eq(users.role, "student"))).run();
  await db.update(schools).set({ schoolYear: newYear, currentQuarter: 1 }).where(eq(schools.id, user.schoolId)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function regenerateSchoolCode() {
  const user = await requireRole("admin");
  await db.update(schools).set({ code: await uniqueSchoolCode() }).where(eq(schools.id, user.schoolId)).run();
  revalidatePath("/admin");
}

/* ---------- sections ---------- */

function readSectionFields(formData: FormData) {
  return {
    gradeLevel: str(formData, "gradeLevel").replace(/^grade\s+/i, ""),
    name: str(formData, "name").toUpperCase(),
    adviserId: str(formData, "adviserId") || null,
  };
}

export async function createSection(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin");
  const f = readSectionFields(formData);
  if (!f.gradeLevel) return { error: "Enter the grade level, like 12." };
  if (!f.name) return { error: "Give the section a name, like CORE or STEM A." };
  const dupe = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.schoolId, user.schoolId), eq(sections.gradeLevel, f.gradeLevel), eq(sections.name, f.name)))
    .get();
  if (dupe) return { error: `${f.gradeLevel}-${f.name} already exists.` };
  if (f.adviserId && !await validTeacher(f.adviserId, user.schoolId)) return { error: "That adviser isn't a teacher in this school." };

  const last = await db.select({ n: sections.sortOrder }).from(sections).where(eq(sections.schoolId, user.schoolId)).all();
  const sortOrder = last.length ? Math.max(...last.map((r) => r.n)) + 1 : 0;
  await db.insert(sections).values({ id: newId(), schoolId: user.schoolId, ...f, sortOrder, createdAt: new Date() }).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

async function validTeacher(id: string, schoolId: string) {
  return Boolean(await db.select({ id: users.id }).from(users).where(and(eq(users.id, id), eq(users.schoolId, schoolId), eq(users.role, "teacher"))).get());
}

export async function updateSection(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin");
  const id = str(formData, "sectionId");
  const section = await db.select().from(sections).where(and(eq(sections.id, id), eq(sections.schoolId, user.schoolId))).get();
  if (!section) return { error: "That section doesn't exist." };
  const f = readSectionFields(formData);
  if (!f.gradeLevel || !f.name) return { error: "Grade level and name are both needed." };
  if (f.adviserId && !await validTeacher(f.adviserId, user.schoolId)) return { error: "That adviser isn't a teacher in this school." };
  await db.update(sections).set(f).where(eq(sections.id, id)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSection(formData: FormData) {
  const user = await requireRole("admin");
  const id = str(formData, "sectionId");
  const section = await db.select().from(sections).where(and(eq(sections.id, id), eq(sections.schoolId, user.schoolId))).get();
  if (!section) return;
  await db.update(users).set({ sectionId: null }).where(eq(users.sectionId, id)).run();
  await db.delete(classrooms).where(eq(classrooms.sectionId, id)).run();
  await db.delete(sections).where(eq(sections.id, id)).run();
  revalidatePath("/", "layout");
  redirect("/admin/people");
}

/** Admin: persist the drag-and-drop order of section folders. */
export async function reorderSections(ids: string[]) {
  const user = await requireRole("admin");
  if (!Array.isArray(ids) || ids.length === 0) return;
  const mine = await db.select({ id: sections.id }).from(sections).where(and(eq(sections.schoolId, user.schoolId), inArray(sections.id, ids))).all();
  const allowed = new Set(mine.map((r) => r.id));
  const ordered = ids.filter((id) => allowed.has(id));
  for (let i = 0; i < ordered.length; i++) {
    await db.update(sections).set({ sortOrder: i }).where(eq(sections.id, ordered[i])).run();
  }
  revalidatePath("/admin/people");
}

/* ---------- members ---------- */

/** Admin: put a student in a section (or take them out with an empty value). */
export async function assignSection(formData: FormData) {
  const admin = await requireRole("admin");
  const userId = str(formData, "userId");
  const sectionId = str(formData, "sectionId");
  const target = await db.select().from(users).where(and(eq(users.id, userId), eq(users.schoolId, admin.schoolId), eq(users.role, "student"))).get();
  if (!target) return;
  if (sectionId) {
    const section = await db.select({ id: sections.id }).from(sections).where(and(eq(sections.id, sectionId), eq(sections.schoolId, admin.schoolId))).get();
    if (!section) return;
  }
  await db.update(users).set({ sectionId: sectionId || null }).where(eq(users.id, userId)).run();
  revalidatePath("/", "layout");
}

/** Admin: set a teacher's department. */
export async function updateTeacherDepartment(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const userId = str(formData, "userId");
  const department = str(formData, "department");
  const target = await db.select().from(users).where(and(eq(users.id, userId), eq(users.schoolId, admin.schoolId), eq(users.role, "teacher"))).get();
  if (!target) return { error: "That teacher isn't in this school." };
  await db.update(users).set({ department: department || null }).where(eq(users.id, userId)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin: remove someone from the school. A teacher's classes go with them. */
export async function removeMember(formData: FormData) {
  const admin = await requireRole("admin");
  const userId = str(formData, "userId");
  if (!userId || userId === admin.id) return;
  const target = await db.select().from(users).where(and(eq(users.id, userId), eq(users.schoolId, admin.schoolId))).get();
  if (!target) return;
  await db.delete(classrooms).where(eq(classrooms.teacherId, userId)).run();
  await db.update(sections).set({ adviserId: null }).where(eq(sections.adviserId, userId)).run();
  await db.update(users).set({ schoolId: null, sectionId: null, department: null }).where(eq(users.id, userId)).run();
  revalidatePath("/", "layout");
}
