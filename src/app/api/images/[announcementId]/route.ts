import { eq } from "drizzle-orm";
import { db, announcements } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getFile } from "@/lib/storage";

/** Serves an announcement's attached image to anyone in the same school. */
export async function GET(_req: Request, { params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to view images.", { status: 401 });

  const row = await db.select().from(announcements).where(eq(announcements.id, announcementId)).get();
  if (!row || !row.imagePath || row.schoolId !== user.schoolId) return new Response("Not found", { status: 404 });

  const file = await getFile(`announcements/${row.imagePath}`);
  if (!file) return new Response("Image is missing.", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": row.imageType ?? file.contentType ?? "application/octet-stream",
    "Cache-Control": "private, max-age=3600",
  };
  if (file.size != null) headers["Content-Length"] = String(file.size);
  return new Response(file.body, { headers });
}
