import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Paperclip, Pencil, Trash2, Undo2 } from "lucide-react";
import { deleteAssignment, gradeSubmission, submitWork, unsubmitWork } from "@/actions/classwork";
import { requireClassroomAccess } from "@/lib/access";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { assignmentSubmissions, classroomStudents, getAssignment, getClassroomSummary, getSubmission } from "@/lib/queries";
import { cn, dueInfo, fmtDateTime, percent } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Paper, SectionTitle, Stamp, Tag } from "@/components/ui/paper";
import { WorkForm } from "@/components/portal/forms";
import { workKindLabel } from "@/components/portal/work-row";

type Props = { params: Promise<{ id: string; workId: string }> };

export const metadata: Metadata = { title: "Classwork" };

const dueTone = { none: "text-ink-3", overdue: "text-red", today: "text-red", soon: "text-amber", later: "text-ink-2" } as const;

export default async function WorkPage({ params }: Props) {
  const { id, workId } = await params;
  const { user, classroom, isTeacher, isAdmin, isStudent } = await requireClassroomAccess(id);
  const assignment = await getAssignment(workId);
  if (!assignment || assignment.classroomId !== classroom.id) notFound();

  const summary = (await getClassroomSummary(classroom.id))!;
  const due = dueInfo(assignment.dueAt);
  const mine = isStudent ? await getSubmission(assignment.id, user.id) : null;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Classes", href: "/classes" },
          { label: `${classroom.name} · ${summary.sectionLabel}`, href: `/classes/${classroom.id}` },
          { label: "Classwork", href: `/classes/${classroom.id}?tab=work` },
          { label: assignment.title },
        ]}
      />
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {workKindLabel[assignment.kind]} · Quarter {assignment.quarter} · {assignment.points} points
          </span>
        }
        title={assignment.title}
        description={
          <span className={cn("font-medium", dueTone[due.state])}>
            {due.label}
            {assignment.dueAt ? <span className="font-normal text-ink-3"> · {fmtDateTime(assignment.dueAt)}</span> : null}
            {!assignment.allowLate ? <span className="font-normal text-ink-3"> · No late submissions</span> : null}
          </span>
        }
        actions={
          isTeacher ? (
            <>
              <Disclosure label="Edit" icon={<Pencil size={14} />} variant="secondary" panelClassName="mt-4">
                <WorkForm classroomId={classroom.id} assignment={assignment} currentQuarter={user.school?.currentQuarter ?? 1} />
              </Disclosure>
              <form action={deleteAssignment}>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <ConfirmButton message="Delete this work and every submission for it?" variant="danger">
                  <Trash2 size={14} /> Delete
                </ConfirmButton>
              </form>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Paper>
            <h2 className="px-5 pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Instructions</h2>
            <div className="ruled margin-line whitespace-pre-line pb-4 pl-14 pr-5 text-ink-2" style={{ ["--rule-h" as string]: "1.85rem" }}>
              {assignment.instructions?.trim() ? assignment.instructions : <span className="italic text-ink-3">No instructions were added.</span>}
            </div>
          </Paper>

          {isTeacher || isAdmin ? <SubmissionsPanel assignmentId={assignment.id} classroomId={classroom.id} points={assignment.points} canGrade={isTeacher} /> : null}
        </div>

        {isStudent ? (
          <aside>
            <Paper className="p-5">
              <SectionTitle>Your work</SectionTitle>
              {mine ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {mine.score != null ? <Stamp tone="green">Graded</Stamp> : <Stamp tone="accent">Turned in</Stamp>}
                    {assignment.dueAt && mine.submittedAt > assignment.dueAt ? <Stamp tone="red">Late</Stamp> : null}
                    <span className="text-[12px] text-ink-3">{fmtDateTime(mine.submittedAt)}</span>
                  </div>
                  {mine.score != null ? (
                    <div className="flex items-center gap-4 rounded-[6px] border border-dashed border-line-2 bg-paper p-3">
                      <span className="score-circle text-red">{mine.score}</span>
                      <div>
                        <p className="font-display text-xl">
                          {mine.score} / {assignment.points}
                        </p>
                        <p className="text-[13px] text-ink-3">{percent(mine.score, assignment.points)}%</p>
                      </div>
                    </div>
                  ) : null}
                  {mine.feedback ? (
                    <div className="sticky-note rounded-[3px] px-3 py-2 text-[14px]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">Teacher&rsquo;s note</p>
                      <p className="mt-0.5 whitespace-pre-line">{mine.feedback}</p>
                    </div>
                  ) : null}
                  <SubmissionBody s={mine} />
                  {mine.score == null ? (
                    <form action={unsubmitWork} className="pt-1">
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <ConfirmButton message="Take back your submission? You can turn it in again afterwards." variant="ghost" size="sm">
                        <Undo2 size={14} /> Unsubmit
                      </ConfirmButton>
                    </form>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-ink-2">Paste your answer, add a link, or attach a file. You can do any combination.</p>
                  <ActionForm action={submitWork} submitLabel="Turn in" pendingLabel="Turning in…" closeOnSuccess={false}>
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <Field label="Answer / notes">
                      <Textarea name="content" rows={5} placeholder="Write your answer or a note for your teacher." />
                    </Field>
                    <Field label="Link">
                      <Input name="linkUrl" type="url" placeholder="https://docs.google.com/…" />
                    </Field>
                    <Field label="Attachment" hint="Up to 20 MB.">
                      <Input name="file" type="file" className="file:mr-3 file:rounded-[4px] file:border file:border-line-2 file:bg-paper-3 file:px-2 file:py-1 file:text-sm" />
                    </Field>
                  </ActionForm>
                </>
              )}
            </Paper>
          </aside>
        ) : null}
      </div>
    </>
  );
}

function SubmissionBody({ s }: { s: { content: string | null; linkUrl: string | null; fileName: string | null; id: string } }) {
  return (
    <div className="space-y-2 text-[14px]">
      {s.content ? <p className="whitespace-pre-line rounded-[5px] border border-line bg-paper px-3 py-2 text-ink-2">{s.content}</p> : null}
      {s.linkUrl ? (
        <a href={s.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          <ExternalLink size={13} /> {s.linkUrl}
        </a>
      ) : null}
      {s.fileName ? (
        <a href={`/api/files/${s.id}`} className="inline-flex items-center gap-1 text-accent hover:underline">
          <Paperclip size={13} /> {s.fileName}
        </a>
      ) : null}
    </div>
  );
}

async function SubmissionsPanel({ assignmentId, classroomId, points, canGrade }: { assignmentId: string; classroomId: string; points: number; canGrade: boolean }) {
  const students = await classroomStudents(classroomId);
  const subs = await assignmentSubmissions(assignmentId);
  const byStudent = new Map(subs.map((r) => [r.student.id, r.submission]));
  const submitted = subs.length;
  const graded = subs.filter((r) => r.submission.score != null).length;
  const assignment = await getAssignment(assignmentId);

  return (
    <section>
      <SectionTitle
        aside={
          <span className="font-mono text-[12px]">
            {submitted}/{students.length} turned in · {graded} graded
          </span>
        }
      >
        Submissions
      </SectionTitle>
      <Paper>
        <ul className="divide-y divide-dashed divide-line">
          {students.map((st) => {
            const s = byStudent.get(st.id) ?? null;
            const late = s && assignment?.dueAt ? s.submittedAt > assignment.dueAt : false;
            return (
              <li key={st.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <Avatar name={st.name} seed={st.id} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{st.name}</p>
                      {!s ? (
                        <Tag tone="red">Missing</Tag>
                      ) : s.score != null ? (
                        <Tag tone="green">
                          {s.score}/{points}
                        </Tag>
                      ) : (
                        <Tag tone="accent">Turned in</Tag>
                      )}
                      {late ? <Tag tone="amber">Late</Tag> : null}
                      {s ? <span className="text-[12px] text-ink-3">{fmtDateTime(s.submittedAt)}</span> : null}
                    </div>
                    {s ? (
                      <div className="mt-2">
                        <SubmissionBody s={s} />
                      </div>
                    ) : null}
                    {s && !canGrade && s.feedback ? <p className="mt-2 text-[13px] italic text-ink-2">&ldquo;{s.feedback}&rdquo;</p> : null}
                    {s && canGrade ? (
                      <div className="mt-3 rounded-[6px] border border-dashed border-line-2 bg-paper p-3">
                        <ActionForm
                          action={gradeSubmission}
                          submitLabel={s.score != null ? "Update grade" : "Save grade"}
                          pendingLabel="Saving…"
                          resetOnSuccess={false}
                          closeOnSuccess={false}
                          successMessage="Saved."
                          className="space-y-2"
                        >
                          <input type="hidden" name="submissionId" value={s.id} />
                          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[120px_1fr]">
                            <Field label={`Score / ${points}`}>
                              <Input name="score" type="number" min={0} max={points} step="0.5" defaultValue={s.score ?? ""} placeholder="—" />
                            </Field>
                            <Field label="Feedback">
                              <Input name="feedback" defaultValue={s.feedback ?? ""} placeholder="A sentence or two for the student." />
                            </Field>
                          </div>
                        </ActionForm>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Paper>
    </section>
  );
}
