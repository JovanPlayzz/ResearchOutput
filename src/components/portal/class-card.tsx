import Link from "next/link";
import { Clock, DoorOpen, Users } from "lucide-react";
import type { ClassroomSummary } from "@/lib/queries";
import { classColorVar } from "@/components/ui/paper";

/**
 * One class = one subject taught to one section.
 * Teachers see the section on the card; students see the teacher.
 */
export function ClassCard({ c, viewerRole }: { c: ClassroomSummary; viewerRole: string }) {
  const room = c.slots.find((s) => s.room)?.room;
  return (
    <Link
      href={`/classes/${c.id}`}
      className="group relative block rounded-[8px] border border-line bg-paper-2 shadow-paper transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-line-2 hover:bg-paper-3"
    >
      <span aria-hidden className="absolute left-3 right-3 top-0 h-[5px] rounded-b-[3px]" style={{ backgroundColor: classColorVar(c.color) }} />
      <div className="px-4 pb-4 pt-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{viewerRole === "student" ? c.teacherDepartment ?? "Subject" : c.sectionLabel}</p>
        <h3 className="mt-1 text-[1.35rem] leading-tight group-hover:underline group-hover:underline-offset-4">{c.name}</h3>
        <p className="mt-1 text-[14px] text-ink-2">{viewerRole === "student" ? c.teacherName : `${c.teacherName} · ${c.sectionLabel}`}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> {c.studentCount} {c.studentCount === 1 ? "student" : "students"}
          </span>
          {room ? (
            <span className="inline-flex items-center gap-1">
              <DoorOpen size={13} /> {room}
            </span>
          ) : null}
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink-3">
          <Clock size={13} /> {c.scheduleText || "No schedule yet"}
        </p>
      </div>
    </Link>
  );
}
