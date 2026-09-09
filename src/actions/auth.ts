"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, ready, users, ROLES, type Role } from "@/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { newId } from "@/lib/ids";

export type FormState = { error?: string; ok?: boolean } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  await ready;
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "That email and password don't match." };
  }
  await createSession(user.id);
  redirect(user.mustChangePassword ? "/change-password" : user.schoolId ? "/dashboard" : "/onboarding");
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = str(formData, "role") as Role;

  if (name.length < 2) return { error: "Please enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (!ROLES.includes(role)) return { error: "Choose whether you're a student, teacher, or admin." };

  await ready;
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (exists) return { error: "An account with that email already exists. Try signing in." };

  const id = newId();
  await db.insert(users)
    .values({ id, name, email, role, passwordHash: hashPassword(password), createdAt: new Date() })
    .run();
  await createSession(id);
  redirect("/onboarding");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
