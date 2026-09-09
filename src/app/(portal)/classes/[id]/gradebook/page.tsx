import Link from "next/link";
import type { Metadata } from "next";
import { requireClassroomAccess } from "@/lib/access";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { classGradebook, getClassroomSummary } from "@/lib/queries";
import { viewQuarter } from "@/lib/view";
import { cn, fmtDate, gradeLetter, gradeTone } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty";
import { Paper } from "@/components/ui/paper";
import { GradeValue } from "@/components/portal/grade-value";
import { workKindLabel } from "@/components/portal/work-row";

export const metadata: Metadata = { title: "Gradebook" };

export default async function GradebookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  const { user, classroom, canManage } = await requireClassroomAccess(id);
  if (!canManage) {
    // Students never see the whole gradebook.
    return null;
  }
  const summary = (await getClassroomSummary(classroom.id))!;
  const viewing = await viewQuarter(user);
  const quarter = q === "all" ? null : ["1", "2", "3", "4"].includes(q ?? "") ? Number(q) : viewing;

  const { work, rows } = await classGradebook(classroom.id, quarter);
  const classAvg = rows.filter((r) => r.pct != null).map((r) => r.pct as number);
  const avg = classAvg.length ? Math.round((classAvg.reduce((a, b) => a + b, 0) / classAvg.length) * 10) / 10 : null;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Classes", href: "/classes" },
          { label: `${classroom.name} · ${summary.sectionLabel}`, href: `/classes/${classroom.id}` },
          { label: "Gradebook" },
        ]}
      />
      <PageHeader
        eyebrow={`Gradebook · ${summary.sectionLabel}`}
        title={classroom.name}
        description={
          <>
            {rows.length} students · {work.length} items · average{" "}
<GradeValue v={avg} />
          </>
        }
        actions={
          <div className="inline-flex overflow-hidden rounded-[5px] border border-line-2 bg-paper-2 text-[13px]">
            {[1, 2, 3, 4, null].map((qv) => (
              <Link
                key={qv ?? "all"}
                href={`/classes/${classroom.id}/gradebook?q=${qv ?? "all"}`}
                className={cn("border-r border-line-2 px-2.5 py-1.5 last:border-r-0", quarter === qv ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-3")}
              >
                {qv ? `Q${qv}` : "All"}
              </Link>
            ))}
          </div>
        }
      />

      {work.length === 0 || rows.length === 0 ? (
        <EmptyState title={quarter ? `Nothing graded in quarter ${quarter} yet.` : "Nothing to grade yet."}>Post classwork for this quarter and the gradebook fills itself in.</EmptyState>
      ) : (
        <Paper className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-paper-3">
                <th className="sticky left-0 z-10 bg-paper-3 px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Student</th>
                {work.map((w) => (
                  <th key={w.id} className="min-w-[110px] px-2 py-2 text-left align-bottom">
                    <Link href={`/classes/${classroom.id}/work/${w.id}`} className="block text-[13px] font-semibold leading-tight hover:underline">
                      {w.title}
                    </Link>
                    <span className="font-mono text-[10.5px] text-ink-3">
                      {quarter ? "" : `Q${w.quarter} · `}
                      {workKindLabel[w.kind]} · {w.points} pts{w.dueAt ? ` · ${fmtDate(w.dueAt)}` : ""}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student.id} className="border-t border-line hover:bg-paper-3/60">
                  <td className="sticky left-0 z-10 bg-paper-2 px-4 py-2 font-semibold">{r.student.name}</td>
                  {r.cells.map(({ assignment, submission }) => {
                    const late = submission && assignment.dueAt ? submission.submittedAt > assignment.dueAt : false;
                    return (
                      <td key={assignment.id} className="px-2 py-2 font-mono text-[13px]">
                        {submission?.score != null ? (
                          <span className={cn(gradeTone((submission.score / assignment.points) * 100) === "bad" && "text-red")}>{submission.score}</span>
                        ) : submission ? (
                          <span className="text-accent" title="Turned in, not graded">
                            •
                          </span>
                        ) : assignment.dueAt && assignment.dueAt.getTime() < Date.now() ? (
                          <span className="text-red" title="Missing">
                            —
                          </span>
                        ) : (
                          <span className="text-ink-3">·</span>
                        )}
                        {late ? <span className="ml-1 text-[10px] uppercase text-amber">late</span> : null}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono text-[13px]">
                    <GradeValue v={r.pct} /> <span className="text-ink-3">{gradeLetter(r.pct)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2 font-mono text-[11px] text-ink-3">• turned in, not graded &nbsp; — missing &nbsp; · not due yet</p>
        </Paper>
      )}
    </>
  );
}
