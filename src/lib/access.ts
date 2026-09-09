import { notFound } from "next/navigation";
import { requireUser } from "./auth";
import { canAccessClassroom, getClassroom } from "./queries";

/** For class pages: the signed-in user plus the classroom, or a 404 when they can't see it. */
export async function requireClassroomAccess(classroomId: string) {
  const user = await requireUser();
  const classroom = await getClassroom(classroomId);
  if (!classroom || !canAccessClassroom(user, classroom)) notFound();
  const isTeacher = user.role === "teacher" && classroom.teacherId === user.id;
  const isAdmin = user.role === "admin";
  return {
    user,
    classroom,
    isTeacher,
    isAdmin,
    /** Teachers manage their own class; admins can manage any class (details, schedule, archive). */
    canManage: isTeacher || isAdmin,
    isStudent: user.role === "student",
  };
}
