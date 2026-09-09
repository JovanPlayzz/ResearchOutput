import Link from "next/link";
import { ClipboardList, FileText, FlaskConical, PenLine, ScrollText } from "lucide-react";
import type { WorkWithStatus } from "@/lib/queries";
import { cn, dueInfo } from "@/lib/utils";
import { ClassDot, Stamp, Tag } from "@/components/ui/paper";

export const workKindLabel = {
  assignment: "Assignment",
  quiz: "Quiz",
  project: "Project",
  activity: "Activity",
  exam: "Exam",
} as const;

const kindIcon = {
  assignment: FileText,
  quiz: PenLine,
  project: FlaskConical,
  activity: ClipboardList,
  exam: ScrollText,
} as const;

const dueTone = {
  none: "text-ink-3",
  overdue: "text-red",
  today: "text-red",
  soon: "text-amber",
  later: "text-ink-3",
} as const;

export function WorkRow({ w, viewerRole, showClass = false, showQuarter = false }: { w: WorkWithStatus; viewerRole: string; showClass?: boolean; showQuarter?: boolean }) {
  const Icon = kindIcon[w.kind];
  const due = dueInfo(w.dueAt);
  const s = w.submission;

  let status: React.ReactNode = null;
  if (viewerRole === "student") {
    if (s?.score != null) {
      status = (
        <Stamp tone="green">
          {s.score}/{w.points}
        </Stamp>
      );
    } else if (s) {
      status = <Stamp tone="accent">Turned in</Stamp>;
    } else if (due.state === "overdue") {
      status = <Stamp tone="red">Missing</Stamp>;
    }
  } else {
    status = (
      <span className="text-right font-mono text-[12px] leading-tight text-ink-3">
        {w.submittedCount}/{w.studentCount} in
        {w.ungradedCount > 0 ? <span className="block text-amber">{w.ungradedCount} to grade</span> : null}
      </span>
    );
  }

  return (
    <li>
      <Link href={`/classes/${w.classroomId}/work/${w.id}`} className="group flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-[background-color,transform] hover:translate-x-0.5 hover:bg-paper-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] border border-line bg-paper text-ink-2">
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{w.title}</span>
            <Tag>{workKindLabel[w.kind]}</Tag>
            {showQuarter ? <Tag tone="manila">Q{w.quarter}</Tag> : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px]">
            {showClass ? (
              <span className="inline-flex items-center gap-1 text-ink-2">
                <ClassDot color={w.classColor} size={8} /> {w.className}
                {viewerRole !== "student" ? <span className="text-ink-3">· {w.sectionLabel}</span> : null}
              </span>
            ) : null}
            <span className={cn(dueTone[due.state])}>{due.label}</span>
            <span className="text-ink-3">· {w.points} pts</span>
          </span>
        </span>
        {status}
      </Link>
    </li>
  );
}
