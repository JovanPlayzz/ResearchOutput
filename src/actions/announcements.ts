"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, announcements, announcementReads, PRIORITIES, type Priority } from "@/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { visibleAnnouncementIds } from "@/lib/queries";
import { resolveAudience } from "@/lib/audience";
import { deleteFile, putFile } from "@/lib/storage";
import type { FormState } from "./auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function createAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role === "student") return { error: "Only teachers and admins can post announcements." };

  const title = str(formData, "title");
  const body = str(formData, "body");
  const audience = str(formData, "audience");
  const priorityRaw = str(formData, "priority") as Priority;
  const priority: Priority = PRIORITIES.includes(priorityRaw) ? priorityRaw : "normal";
  const pinned = formData.get("pinned") === "on";

  if (!title) return { error: "Give the announcement a title." };
  if (!body) return { error: "Write something in the body." };
  const target = await resolveAudience(user, audience);
  if (!target) return { error: "Choose who this announcement is for." };

  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;
  if (hasImage && !image.type.startsWith("image/")) return { error: "Only image files can be attached." };
  if (hasImage && image.size > MAX_IMAGE_BYTES) return { error: "Images must be 8 MB or smaller." };

  const id = newId();
  let imagePath: string | null = null;
  if (hasImage) {
    imagePath = `${id}-${image.name.replace(/[^\w.() -]+/g, "_").slice(0, 100) || "image"}`;
    await putFile(`announcements/${imagePath}`, Buffer.from(await image.arrayBuffer()), image.type);
  }

  await db.insert(announcements)
    .values({
      id,
      schoolId: user.schoolId,
      ...target,
      authorId: user.id,
      title,
      body,
      priority,
      pinned,
      imagePath,
      imageName: hasImage ? image.name : null,
      imageType: hasImage ? image.type : null,
      createdAt: new Date(),
    })
    .run();
  await db.insert(announcementReads).values({ announcementId: id, userId: user.id, readAt: new Date() }).run();

  revalidatePath("/", "layout");
  return { ok: true };
}

async function ownedAnnouncement(id: string, user: { id: string; role: string; schoolId: string }) {
  const row = await db.select().from(announcements).where(eq(announcements.id, id)).get();
  if (!row || row.schoolId !== user.schoolId) return null;
  if (user.role !== "admin" && row.authorId !== user.id) return null;
  return row;
}

export async function deleteAnnouncement(formData: FormData) {
  const user = await requireUser();
  const row = await ownedAnnouncement(str(formData, "announcementId"), user);
  if (!row) return;
  await db.delete(announcements).where(eq(announcements.id, row.id)).run();
  if (row.imagePath) await deleteFile(`announcements/${row.imagePath}`);
  revalidatePath("/", "layout");
}

export async function togglePin(formData: FormData) {
  const user = await requireUser();
  const row = await ownedAnnouncement(str(formData, "announcementId"), user);
  if (!row) return;
  await db.update(announcements).set({ pinned: !row.pinned }).where(eq(announcements.id, row.id)).run();
  revalidatePath("/", "layout");
}

export async function markRead(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "announcementId");
  if (!id) return;
  await db.insert(announcementReads).values({ announcementId: id, userId: user.id, readAt: new Date() }).onConflictDoNothing().run();
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const user = await requireUser();
  const now = new Date();
  for (const id of await visibleAnnouncementIds(user)) {
    await db.insert(announcementReads).values({ announcementId: id, userId: user.id, readAt: now }).onConflictDoNothing().run();
  }
  revalidatePath("/", "layout");
}
