"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

/**
 * Which quarter the portal shows. Defaults to the school's current quarter;
 * picking another one is remembered in a cookie so every page follows it.
 */
export function QuarterPicker({ viewing, current, schoolYear }: { viewing: number; current: number; schoolYear: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(q: number) {
    document.cookie = `view_quarter=${q}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{schoolYear ? `S.Y. ${schoolYear}` : "School year"}</p>
      <div className="relative mt-1">
        <select
          value={viewing}
          onChange={(e) => choose(Number(e.target.value))}
          aria-label="Quarter to view"
          className="h-8 w-full appearance-none rounded-[5px] border border-line-2 bg-paper-2 pl-2.5 pr-7 font-mono text-[12px] text-ink focus:border-accent focus:outline-none"
        >
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              Quarter {q} · Sem {q <= 2 ? 1 : 2}
              {q === current ? " · now" : ""}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-3">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
        </span>
      </div>
      {viewing !== current ? (
        <button type="button" onClick={() => choose(current)} className="mt-1 text-[11px] text-accent underline">
          Back to the current quarter (Q{current})
        </button>
      ) : null}
    </div>
  );
}
