import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { calendarItems, postingAudiences, type CalendarItem } from "@/lib/queries";
import { addDays, cn, endOfDay, fmtDate, isSameDay, startOfDay, toInputDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Disclosure } from "@/components/ui/disclosure";
import { Paper, SectionTitle } from "@/components/ui/paper";
import { CalendarView } from "@/components/portal/calendar-view";
import { EventForm } from "@/components/portal/event-form";
import { EventRow, eventColor } from "@/components/portal/event-row";

export const metadata: Metadata = { title: "Calendar" };

function parseMonth(m?: string) {
  const match = m?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  if (!match) return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function occursOn(e: CalendarItem, day: Date) {
  const s = startOfDay(day).getTime();
  const eEnd = endOfDay(day).getTime();
  const start = e.startsAt.getTime();
  const end = (e.endsAt ?? e.startsAt).getTime();
  return start <= eEnd && end >= s;
}

const KINDS = [
  { key: "school", label: "School", color: "var(--accent)" },
  { key: "holiday", label: "Holiday", color: "var(--green)" },
  { key: "exam", label: "Exam", color: "var(--red)" },
  { key: "activity", label: "Activity", color: "var(--amber)" },
  { key: "meeting", label: "Meeting", color: "var(--manila-2)" },
  { key: "class", label: "Class session", color: "var(--c-slate)" },
  { key: "due", label: "Due date", color: "var(--c-slate)" },
];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const user = await requireUser();
  const audiences = await postingAudiences(user);

  const monthStart = parseMonth(m);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay());
  const items = await calendarItems(user, startOfDay(gridStart), endOfDay(gridEnd));

  const today = new Date();
  const upcoming = await calendarItems(user, startOfDay(today), endOfDay(addDays(today, 30)));

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const prev = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const calendar = (
    <Paper className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line-2 bg-paper-3">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === monthStart.getMonth();
          const isToday = isSameDay(day, today);
          const dayItems = items.filter((e) => occursOn(e, day));
          return (
            <div
              key={i}
              className={cn("min-h-[56px] border-b border-r border-line p-1 sm:min-h-[108px] sm:p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-paper/60 text-ink-3")}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={cn("grid h-6 w-6 place-items-center rounded-full font-mono text-[12px]", isToday ? "bg-red text-paper-2" : inMonth ? "text-ink-2" : "text-ink-3")}>
                  {day.getDate()}
                </span>
              </div>
              {/* Phones: one dot per item. */}
              <div className="flex flex-wrap gap-1 sm:hidden">
                {dayItems.slice(0, 8).map((e) => (
                  <span key={e.id} data-kind={e.kind} className={cn("h-2 w-2 rounded-full", e.kind === "due" && "ring-1 ring-inset ring-paper-2")} style={{ backgroundColor: eventColor(e) }} title={e.title} />
                ))}
              </div>
              <ul className="hidden space-y-0.5 sm:block">
                {dayItems.map((e) => {
                  const chip = (
                    <span
                      className={cn("block truncate rounded-[3px] border-l-2 bg-paper-3 px-1.5 py-0.5 text-[11.5px] leading-tight", e.kind === "due" && "border-dashed")}
                      style={{ borderLeftColor: eventColor(e) }}
                      title={e.title}
                    >
                      {e.kind === "due" ? "Due: " : ""}
                      {e.title}
                    </span>
                  );
                  return (
                    <li key={e.id} data-kind={e.kind}>
                      {e.href ? <Link href={e.href}>{chip}</Link> : chip}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Paper>
  );

  const sidebar = (
    <Paper className="p-4">
      <SectionTitle>Next 30 days</SectionTitle>
      {upcoming.length ? (
        <ul className="divide-y divide-dashed divide-line">
          {upcoming.slice(0, 12).map((e) => (
            <EventRow key={e.id} e={e} viewer={user} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">Nothing scheduled in the next month.</p>
      )}
    </Paper>
  );

  return (
    <>
      <PageHeader
        eyebrow="School calendar"
        title={fmtDate(monthStart, "month")}
        description="School events, holidays, exams, section events, and due dates for your subjects. Use the legend to hide what you don't need."
        actions={
          <>
            <div className="inline-flex overflow-hidden rounded-[5px] border border-line-2 bg-paper-2">
              <Link href={`/calendar?m=${monthKey(prev)}`} className="inline-flex h-9 w-9 items-center justify-center hover:bg-paper-3" aria-label="Previous month">
                <ChevronLeft size={16} />
              </Link>
              <Link href="/calendar" className="inline-flex h-9 items-center border-x border-line-2 px-3 text-sm hover:bg-paper-3">
                Today
              </Link>
              <Link href={`/calendar?m=${monthKey(next)}`} className="inline-flex h-9 w-9 items-center justify-center hover:bg-paper-3" aria-label="Next month">
                <ChevronRight size={16} />
              </Link>
            </div>
            {audiences.length ? (
              <Disclosure label="Add event" icon={<Plus size={15} />} panelClassName="mt-4">
                <EventForm audiences={audiences} defaultDate={toInputDate(today)} />
              </Disclosure>
            ) : null}
          </>
        }
      />

      <CalendarView kinds={KINDS} calendar={calendar} sidebar={sidebar} />
    </>
  );
}
