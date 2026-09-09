import { cookies } from "next/headers";
import type { SchoolUser } from "./auth";

/** Quarters 1–2 are semester 1, quarters 3–4 are semester 2. */
export const semesterOf = (quarter: number) => (quarter <= 2 ? 1 : 2);

export const quarterLabel = (q: number) => `Quarter ${q} · Sem ${semesterOf(q)}`;

/**
 * The quarter the user is looking at. Defaults to the school's current quarter;
 * the sidebar picker stores a different choice in a cookie.
 */
export async function viewQuarter(user: SchoolUser) {
  const raw = (await cookies()).get("view_quarter")?.value;
  const q = Number(raw);
  return [1, 2, 3, 4].includes(q) ? q : (user.school?.currentQuarter ?? 1);
}

/** "2026 – 2027" → "2027 – 2028". Empty when the current label isn't two years. */
export function nextSchoolYear(current: string | null | undefined) {
  const m = current?.match(/(\d{4})\D+(\d{4})/);
  if (!m) return "";
  return `${Number(m[1]) + 1} – ${Number(m[2]) + 1}`;
}
