import type { ReactNode } from "react";

/** A word with a hand-drawn red underline that draws itself in. */
export function Scribble({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg className="scribble pointer-events-none absolute -bottom-1 left-0 h-[0.3em] w-full" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
        <path
          d="M2 6 C 18 2, 34 9, 50 5 S 82 2, 98 7"
          fill="none"
          stroke="var(--red)"
          strokeWidth="2.4"
          strokeLinecap="round"
          pathLength={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
