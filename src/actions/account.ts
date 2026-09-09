"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, sessions, users } from "@/db";
import { requireRole, requireUser } from "@/lib/auth";
import { newJoinCode } from "@/lib/ids";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowNoSchool: true });
  const name = str(formData, "name");
  const department = str(formData, "department");
  if (name.length < 2) return { error: "Please enter your name." };
  await db.update(users)
    .set({ name, department: user.role === "teacher" ? department || null : user.department })
    .where(eq(users.id, user.id))
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowNoSchool: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  const row = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).get();
  if (!row || !verifyPassword(current, row.passwordHash)) return { error: "Your current password is incorrect." };
  await db.update(users).set({ passwordHash: hashPassword(next), mustChangePassword: false }).where(eq(users.id, user.id)).run();
  return { ok: true };
}

/** After signing in with a temporary password: pick a real one. No current password needed. */
export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowNoSchool: true, allowPendingPassword: true });
  if (!user.mustChangePassword) redirect(user.schoolId ? "/dashboard" : "/onboarding");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "Use at least 8 characters." };
  if (next !== confirm) return { error: "The two passwords don't match." };
  await db.update(users).set({ passwordHash: hashPassword(next), mustChangePassword: false }).where(eq(users.id, user.id)).run();
  redirect(user.schoolId ? "/dashboard" : "/onboarding");
}

export type ResetState = { error?: string; temp?: string; name?: string } | undefined;

/**
 * Admin: give someone in the school a temporary password. Their sessions end,
 * the temporary password is shown once, and they must choose a new one at sign-in.
 */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const admin = await requireRole("admin");
  const userId = str(formData, "userId");
  if (userId === admin.id) return { error: "Change your own password from Settings." };
  const target = await db.select().from(users).where(and(eq(users.id, userId), eq(users.schoolId, admin.schoolId))).get();
  if (!target) return { error: "That person isn't in this school." };

  const temp = newJoinCode(8);
  await db.update(users).set({ passwordHash: hashPassword(temp), mustChangePassword: true }).where(eq(users.id, userId)).run();
  await db.delete(sessions).where(eq(sessions.userId, userId)).run();
  return { temp, name: target.name };
}
