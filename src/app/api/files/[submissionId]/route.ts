import { eq } from "drizzle-orm";
import { db, submissions } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getAssignment, getClassroom } from "@/lib/queries";
import { getFile } from "@/lib/storage";

/** Serves a submission's attachment to the student who uploaded it, their teacher, or a school admin. */
export async function GET(_req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to download files.", { status: 401 });

  const sub = await db.select().from(submissions).where(eq(submissions.id, submissionId)).get();
  if (!sub || !sub.filePath || !sub.fileName) return new Response("Not found", { status: 404 });

  const assignment = await getAssignment(sub.assignmentId);
  const classroom = assignment ? await getClassroom(assignment.classroomId) : null;
  if (!classroom) return new Response("Not found", { status: 404 });

  const allowed =
    sub.studentId === user.id ||
    (user.role === "teacher" && classroom.teacherId === user.id) ||
    (user.role === "admin" && classroom.schoolId === user.schoolId);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const file = await getFile(sub.filePath);
  if (!file) return new Response("File is missing.", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(sub.fileName)}`,
    "Cache-Control": "private, no-store",
  };
  if (file.size != null) headers["Content-Length"] = String(file.size);
  return new Response(file.body, { headers });
}
