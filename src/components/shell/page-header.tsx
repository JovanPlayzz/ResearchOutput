import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line-2 pb-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{eyebrow}</p> : null}
        <h1 className="text-[2rem] leading-none sm:text-[2.35rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-prose text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
