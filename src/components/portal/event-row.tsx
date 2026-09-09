import Link from "next/link";
import { MapPin, Trash2 } from "lucide-react";
import { deleteEvent } from "@/actions/events";
import type { CalendarItem } from "@/lib/queries";
import { cn, fmtTime, isSameDay } from "@/lib/utils";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ClassDot, Tag } from "@/components/ui/paper";

export const eventKindLabel: Record<CalendarItem["kind"], string> = {
  school: "School",
  holiday: "Holiday",
  exam: "Exam",
  activity: "Activity",
  meeting: "Meeting",
  class: "Class",
  due: "Due",
};

export const eventKindTone: Record<CalendarItem["kind"], "accent" | "green" | "red" | "amber" | "neutral" | "manila"> = {
  school: "accent",
  holiday: "green",
  exam: "red",
  activity: "amber",
  meeting: "manila",
  class: "neutral",
  due: "red",
};

/** CSS colour used for calendar chips. */
export function eventColor(e: CalendarItem) {
  if (e.kind === "class" || e.kind === "due") return `var(--c-${e.classColor ?? "slate"})`;
  const map: Record<string, string> = {
    school: "var(--accent)",
    holiday: "var(--green)",
    exam: "var(--red)",
    activity: "var(--amber)",
    meeting: "var(--manila-2)",
  };
  return map[e.kind] ?? "var(--ink-3)";
}

export function EventRow({ e, viewer, showDate = true }: { e: CalendarItem; viewer: { id: string; role: string }; showDate?: boolean }) {
  const canDelete = e.kind !== "due" && (viewer.role === "admin" || e.createdBy === viewer.id);
  const multiDay = e.endsAt && !isSameDay(e.startsAt, e.endsAt);
  const when = e.allDay
    ? multiDay
      ? `${e.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.endsAt!.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "All day"
    : `${fmtTime(e.startsAt)}${e.endsAt ? ` – ${fmtTime(e.endsAt)}` : ""}`;

  const title = e.href ? (
    <Link href={e.href} className="font-semibold text-ink hover:underline hover:underline-offset-4">
      {e.title}
    </Link>
  ) : (
    <span className="font-semibold text-ink">{e.title}</span>
  );

  return (
    <li data-kind={e.kind} className="flex items-start gap-3 py-2.5">
      {showDate ? (
        <div className="w-11 shrink-0 text-center leading-none">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {e.startsAt.toLocaleDateString("en-US", { month: "short" })}
          </div>
          <div className="mt-0.5 font-display text-[1.6rem]">{e.startsAt.getDate()}</div>
        </div>
      ) : null}
      <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: eventColor(e) }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {title}
          <Tag tone={eventKindTone[e.kind]}>{e.kind === "due" ? "Due" : eventKindLabel[e.kind]}</Tag>
        </div>
        <p className={cn("text-[13px] text-ink-3")}>
          {when}
          {e.className ? (
            <>
              {" · "}
              <ClassDot color={e.classColor} size={7} className="mr-1 align-baseline" />
              {e.className}
            </>
          ) : e.sectionLabel ? (
            <>
              {" · "}
              {e.sectionLabel}
            </>
          ) : null}
          {e.location ? (
            <>
              {" · "}
              <MapPin size={11} className="mr-0.5 inline align-[-1px]" />
              {e.location}
            </>
          ) : null}
        </p>
        {e.description ? <p className="mt-1 text-[14px] text-ink-2">{e.description}</p> : null}
      </div>
      {canDelete ? (
        <form action={deleteEvent}>
          <input type="hidden" name="eventId" value={e.id} />
          <ConfirmButton message="Remove this event from the calendar?" variant="ghost" size="sm" aria-label="Delete event" className="text-ink-3 hover:text-red">
            <Trash2 size={14} />
          </ConfirmButton>
        </form>
      ) : null}
    </li>
  );
}
