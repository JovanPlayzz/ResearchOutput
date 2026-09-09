import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UserMinus } from "lucide-react";
import { removeMember, updateTeacherDepartment } from "@/actions/school";
import { requireRole } from "@/lib/auth";
import { getTeacher, schoolSections, schoolTeachers, teacherClasses, teacherSlots } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { PageHeader } from "@/components/shell/page-header";
import { semesterOf, viewQuarter } from "@/lib/view";
import { ResetPasswordButton } from "@/components/portal/reset-password-button";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty";
import { Field, Input } from "@/components/ui/field";
import { Paper, SectionTitle } from "@/components/ui/paper";
import { ClassCard } from "@/components/portal/class-card";
import { Timetable } from "@/components/portal/timetable";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireRole("admin");
  const teacher = await getTeacher(id, user.schoolId);
  return { title: teacher?.name ?? "Teacher" };
}

export default async function TeacherPage({ params }: Props) {
  const { id } = await params;
  const user = await requireRole("admin");
  const teacher = await getTeacher(id, user.schoolId);
  if (!teacher) notFound();

  const viewing = await viewQuarter(user);
  const semester = semesterOf(viewing);
  const classes = await teacherClasses(id, { semester });
  const slots = await teacherSlots(id, semester);
  const advises = (await schoolSections(user.schoolId)).filter((s) => s.adviserId === id);
  const sectionsTaught = [...new Set(classes.map((c) => c.sectionLabel))];
  const departments = [...new Set((await schoolTeachers(user.schoolId)).map((t) => t.department).filter(Boolean))] as string[];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "People", href: "/admin/people" },
          ...(teacher.department ? [{ label: teacher.department, href: `/admin/people?dept=${encodeURIComponent(teacher.department)}` }] : []),
          { label: teacher.name },
        ]}
      />
      <PageHeader
        eyebrow={`Teacher · ${teacher.department ?? "No department"}`}
        title={teacher.name}
        description={`${classes.length} classes across ${sectionsTaught.length} section${sectionsTaught.length === 1 ? "" : "s"}${sectionsTaught.length ? `: ${sectionsTaught.join(", ")}` : ""}${advises.length ? ` · adviser of ${advises.map((s) => s.label).join(", ")}` : ""}.`}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <SectionTitle aside={<span>Semester {semester}</span>}>Timetable</SectionTitle>
            <Timetable slots={slots} detail="section" emptyTitle="No timetable yet." emptyText="Open one of the classes and add its time slots under Settings." />
          </section>
          <section>
            <SectionTitle aside={<span>{classes.length}</span>}>Subjects taught</SectionTitle>
            {classes.length ? (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                {classes.map((c) => (
                  <ClassCard key={c.id} c={c} viewerRole="admin" />
                ))}
              </div>
            ) : (
              <EmptyState title="No classes yet.">This teacher hasn&rsquo;t created a subject for any section.</EmptyState>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Paper className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={teacher.name} seed={teacher.id} size={48} />
              <div className="min-w-0">
                <p className="font-semibold">{teacher.name}</p>
                <p className="truncate text-[13px] text-ink-3">{teacher.email}</p>
                <p className="font-mono text-[11px] text-ink-3">since {fmtDate(teacher.createdAt)}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-dashed border-line pt-4">
              <ActionForm action={updateTeacherDepartment} submitLabel="Save" pendingLabel="Saving…" resetOnSuccess={false} closeOnSuccess={false} successMessage="Saved." className="space-y-3">
                <input type="hidden" name="userId" value={teacher.id} />
                <Field label="Department" hint="Teachers are grouped into folders by this.">
                  <Input name="department" defaultValue={teacher.department ?? ""} placeholder="Science" list="departments" />
                  <datalist id="departments">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
              </ActionForm>
            </div>
          </Paper>

          <Paper className="p-5">
            <SectionTitle>Password</SectionTitle>
            <p className="text-sm text-ink-2">Forgot it? Give them a temporary one. They choose their own the next time they sign in.</p>
            <div className="mt-3">
              <ResetPasswordButton userId={teacher.id} name={teacher.name} />
            </div>
          </Paper>

          <Paper className="p-5">
            <SectionTitle>Remove from school</SectionTitle>
            <p className="text-sm text-ink-2">Their classes, classwork, and grades are deleted. Sections they advise lose their adviser.</p>
            <form action={removeMember} className="mt-3">
              <input type="hidden" name="userId" value={teacher.id} />
              <ConfirmButton message={`Remove ${teacher.name} from the school? Their classes will be deleted.`} variant="danger" size="sm">
                <UserMinus size={14} /> Remove {teacher.name.split(" ")[0]}
              </ConfirmButton>
            </form>
          </Paper>
        </aside>
      </div>
    </>
  );
}
