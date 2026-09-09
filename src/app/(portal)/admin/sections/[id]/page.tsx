import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Pencil, Trash2, UserMinus } from "lucide-react";
import { assignSection, deleteSection } from "@/actions/school";
import { requireRole, sectionLabel } from "@/lib/auth";
import { getSection, schoolSections, schoolTeachers, sectionClasses, sectionSlots, sectionStudents, unassignedStudents } from "@/lib/queries";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { PageHeader } from "@/components/shell/page-header";
import { semesterOf, viewQuarter } from "@/lib/view";
import { ResetPasswordButton } from "@/components/portal/reset-password-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty";
import { Select } from "@/components/ui/field";
import { ClassDot, Paper, SectionTitle } from "@/components/ui/paper";
import { SectionForm } from "@/components/portal/forms";
import { Timetable } from "@/components/portal/timetable";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = await getSection(id);
  return { title: s ? sectionLabel(s) : "Section" };
}

export default async function SectionPage({ params }: Props) {
  const { id } = await params;
  const user = await requireRole("admin");
  const section = await getSection(id);
  if (!section || section.schoolId !== user.schoolId) notFound();

  const all = await schoolSections(user.schoolId);
  const summary = all.find((s) => s.id === id)!;
  const viewing = await viewQuarter(user);
  const semester = semesterOf(viewing);
  const students = await sectionStudents(id);
  const classes = await sectionClasses(id, { semester });
  const slots = await sectionSlots(id, semester);
  const teachers = await schoolTeachers(user.schoolId);
  const waiting = await unassignedStudents(user.schoolId);
  const others = all.filter((s) => s.id !== id);

  return (
    <>
      <Breadcrumbs items={[{ label: "People", href: "/admin/people" }, { label: `Grade ${section.gradeLevel}`, href: "/admin/people" }, { label: summary.label }]} />
      <PageHeader
        eyebrow={`Grade ${section.gradeLevel} · Section`}
        title={summary.label}
        description={`Adviser ${summary.adviserName ?? "not set yet"} · ${students.length} students · ${classes.length} subjects in semester ${semester}.`}
        actions={
          <>
            <Disclosure label="Edit section" icon={<Pencil size={14} />} variant="secondary" panelClassName="mt-4">
              <SectionForm section={section} teachers={teachers} />
            </Disclosure>
            <form action={deleteSection}>
              <input type="hidden" name="sectionId" value={section.id} />
              <ConfirmButton message={`Delete ${summary.label}? Its students become unassigned and its subjects (with all classwork) are deleted.`} variant="danger">
                <Trash2 size={14} /> Delete
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <section>
            <SectionTitle aside={<span>Semester {semester} · Mon – Fri</span>}>Timetable</SectionTitle>
            <Timetable slots={slots} detail="teacher" emptyTitle="No timetable yet." emptyText="Open a subject and add its time slots under Settings." />
          </section>

          <section>
            <SectionTitle aside={<span>{students.length}</span>}>Students</SectionTitle>
            <Paper>
              {students.length ? (
                <ul className="divide-y divide-dashed divide-line">
                  {students.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      <Avatar name={s.name} seed={s.id} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        <p className="truncate text-[12px] text-ink-3">{s.email}</p>
                      </div>
                      <form action={assignSection} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={s.id} />
                        <Select name="sectionId" defaultValue="" className="h-8 w-[160px] py-1 text-[13px]" aria-label="Move to section" required>
                          <option value="" disabled>
                            Move to…
                          </option>
                          {others.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" size="sm" variant="secondary" aria-label="Move">
                          <ArrowRight size={14} />
                        </Button>
                      </form>
                      <ResetPasswordButton userId={s.id} name={s.name} compact />
                      <form action={assignSection}>
                        <input type="hidden" name="userId" value={s.id} />
                        <input type="hidden" name="sectionId" value="" />
                        <ConfirmButton message={`Take ${s.name} out of ${summary.label}? They'll be unassigned until filed again.`} variant="ghost" size="sm" className="text-ink-3 hover:text-red" aria-label="Remove from section">
                          <UserMinus size={14} />
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-ink-3">Nobody yet. Students pick this section when they sign up, or file them from the list on the right.</p>
              )}
            </Paper>
          </section>
        </div>

        <aside className="space-y-6">
          <Paper className="p-4">
            <SectionTitle aside={<span>{classes.length}</span>}>Subjects</SectionTitle>
            {classes.length ? (
              <ul className="space-y-2">
                {classes.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <ClassDot color={c.color} className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <Link href={`/classes/${c.id}`} className="block truncate font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <span className="block truncate text-[12px] text-ink-3">
                        {c.teacherName}
                        {c.scheduleText ? ` · ${c.scheduleText}` : " · no schedule yet"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No subjects yet. Teachers create one for this section from their Classes page.</p>
            )}
          </Paper>

          {waiting.length ? (
            <Paper className="p-4">
              <SectionTitle aside={<span className="text-amber">{waiting.length}</span>}>File into {summary.label}</SectionTitle>
              <ul className="space-y-1.5">
                {waiting.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <form action={assignSection}>
                      <input type="hidden" name="userId" value={s.id} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Add
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </Paper>
          ) : (
            <Paper className="p-4">
              <p className="text-sm text-ink-3">Every student in the school is filed in a section.</p>
            </Paper>
          )}
        </aside>
      </div>
      {classes.length === 0 && students.length === 0 ? <div className="mt-8"><EmptyState title="An empty folder.">Share the school code so students can join, and ask teachers to add their subjects.</EmptyState></div> : null}
    </>
  );
}
