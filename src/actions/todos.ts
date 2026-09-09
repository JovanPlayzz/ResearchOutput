"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, todos } from "@/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/ids";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function addTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const title = str(formData, "title");
  const notes = str(formData, "notes");
  const dueRaw = str(formData, "dueAt");
  if (!title) return { error: "Write what you need to do." };
  let dueAt: Date | null = null;
  if (dueRaw) {
    dueAt = new Date(dueRaw + "T23:59:00");
    if (Number.isNaN(dueAt.getTime())) dueAt = null;
  }
  await db.insert(todos).values({ id: newId(), userId: user.id, title, notes: notes || null, dueAt, createdAt: new Date() }).run();
  revalidatePath("/todo");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleTodo(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "todoId");
  const row = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id))).get();
  if (!row) return;
  await db.update(todos).set({ done: !row.done }).where(eq(todos.id, id)).run();
  revalidatePath("/todo");
  revalidatePath("/dashboard");
}

export async function deleteTodo(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "todoId");
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id))).run();
  revalidatePath("/todo");
  revalidatePath("/dashboard");
}

export async function clearDoneTodos() {
  const user = await requireUser();
  await db.delete(todos).where(and(eq(todos.userId, user.id), eq(todos.done, true))).run();
  revalidatePath("/todo");
  revalidatePath("/dashboard");
}
