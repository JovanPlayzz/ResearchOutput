"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CalendarKind = { key: string; label: string; color: string };

/**
 * Lays out the month grid and its sidebar, with the legend under the grid.
 * Each legend item is a toggle: switch a kind off and its chips disappear from
 * the grid and the upcoming list, which keeps a busy month readable.
 */
export function CalendarView({ kinds, calendar, sidebar }: { kinds: CalendarKind[]; calendar: ReactNode; sidebar: ReactNode }) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={cn("grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]", ...[...hidden].map((k) => `hide-${k}`))}>
      <div className="min-w-0">
        {calendar}
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 px-1">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Show</span>
          {kinds.map((k) => {
            const off = hidden.has(k.key);
            return (
              <button
                key={k.key}
                type="button"
                onClick={() => toggle(k.key)}
                aria-pressed={!off}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors",
                  off ? "border-line bg-transparent text-ink-3 line-through decoration-ink-3/60" : "border-line-2 bg-paper-2 text-ink-2 hover:bg-paper-3",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-[2px]", off && "opacity-40")} style={{ backgroundColor: k.color }} />
                {k.label}
              </button>
            );
          })}
          {hidden.size ? (
            <button type="button" onClick={() => setHidden(new Set())} className="ml-1 text-[12px] text-accent underline">
              Show all
            </button>
          ) : null}
        </div>
      </div>
      <aside className="space-y-6">{sidebar}</aside>
    </div>
  );
}
