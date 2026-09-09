"use client";

import Link from "next/link";
import { useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import type { TimetableSlot } from "@/lib/queries";
import { DAY_SHORT, SCHOOL_DAYS, fmtMinutes, fmtRange } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty";
import { NowLine } from "./now-line";

const HOUR_PX = 52;
const PAD = 12; // room above the first hour label
const SWIPE_PX = 48;

/**
 * A weekly timetable grid. Pass the slots for one section (show teachers)
 * or one teacher (show sections). On phones it shows one day at a time,
 * with day tabs above and a sideways swipe to move between days.
 */
export function Timetable({
  slots,
  detail = "teacher",
  emptyTitle = "No schedule yet.",
  emptyText,
  linkClasses = true,
  className,
}: {
  slots: TimetableSlot[];
  detail?: "teacher" | "section" | "none";
  emptyTitle?: string;
  emptyText?: string;
  linkClasses?: boolean;
  className?: string;
}) {
  const today = new Date().getDay();
  const extraDays = [...new Set(slots.map((s) => s.day))].filter((d) => !SCHOOL_DAYS.includes(d));
  const days = [...SCHOOL_DAYS, ...extraDays.sort()];
  // Phone view: the day being shown. Starts on today when it is a school day.
  const [day, setDay] = useState(() => (days.includes(today) ? today : days[0]));
  const touch = useRef<{ x: number; y: number } | null>(null);

  if (slots.length === 0) return <EmptyState title={emptyTitle}>{emptyText}</EmptyState>;

  const rangeStart = Math.min(7 * 60, ...slots.map((s) => Math.floor(s.startMin / 60) * 60));
  const rangeEnd = Math.max(16 * 60, ...slots.map((s) => Math.ceil(s.endMin / 60) * 60));
  const hours: number[] = [];
  for (let m = rangeStart; m < rangeEnd; m += 60) hours.push(m);
  const height = ((rangeEnd - rangeStart) / 60) * HOUR_PX + PAD * 2;
  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`;

  function step(dir: 1 | -1) {
    const i = days.indexOf(day);
    const next = days[i + dir];
    if (next != null) setDay(next);
  }
  function onTouchStart(e: ReactTouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: ReactTouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || !window.matchMedia("(max-width: 47.99rem)").matches) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    step(dx < 0 ? 1 : -1);
  }

  return (
    <div className={cn("timetable overflow-hidden rounded-[8px] border border-line bg-paper-2 shadow-paper md:overflow-x-auto", className)}>
      {/* Phones: day tabs */}
      <div role="tablist" aria-label="Day" className="flex gap-1 border-b border-line-2 bg-paper-3 p-1.5 md:hidden">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === day}
            onClick={() => setDay(d)}
            className={cn(
              "relative flex-1 rounded-[5px] py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
              d === day ? "bg-paper-2 text-ink shadow-paper" : "text-ink-3 active:bg-paper-2/60",
            )}
          >
            {DAY_SHORT[d]}
            {d === today ? <span aria-label="today" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red" /> : null}
          </button>
        ))}
      </div>

      <div className="md:min-w-[640px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Desktop: day headings */}
        <div className="hidden border-b border-line-2 bg-paper-3 md:grid" style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d) => (
            <div key={d} className={cn("px-2 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.12em]", d === today ? "text-red" : "text-ink-3")}>
              {DAY_SHORT[d]}
              {d === today ? <span className="ml-1 normal-case tracking-normal">· today</span> : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[56px_minmax(0,1fr)] md:grid-cols-(--tt-cols)" style={{ ["--tt-cols" as string]: cols }}>
          {/* time gutter */}
          <div className="relative border-r border-line" style={{ height }}>
            {hours.map((m) => (
              <span key={m} className="absolute right-1.5 -translate-y-1/2 font-mono text-[10.5px] text-ink-3" style={{ top: PAD + ((m - rangeStart) / 60) * HOUR_PX }}>
                {fmtMinutes(m).replace(":00", "")}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d}
              data-day={d}
              className={cn(
                "relative md:border-r md:border-line md:last:border-r-0",
                d === today && "bg-manila/15",
                d !== day && "hidden md:block",
                d === day && "rise md:animate-none",
              )}
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
                backgroundPosition: `0 ${PAD}px`,
              }}
            >
              <NowLine day={d} rangeStart={rangeStart} rangeEnd={rangeEnd} hourPx={HOUR_PX} pad={PAD} />
              {slots
                .filter((s) => s.day === d)
                .map((s) => {
                  const top = PAD + ((s.startMin - rangeStart) / 60) * HOUR_PX;
                  const h = ((s.endMin - s.startMin) / 60) * HOUR_PX;
                  const sub = detail === "teacher" ? s.teacherName : detail === "section" ? s.sectionLabel : null;
                  const inner = (
                    <>
                      <span className="block truncate text-[12px] font-semibold leading-tight">{s.className}</span>
                      {sub ? <span className="block truncate text-[11px] leading-tight text-ink-2">{sub}</span> : null}
                      <span className="block truncate font-mono text-[10px] leading-tight text-ink-3">
                        {fmtRange(s.startMin, s.endMin)}
                        {s.room ? ` · ${s.room}` : ""}
                      </span>
                    </>
                  );
                  const style = {
                    top: top + 1,
                    height: Math.max(h - 3, 22),
                    borderLeftColor: `var(--c-${s.classColor})`,
                    backgroundColor: `color-mix(in srgb, var(--c-${s.classColor}) 14%, var(--paper-2))`,
                  };
                  const cls = "absolute left-1 right-1 overflow-hidden rounded-[4px] border border-line border-l-[3px] px-1.5 py-1 shadow-paper transition-transform hover:z-10 hover:-translate-y-px md:left-1 md:right-1";
                  return linkClasses ? (
                    <Link key={s.id} href={`/classes/${s.classroomId}`} className={cls} style={style} title={`${s.className} · ${fmtRange(s.startMin, s.endMin)}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={s.id} className={cls} style={style}>
                      {inner}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Today's slots as a simple list, for dashboards. */
export function TodayList({ slots, detail = "teacher" }: { slots: TimetableSlot[]; detail?: "teacher" | "section" }) {
  const today = new Date().getDay();
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const todays = slots.filter((s) => s.day === today);
  if (todays.length === 0) {
    return <p className="text-sm text-ink-3">{SCHOOL_DAYS.includes(today) ? "No classes scheduled today." : "No classes on weekends. Enjoy the day."}</p>;
  }
  return (
    <ul className="divide-y divide-dashed divide-line">
      {todays.map((s) => {
        const state = now >= s.endMin ? "done" : now >= s.startMin ? "now" : "later";
        return (
          <li key={s.id} className={cn("flex items-center gap-3 py-2", state === "done" && "opacity-55")}>
            <span className="w-[76px] shrink-0 font-mono text-[11px] leading-tight text-ink-3">
              {fmtMinutes(s.startMin)}
              <span className="block">{fmtMinutes(s.endMin)}</span>
            </span>
            <span aria-hidden className="h-8 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: `var(--c-${s.classColor})` }} />
            <span className="min-w-0 flex-1">
              <Link href={`/classes/${s.classroomId}`} className="block truncate text-sm font-semibold hover:underline">
                {s.className}
              </Link>
              <span className="block truncate text-[12px] text-ink-3">
                {detail === "teacher" ? s.teacherName : s.sectionLabel}
                {s.room ? ` · ${s.room}` : ""}
              </span>
            </span>
            {state === "now" ? <span className="stamp stamp-now text-red">Now</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
