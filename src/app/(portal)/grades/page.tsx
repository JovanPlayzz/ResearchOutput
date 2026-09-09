import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { semesterAverage, studentGrades } from "@/lib/queries";
import { semesterOf, viewQuarter } from "@/lib/view";
import { cn, fmtDate, gradeLetter } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty";
import { ClassDot, Folder, Paper, Tag } from "@/components/ui/paper";
import { GradeValue } from "@/components/portal/grade-value";
import { workKindLabel } from "@/components/portal/work-row";

export const metadata: Metadata = { title: "Grades" };

function Pct({ v, big = false }: { v: number | null; big?: boolean }) {
  return <GradeValue v={v} big={big} />;
}

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireRole("student");
  const viewing = await viewQuarter(user);
  const quarter = ["1", "2", "3", "4"].includes(q ?? "") ? Number(q) : viewing;
  const grades = await studentGrades(user, user.id, semesterOf(quarter));

  const overallList = grades
    .map((g) => g.quarters.find((x) => x.quarter === quarter)?.pct ?? null)
    .filter((v): v is number => v != null);
  const overall = overallList.length
    ? Math.round(
        (overallList.reduce((a, b) => a + b, 0) / overallList.length) * 10,
      ) / 10
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Report"
        title="Grades"
        description={`Semester ${semesterOf(quarter)} subjects, from graded work only. Ungraded and missing work doesn't count until it's scored.`}
        actions={
          <div className="text-right">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
              Quarter {quarter} average
            </p>
            <p className="mt-1">
              <GradeValue v={overall} big />
            </p>
          </div>
        }
      />

      {grades.length === 0 ? (
        <EmptyState title="No subjects yet.">
          Once you&rsquo;re in a section with subjects, your grades appear here.
        </EmptyState>
      ) : (
        <>
          <Paper className="mb-8">
            <div className="overflow-x-auto rounded-t-[8px]">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-paper-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                    <th className="sticky left-0 z-10 bg-paper-3 px-3 py-2 text-left shadow-[1px_0_0_var(--line)] sm:px-4">
                      Subject
                    </th>
                    {[1, 2, 3, 4].map((qv) => (
                      <th
                        key={qv}
                        className={cn(
                          "px-2 py-2 text-right",
                          qv === quarter && "text-ink",
                        )}
                      >
                        <Link
                          href={`/grades?q=${qv}`}
                          className="hover:underline"
                        >
                          Q{qv}
                        </Link>
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-2 py-2 text-right">
                      Sem 1
                    </th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">
                      Sem 2
                    </th>
                    <th className="px-4 py-2 text-right">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.classroom.id} className="border-t border-line">
                      {/* Pinned so the subject stays visible while the quarters scroll sideways on phones. */}
                      <td className="sticky left-0 z-10 bg-paper-2 px-3 py-2 shadow-[1px_0_0_var(--line)] sm:px-4">
                        <span className="flex items-center gap-2">
                          <ClassDot color={g.classroom.color} />
                          <Link
                            href={`/classes/${g.classroom.id}?tab=work`}
                            className="max-w-[42vw] truncate font-semibold hover:underline sm:max-w-none"
                          >
                            {g.classroom.name}
                          </Link>
                          <span className="hidden text-[12px] text-ink-3 sm:inline">
                            {g.classroom.teacherName}
                          </span>
                        </span>
                        <span className="block truncate pl-[18px] text-[12px] text-ink-3 sm:hidden">
                          {g.classroom.teacherName}
                        </span>
                      </td>
                      {g.quarters.map((qg) => (
                        <td
                          key={qg.quarter}
                          className={cn(
                            "px-2 py-2 text-right",
                            qg.quarter === quarter && "bg-manila/25",
                          )}
                        >
                          <Pct v={qg.pct} />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right">
                        <Pct v={semesterAverage(g.quarters, 1)} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Pct v={semesterAverage(g.quarters, 2)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <Pct v={g.overallPct} />{" "}
                        <span className="font-mono text-[12px] text-ink-3">
                          {gradeLetter(g.overallPct)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-4 py-2 font-mono text-[11px] text-ink-3">
              <span className="sm:hidden">
                Swipe the table sideways for semesters and overall.{" "}
              </span>
              Click a quarter to see its work below. Semester averages combine
              two quarters.
            </p>
          </Paper>

          <div className="space-y-8">
            {grades.map((g) => {
              const qg = g.quarters.find((x) => x.quarter === quarter)!;
              return (
                <Folder
                  key={g.classroom.id}
                  tab={
                    <span className="inline-flex items-center gap-2">
                      <ClassDot color={g.classroom.color} /> {g.classroom.name}
                    </span>
                  }
                  aside={
                    <span className="inline-flex items-baseline gap-2">
                      <Pct v={qg.pct} big />
                      <span className="font-mono text-[12px] text-ink-3">
                        Q{quarter} · {qg.earned}/{qg.possible} pts
                      </span>
                    </span>
                  }
                >
                  {qg.items.length ? (
                    <table className="w-full text-sm">
                      <tbody>
                        {qg.items.map(({ assignment, submission, pct }) => (
                          <tr
                            key={assignment.id}
                            className="border-b border-dashed border-line last:border-0"
                          >
                            <td className="px-4 py-2">
                              <Link
                                href={`/classes/${g.classroom.id}/work/${assignment.id}`}
                                className="font-semibold hover:underline"
                              >
                                {assignment.title}
                              </Link>
                              <div className="text-[12px] text-ink-3">
                                {workKindLabel[assignment.kind]}
                                {assignment.dueAt
                                  ? ` · due ${fmtDate(assignment.dueAt)}`
                                  : ""}
                              </div>
                              {submission?.feedback ? (
                                <p className="mt-1 text-[13px] italic text-ink-2">
                                  &ldquo;{submission.feedback}&rdquo;
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-right align-top">
                              {submission?.score != null ? (
                                <>
                                  <span className="font-mono">
                                    {submission.score}/{assignment.points}
                                  </span>
                                  <div className="text-[12px]">
                                    <GradeValue v={pct} />
                                  </div>
                                </>
                              ) : submission ? (
                                <Tag tone="accent">Turned in</Tag>
                              ) : assignment.dueAt &&
                                assignment.dueAt.getTime() < Date.now() ? (
                                <Tag tone="red">Missing</Tag>
                              ) : (
                                <Tag>Not due</Tag>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-4 py-3 text-sm text-ink-3">
                      No work posted for quarter {quarter} yet.
                    </p>
                  )}
                </Folder>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
