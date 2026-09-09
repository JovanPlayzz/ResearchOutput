import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[6px] bg-ink text-paper-2">
            <GraduationCap size={17} />
          </span>
          <span className="font-display text-[1.25rem]">Homeroom</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">{children}</main>
      <footer className="px-6 py-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Student portal · classes, announcements, calendar, grades
      </footer>
    </div>
  );
}
