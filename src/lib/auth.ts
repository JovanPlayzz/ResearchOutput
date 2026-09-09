import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, ready, sessions, users, schools, sections, type Role, type School, type Section } from "@/db";
import { newId } from "./ids";

const COOKIE = "portal_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const id = newId() + newId();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt }).run();
  const store = await cookies();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id)).run();
  store.delete(COOKIE);
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  sectionId: string | null;
  department: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
  school: School | null;
  /** Students only: the section they belong to. */
  section: Section | null;
};

export type SchoolUser = CurrentUser & { schoolId: string };

/** Reads the session cookie and returns the signed-in user (never the password hash). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id) return null;
  await ready;

  const row = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      schoolId: users.schoolId,
      sectionId: users.sectionId,
      department: users.department,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
      school: schools,
      section: sections,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .leftJoin(sections, eq(users.sectionId, sections.id))
    .where(eq(sessions.id, id))
    .get();

  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  const { expiresAt: _expires, ...user } = row;
  void _expires;
  return user;
});

/**
 * Redirects to /login when signed out, to /change-password while a temporary
 * password is in force, and to /onboarding when the account has no school yet.
 */
export async function requireUser(opts?: { allowNoSchool?: boolean; allowPendingPassword?: boolean }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts?.allowPendingPassword) redirect("/change-password");
  if (!user.schoolId && !opts?.allowNoSchool) redirect("/onboarding");
  return user as SchoolUser;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/** A short line that says who someone is: "12-CORE" for students, "Science" for teachers. */
export function userSubtitle(user: { role: Role; department: string | null; section: Section | null }) {
  if (user.role === "student") return user.section ? sectionLabel(user.section) : "No section yet";
  if (user.role === "teacher") return user.department ?? "Teacher";
  return "Administrator";
}

export function sectionLabel(s: { gradeLevel: string; name: string }) {
  return `${s.gradeLevel}-${s.name}`;
}
