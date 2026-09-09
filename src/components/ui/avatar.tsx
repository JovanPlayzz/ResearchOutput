import { cn, initials } from "@/lib/utils";

const palette = ["blue", "red", "green", "amber", "violet", "teal", "rose", "slate"];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function Avatar({ name, seed, size = 32, className }: { name: string; seed?: string; size?: number; className?: string }) {
  const color = colorFor(seed ?? name);
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-display text-paper-2", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundColor: `var(--c-${color})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
