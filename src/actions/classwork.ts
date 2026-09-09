"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, assignments, submissions, WORK_KINDS, type WorkKind } from "@/db";
import { requireRole } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { getAssignment, getClassroom } from "@/lib/queries";
import { deleteFile, putFile } from "@/lib/storage";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function readWorkFields(formData: FormData) {
  const title = str(formData, "title");
  const instructions = str(formData, "instructions");
  const kindRaw = str(formData, "kind") as WorkKind;
  const kind: WorkKind = WORK_KINDS.includes(kindRaw) ? kindRaw : "assignment";
  const quarterRaw = Number(str(formData, "quarter") || "1");
  const quarter = [1, 2, 3, 4].includes(quarterRaw) ? quarterRaw : 1;
  const points = Number(str(formData, "points") || "100");
  const dueRaw = str(formData, "dueAt");
  const dueAt = dueRaw ? new Date(dueRaw) : null;
  const allowLate = formData.get("allowLate") === "on";
  return { title, instructions: instructions || null, kind, quarter, points, dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null, allowLate };
}

export async function createAssignment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("teacher");
  const classroomId = str(formData, "classroomId");
  const classroom = await getClassroom(classroomId);
  if (!classroom || classroom.teacherId !== user.id) return { error: "You can only post work to your own classes." };

  const fields = readWorkFields(formData);
  if (!fields.title) return { error: "Give the work a title." };
  if (!(fields.points > 0) || fields.points > 10000) return { error: "Points should be a positive number." };

  await db.insert(assignments).values({ id: newId(), classroomId, createdAt: new Date(), ...fields }).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAssignment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("teacher");
  const id = str(formData, "assignmentId");
  const assignment = await getAssignment(id);
  const classroom = assignment ? await getClassroom(assignment.classroomId) : null;
  if (!assignment || !classroom || classroom.teacherId !== user.id) return { error: "You can only edit your own work." };

  const fields = readWorkFields(formData);
  if (!fields.title) return { error: "Give the work a title." };
  if (!(fields.points > 0) || fields.points > 10000) return { error: "Points should be a positive number." };

  await db.update(assignments).set(fields).where(eq(assignments.id, id)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAssignment(formData: FormData) {
  const user = await requireRole("teacher");
  const id = str(formData, "assignmentId");
  const assignment = await getAssignment(id);
  const classroom = assignment ? await getClassroom(assignment.classroomId) : null;
  if (!assignment || !classroom || classroom.teacherId !== user.id) return;
  await db.delete(assignments).where(eq(assignments.id, id)).run();
  revalidatePath("/", "layout");
  redirect(`/classes/${classroom.id}?tab=work`);
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "attachment";
}

/** Student: turn in (or re-turn in) work. */
export async function submitWork(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("student");
  const assignmentId = str(formData, "assignmentId");
  const assignment = await getAssignment(assignmentId);
  const classroom = assignment ? await getClassroom(assignment.classroomId) : null;
  if (!assignment || !classroom) return { error: "That work no longer exists." };
  if (!user.sectionId || classroom.sectionId !== user.sectionId) return { error: "This work isn't for your section." };

  const now = new Date();
  if (assignment.dueAt && now > assignment.dueAt && !assignment.allowLate) {
    return { error: "The due date has passed and this work doesn't accept late submissions." };
  }

  const content = str(formData, "content");
  const linkUrl = str(formData, "linkUrl");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!content && !linkUrl && !hasFile) return { error: "Add some text, a link, or attach a file." };
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) return { error: "Links should start with http:// or https://." };
  if (hasFile && file.size > MAX_FILE_BYTES) return { error: "Files must be 20 MB or smaller." };

  const existing = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, user.id)))
    .get();
  if (existing?.score != null) return { error: "This work has already been graded and can't be resubmitted." };

  let fileName: string | null = existing?.fileName ?? null;
  let filePath: string | null = existing?.filePath ?? null;
  if (hasFile) {
    const stored = `${newId()}-${safeFileName(file.name)}`;
    await putFile(stored, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
    if (filePath) await deleteFile(filePath);
    fileName = file.name;
    filePath = stored;
  }

  if (existing) {
    await db.update(submissions)
      .set({ content: content || null, linkUrl: linkUrl || null, fileName, filePath, submittedAt: now })
      .where(eq(submissions.id, existing.id))
      .run();
  } else {
    await db.insert(submissions)
      .values({ id: newId(), assignmentId, studentId: user.id, content: content || null, linkUrl: linkUrl || null, fileName, filePath, submittedAt: now })
      .run();
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Student: take back an ungraded submission. */
export async function unsubmitWork(formData: FormData) {
  const user = await requireRole("student");
  const assignmentId = str(formData, "assignmentId");
  const existing = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, user.id)))
    .get();
  if (!existing || existing.score != null) return;
  if (existing.filePath) await deleteFile(existing.filePath);
  await db.delete(submissions).where(eq(submissions.id, existing.id)).run();
  revalidatePath("/", "layout");
}

/** Teacher: score a submission and leave feedback. */
export async function gradeSubmission(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("teacher");
  const submissionId = str(formData, "submissionId");
  const sub = await db.select().from(submissions).where(eq(submissions.id, submissionId)).get();
  const assignment = sub ? await getAssignment(sub.assignmentId) : null;
  const classroom = assignment ? await getClassroom(assignment.classroomId) : null;
  if (!sub || !assignment || !classroom || classroom.teacherId !== user.id) return { error: "You can only grade work in your own classes." };

  const scoreRaw = str(formData, "score");
  const feedback = str(formData, "feedback");
  if (scoreRaw === "") {
    await db.update(submissions).set({ score: null, feedback: feedback || null, gradedAt: null }).where(eq(submissions.id, sub.id)).run();
  } else {
    const score = Number(scoreRaw);
    if (Number.isNaN(score) || score < 0) return { error: "Score should be a number of 0 or more." };
    if (score > assignment.points) return { error: `Score can't exceed ${assignment.points} points.` };
    await db.update(submissions).set({ score, feedback: feedback || null, gradedAt: new Date() }).where(eq(submissions.id, sub.id)).run();
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
