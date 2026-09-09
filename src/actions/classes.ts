"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, classrooms, materials, scheduleSlots, sections, CLASS_COLORS, type ClassColor, type Classroom } from "@/db";
import { requireRole, requireUser, type SchoolUser } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { getClassroom, slotConflicts } from "@/lib/queries";
import { parseTime } from "@/lib/schedule";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Teachers manage their own classes; admins can manage any class in the school. */
function canManage(user: SchoolUser, classroom: Classroom) {
  if (classroom.schoolId !== user.schoolId) return false;
  return user.role === "admin" || (user.role === "teacher" && classroom.teacherId === user.id);
}

function readClassFields(formData: FormData) {
  const name = str(formData, "name");
  const description = str(formData, "description");
  const colorRaw = str(formData, "color") as ClassColor;
  const color: ClassColor = CLASS_COLORS.includes(colorRaw) ? colorRaw : "blue";
  const semesterRaw = Number(str(formData, "semester") || "1");
  const semester = semesterRaw === 2 ? 2 : 1;
  return { name, description: description || null, color, semester };
}

/** Teacher: start teaching a subject to a section. */
export async function createClassroom(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("teacher");
  const fields = readClassFields(formData);
  const sectionId = str(formData, "sectionId");
  if (fields.name.length < 2) return { error: "What subject is this? Give it a name." };
  const section = await db.select().from(sections).where(and(eq(sections.id, sectionId), eq(sections.schoolId, user.schoolId))).get();
  if (!section) return { error: "Pick the section you'll teach." };
  const dupe = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.teacherId, user.id),
        eq(classrooms.sectionId, sectionId),
        eq(classrooms.name, fields.name),
        eq(classrooms.semester, fields.semester),
        eq(classrooms.archived, false),
      ),
    )
    .get();
  if (dupe) return { error: `You already teach ${fields.name} to ${section.gradeLevel}-${section.name} in semester ${fields.semester}.` };

  const id = newId();
  await db.insert(classrooms)
    .values({ id, schoolId: user.schoolId, sectionId, teacherId: user.id, schoolYear: user.school?.schoolYear ?? null, createdAt: new Date(), ...fields })
    .run();
  redirect(`/classes/${id}?tab=settings`);
}

export async function updateClassroom(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = str(formData, "classroomId");
  const classroom = await getClassroom(id);
  if (!classroom || !canManage(user, classroom)) return { error: "You can only edit your own classes." };
  const fields = readClassFields(formData);
  if (fields.name.length < 2) return { error: "Give the subject a name." };
  await db.update(classrooms).set(fields).where(eq(classrooms.id, id)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archiveClassroom(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "classroomId");
  const classroom = await getClassroom(id);
  if (!classroom || !canManage(user, classroom)) return;
  await db.update(classrooms).set({ archived: !classroom.archived }).where(eq(classrooms.id, id)).run();
  revalidatePath("/", "layout");
  redirect("/classes");
}

export async function deleteClassroom(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "classroomId");
  const classroom = await getClassroom(id);
  if (!classroom || !canManage(user, classroom)) return;
  await db.delete(classrooms).where(eq(classrooms.id, id)).run();
  revalidatePath("/", "layout");
  redirect(user.role === "admin" ? `/admin/sections/${classroom.sectionId}` : "/classes");
}

/* ---------- timetable ---------- */

export async function addSlot(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const classroomId = str(formData, "classroomId");
  const classroom = await getClassroom(classroomId);
  if (!classroom || !canManage(user, classroom)) return { error: "You can't edit this class's schedule." };

  const days = formData
    .getAll("day")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const startMin = parseTime(str(formData, "start"));
  const endMin = parseTime(str(formData, "end"));
  const room = str(formData, "room");
  if (days.length === 0) return { error: "Pick at least one day." };
  if (startMin == null || endMin == null) return { error: "Enter a start and end time." };
  if (endMin <= startMin) return { error: "The end time has to be after the start time." };

  const problems: string[] = [];
  for (const day of days) problems.push(...(await slotConflicts(classroom, { day, startMin, endMin })));
  if (problems.length) return { error: `That clashes: ${problems[0]}${problems.length > 1 ? ` (+${problems.length - 1} more)` : ""}` };

  for (const day of days) {
    await db.insert(scheduleSlots).values({ id: newId(), classroomId, day, startMin, endMin, room: room || null }).run();
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSlot(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "slotId");
  const slot = await db.select().from(scheduleSlots).where(eq(scheduleSlots.id, id)).get();
  const classroom = slot ? await getClassroom(slot.classroomId) : null;
  if (!slot || !classroom || !canManage(user, classroom)) return;
  await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id)).run();
  revalidatePath("/", "layout");
}

/* ---------- materials ---------- */

export async function addMaterial(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("teacher");
  const classroomId = str(formData, "classroomId");
  const classroom = await getClassroom(classroomId);
  if (!classroom || classroom.teacherId !== user.id) return { error: "You can only add materials to your own classes." };
  const title = str(formData, "title");
  const url = str(formData, "url");
  const note = str(formData, "note");
  if (!title) return { error: "Give the material a title." };
  if (url && !/^https?:\/\//i.test(url)) return { error: "Links should start with http:// or https://." };
  await db.insert(materials).values({ id: newId(), classroomId, title, url: url || null, note: note || null, createdAt: new Date() }).run();
  revalidatePath(`/classes/${classroomId}`);
  return { ok: true };
}

export async function deleteMaterial(formData: FormData) {
  const user = await requireRole("teacher");
  const id = str(formData, "materialId");
  const row = await db.select().from(materials).where(eq(materials.id, id)).get();
  if (!row) return;
  const classroom = await getClassroom(row.classroomId);
  if (!classroom || classroom.teacherId !== user.id) return;
  await db.delete(materials).where(eq(materials.id, id)).run();
  revalidatePath(`/classes/${row.classroomId}`);
}
