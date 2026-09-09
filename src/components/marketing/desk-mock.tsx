import { Check, Pin } from "lucide-react";
import { Stamp, Tag } from "@/components/ui/paper";

/**
 * A little desk scene made from the portal's real building blocks:
 * a section folder with a timetable, an announcement, and a graded paper.
 * Static, so the landing page never depends on the database.
 */
export function DeskMock() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] select-none sm:h-[460px]" aria-hidden>
      {/* Section folder with a timetable */}
      <div className="rise absolute left-0 top-6 w-[78%] -rotate-[1.5deg]" style={{ animationDelay: "120ms" }}>
        <div className="flex items-end">
          <div className="folder-tab">12-CORE</div>
        </div>
        <div className="folder-body p-3">
          <div className="grid grid-cols-[34px_repeat(3,1fr)] gap-1 text-[10px]">
            <div />
            {["Mon", "Tue", "Wed"].map((d) => (
              <div key={d} className="text-center font-mono uppercase tracking-[0.12em] text-ink-3">
                {d}
              </div>
            ))}
            {[
              ["7:30", ["General Biology 2", "", "General Biology 2"], "green"],
              ["8:30", ["Basic Calculus", "", "Basic Calculus"], "blue"],
              ["9:45", ["", "Creative Writing", ""], "rose"],
              ["10:45", ["", "Filipino", ""], "amber"],
            ].map(([time, cells, color]) => (
              <div key={time as string} className="contents">
                <div className="pt-1 font-mono text-[9.5px] text-ink-3">{time as string}</div>
                {(cells as string[]).map((c, i) => (
                  <div
                    key={i}
                    className={c ? "rounded-[3px] border border-line border-l-[3px] px-1.5 py-1 leading-tight" : "rounded-[3px] border border-dashed border-line/70"}
                    style={c ? { borderLeftColor: `var(--c-${color})`, backgroundColor: `color-mix(in srgb, var(--c-${color}) 14%, var(--paper-2))` } : undefined}
                  >
                    {c ? <span className="block truncate font-semibold">{c}</span> : <span className="block h-4" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement */}
      <div className="rise absolute right-0 top-0 w-[58%] rotate-[2deg] rounded-[8px] border border-line-2 bg-paper-2 shadow-paper-lg" style={{ animationDelay: "260ms" }}>
        <div className="flex items-start gap-2 px-3 pt-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red" />
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap gap-1">
              <Tag tone="manila">
                <Pin size={10} /> Pinned
              </Tag>
              <Tag tone="red">Urgent</Tag>
            </div>
            <p className="font-display text-[1.05rem] leading-tight">Midterm schedule is out</p>
            <p className="text-[10.5px] text-ink-3">Principal Marquez · 1 hr ago</p>
          </div>
        </div>
        <div className="ruled margin-line mt-1 pb-2 pl-11 pr-3 text-[11px] text-ink-2" style={{ ["--rule-h" as string]: "1.25rem" }}>
          Monday to Wednesday next week. Bring your ID and two pencils.
        </div>
        <div className="flex items-center gap-1 border-t border-dashed border-line px-3 py-1.5 text-[10.5px] text-ink-3">
          <Check size={11} /> Mark as read
        </div>
      </div>

      {/* Graded paper */}
      <div className="rise absolute bottom-0 right-[6%] w-[46%] -rotate-[3deg] rounded-[6px] border border-line bg-paper-2 p-3 shadow-paper-lg" style={{ animationDelay: "400ms" }}>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">Lab report · 100 pts</p>
        <p className="mt-0.5 font-display text-[1rem] leading-tight">Onion root tip observation</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="score-circle text-red" style={{ width: "2.4rem", height: "2.4rem", fontSize: "0.95rem" }}>
            96
          </span>
          <div className="min-w-0">
            <Stamp tone="green">Graded</Stamp>
            <p className="mt-1 truncate text-[10.5px] italic text-ink-2">&ldquo;Clear sketches. Well done.&rdquo;</p>
          </div>
        </div>
      </div>

      {/* Sticky note */}
      <div className="rise sticky-note absolute bottom-6 left-[4%] w-[150px] rounded-[3px] px-3 py-2 text-[11px] leading-snug" style={{ animationDelay: "520ms" }}>
        <p className="font-semibold">To do</p>
        <p className="mt-0.5">☑ Buy index cards</p>
        <p>☐ Review derivatives</p>
      </div>
    </div>
  );
}
