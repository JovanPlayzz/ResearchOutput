import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = { label: ReactNode; href?: string };

/** A trail back up the folders: "Classes › General Biology 2 · 12-CORE › Classwork". */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-0.5 text-[13px] text-ink-3">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="inline-flex min-w-0 items-center gap-0.5">
            {i > 0 ? <ChevronRight size={13} className="shrink-0 opacity-60" aria-hidden /> : null}
            {it.href && !last ? (
              <Link href={it.href} className="max-w-[28ch] truncate rounded-[4px] px-1.5 py-0.5 transition-colors hover:bg-paper-3 hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span className="max-w-[36ch] truncate px-1.5 py-0.5 text-ink-2" aria-current={last ? "page" : undefined}>
                {it.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
