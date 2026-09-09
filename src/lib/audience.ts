import type { SchoolUser } from "./auth";
import { postingAudiences } from "./queries";

/**
 * Turns an audience value from a form ("school" | "section:<id>" | "class:<id>")
 * into target columns, but only if this user is allowed to post there.
 */
export async function resolveAudience(user: SchoolUser, audience: string): Promise<{ sectionId: string | null; classroomId: string | null } | null> {
  const allowed = (await postingAudiences(user)).some((a) => a.value === audience);
  if (!allowed) return null;
  if (audience === "school") return { sectionId: null, classroomId: null };
  const [kind, id] = audience.split(":");
  if (kind === "section" && id) return { sectionId: id, classroomId: null };
  if (kind === "class" && id) return { sectionId: null, classroomId: id };
  return null;
}
