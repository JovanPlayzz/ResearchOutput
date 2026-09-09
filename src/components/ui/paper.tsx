import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A sheet of paper: the standard card surface. */
export function Paper({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[8px] border border-line bg-paper-2 shadow-paper", className)}
      {...props}
    />
  );
}

/** A manila folder: a tab with a title, and a body. */
export function Folder({
  tab,
  aside,
  children,
  className,
  bodyClassName,
}: {
  tab: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("relative", className)}>
      <div className="flex items-end justify-between gap-3 pr-1">
        <div className="folder-tab">{tab}</div>
        {aside ? <div className="pb-1.5">{aside}</div> : null}
      </div>
      <div className={cn("folder-body", bodyClassName)}>{children}</div>
    </section>
  );
}

const stampTones = {
  red: "text-red",
  green: "text-green",
  amber: "text-amber",
  ink: "text-ink-2",
  accent: "text-accent",
} as const;

export function Stamp({ tone = "ink", className, children }: { tone?: keyof typeof stampTones; className?: string; children: ReactNode }) {
  return <span className={cn("stamp", stampTones[tone], className)}>{children}</span>;
}

const tagTones = {
  neutral: "bg-paper-3 text-ink-2 border-line",
  accent: "bg-accent-soft text-accent border-accent/20",
  red: "bg-red-soft text-red border-red/20",
  green: "bg-green-soft text-green border-green/20",
  amber: "bg-amber-soft text-amber border-amber/25",
  manila: "bg-manila text-ink border-manila-2",
} as const;

export function Tag({ tone = "neutral", className, children }: { tone?: keyof typeof tagTones; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em]",
        tagTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A small coloured square that identifies a class. */
export function ClassDot({ color, className, size = 10 }: { color: string | null | undefined; className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-[2px]", className)}
      style={{ width: size, height: size, backgroundColor: `var(--c-${color ?? "slate"})` }}
    />
  );
}

export function classColorVar(color: string | null | undefined) {
  return `var(--c-${color ?? "slate"})`;
}

/** Section heading with an optional right-hand slot. */
export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-[1.35rem] text-ink">{children}</h2>
      {aside ? <div className="text-sm text-ink-3">{aside}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-dashed border-line-2", className)} />;
}
