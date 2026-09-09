import { cn, gradeTone } from "@/lib/utils";

const toneClass = { good: "text-green", ok: "text-accent", warn: "text-amber", bad: "text-red", muted: "text-ink-3" } as const;

/**
 * A percentage grade: the rounded whole number in colour, and the exact decimal
 * in small gray beside it only when there is one.
 */
export function GradeValue({ v, className, big = false }: { v: number | null; className?: string; big?: boolean }) {
  if (v == null) return <span className={cn("font-mono text-ink-3", className)}>—</span>;
  const rounded = Math.round(v);
  const hasDecimal = Math.abs(v - rounded) > 0.001;
  return (
    <span className={cn("inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span className={cn(toneClass[gradeTone(v)], big ? "font-display text-[1.6rem] leading-none" : "font-mono")}>{rounded}%</span>
      {hasDecimal ? <span className={cn("font-mono text-ink-3", big ? "text-[12px]" : "text-[0.78em]")}>{v.toFixed(1)}</span> : null}
    </span>
  );
}
