"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, events, EVENT_KINDS, type EventKind } from "@/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { resolveAudience } from "@/lib/audience";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function parseLocal(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role === "student") return { error: "Only teachers and admins can add events." };

  const title = str(formData, "title");
  const description = str(formData, "description");
  const location = str(formData, "location");
  const audience = str(formData, "audience");
  const kindRaw = str(formData, "kind") as EventKind;
  const kind: EventKind = EVENT_KINDS.includes(kindRaw) ? kindRaw : "school";
  const allDay = formData.get("allDay") === "on";

  if (!title) return { error: "Give the event a title." };
  const target = await resolveAudience(user, audience);
  if (!target) return { error: "Choose who this event is for." };

  const startsAt = allDay ? parseLocal(str(formData, "startDate")) : parseLocal(str(formData, "startsAt"));
  let endsAt = allDay ? parseLocal(str(formData, "endDate")) : parseLocal(str(formData, "endsAt"));
  if (!startsAt) return { error: "Pick a start date." };
  if (allDay) startsAt.setHours(0, 0, 0, 0);
  if (endsAt && allDay) endsAt.setHours(23, 59, 59, 999);
  if (endsAt && endsAt.getTime() < startsAt.getTime()) return { error: "The end can't be before the start." };
  if (!endsAt) endsAt = null;

  await db.insert(events)
    .values({
      id: newId(),
      schoolId: user.schoolId,
      ...target,
      createdBy: user.id,
      title,
      description: description || null,
      location: location || null,
      kind,
      startsAt,
      endsAt,
      allDay,
      createdAt: new Date(),
    })
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteEvent(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "eventId");
  const row = await db.select().from(events).where(eq(events.id, id)).get();
  if (!row || row.schoolId !== user.schoolId) return;
  if (user.role !== "admin" && row.createdBy !== user.id) return;
  await db.delete(events).where(eq(events.id, id)).run();
  revalidatePath("/", "layout");
}
