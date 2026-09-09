import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ruled margin-line rounded-[6px] border border-dashed border-line-2 py-6 pl-16 pr-6", className)}>
      <p className="font-display text-xl italic text-ink-2">{title}</p>
      {children ? <p className="text-ink-3">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
