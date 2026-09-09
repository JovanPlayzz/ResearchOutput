import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  FolderOpen,
  GraduationCap,
  Megaphone,
  PenLine,
  Shield,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { DeskMock } from "@/components/marketing/desk-mock";

export const metadata: Metadata = {
  title: "StapL · one desk for the whole school",
  description: "A student portal that keeps sections, subjects, timetables, classwork, grades, and announcements in one place.",
};

const features = [
  {
    icon: Megaphone,
    title: "Announcements that stay found",
    body: "School-wide, per section, or per subject. Pinned and urgent ones float to the top, and everyone can see what they haven't read yet.",
  },
  {
    icon: FolderOpen,
    title: "Sections as folders",
    body: "Students belong to a section like 12-CORE. Open the folder and you see its students, adviser, subjects, and timetable.",
  },
  {
    icon: CalendarRange,
    title: "A timetable that can't clash",
    body: "Every subject has its days, times, and room. A slot that overlaps the section's or the teacher's schedule is refused on the spot.",
  },
  {
    icon: PenLine,
    title: "Classwork, turned in and graded",
    body: "Assignments, quizzes, and projects with due dates. Students turn in text, links, or files. Teachers score with feedback.",
  },
  {
    icon: GraduationCap,
    title: "Grades by quarter",
    body: "Every subject rolls up per quarter, per semester, and overall. Students see the same numbers their teachers do.",
  },
  {
    icon: CalendarDays,
    title: "One calendar, filtered your way",
    body: "Exams, holidays, activities, class sessions, and due dates on one month view. Hide any kind with a click.",
  },
];

const roles = [
  {
    icon: Shield,
    name: "Admins",
    line: "own the structure",
    points: ["Create the school and sections", "File students, name advisers", "Set timetables and the current quarter", "Post to the whole school"],
  },
  {
    icon: UserRound,
    name: "Teachers",
    line: "own the teaching",
    points: ["Add a subject for a section", "Post work and grade it", "Share materials and stream posts", "See their own weekly load"],
  },
  {
    icon: BookOpen,
    name: "Students",
    line: "just learn",
    points: ["Pick their section once", "See subjects, schedule, and due work", "Turn in and get feedback", "Keep a private to-do list"],
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);
  const primaryHref = signedIn ? (user!.schoolId ? "/dashboard" : "/onboarding") : "/register";
  const primaryLabel = signedIn ? "Open my folders" : "Get started";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line-2/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[6px] bg-ink text-paper-2">
              <GraduationCap size={17} />
            </span>
            <span className="font-display text-[1.3rem]">StapL</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex" aria-label="Sections of this page">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#roles" className="hover:text-ink">
              Who it&rsquo;s for
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? null : (
              <Link href="/login" className={buttonClass("ghost", "md", "hidden sm:inline-flex")}>
                Sign in
              </Link>
            )}
            <Link href={primaryHref} className={buttonClass("primary", "md")}>
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1120px] items-center gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pb-24 lg:pt-20">
            <div className="rise">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">A student portal for one school</p>
              <h1 className="text-[2.6rem] leading-[1.05] sm:text-[3.4rem] lg:text-[3.9rem]">
                Every folder your school needs, <em className="text-red">on one desk.</em>
              </h1>
              <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-ink-2">
                Announcements that don&rsquo;t get buried in a group chat. A timetable that can&rsquo;t clash. Classwork, grades by quarter, and a
                calendar, for admins, teachers, and students in the same place.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={primaryHref} className={buttonClass("primary", "lg")}>
                  {primaryLabel} <ArrowRight size={16} />
                </Link>
                {signedIn ? null : (
                  <Link href="/login" className={buttonClass("secondary", "lg")}>
                    Sign in
                  </Link>
                )}
              </div>
              <p className="mt-4 text-[13px] text-ink-3">Runs on one laptop. No accounts with anyone else, nothing leaves the school.</p>
            </div>
            <div className="hidden sm:block">
              <DeskMock />
            </div>
          </div>
        </section>

        {/* The problem, on a sticky note */}
        <section className="border-y border-line-2 bg-paper-4/60">
          <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1120px] gap-6 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
            <div>
              <h2 className="text-[1.75rem] leading-tight sm:text-[2rem]">Schools already have all the information. It&rsquo;s just in five places.</h2>
              <p className="mt-3 max-w-[38rem] text-ink-2">
                The exam schedule is a photo in a group chat. The timetable is a printout on the wall. Grades live in a spreadsheet only the
                teacher can open. StapL puts each of those in a folder that everyone who needs it can open, and nothing else.
              </p>
            </div>
            <div className="sticky-note rounded-[3px] px-4 py-3 text-[14px] leading-snug md:justify-self-end">
              <p className="font-semibold">Before</p>
              <p className="mt-1 text-ink-2 line-through decoration-red/70">&ldquo;Did anyone screenshot the exam sched?&rdquo;</p>
              <p className="mt-2 font-semibold">After</p>
              <p className="mt-1">Pinned on the board. Read by 27 of 30.</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:py-20">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">What&rsquo;s in the folders</p>
          <h2 className="max-w-[30rem] text-[2rem] leading-tight sm:text-[2.4rem]">Six things a school actually uses, done properly.</h2>
          <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="rounded-[8px] border border-line bg-paper-2 p-5 shadow-paper transition-transform hover:-translate-y-0.5">
                  <span className="grid h-9 w-9 place-items-center rounded-[6px] border border-line bg-paper text-ink-2">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 text-[1.25rem] leading-tight">{f.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{f.body}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <CheckSquare size={13} /> Also: personal to-do lists
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={13} /> class materials
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen size={13} /> teachers grouped by department
            </span>
            <span>· light and dark mode</span>
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-line-2 bg-paper-2/60">
          <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:py-20">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">Setting up</p>
            <h2 className="text-[2rem] leading-tight sm:text-[2.4rem]">Three steps, then it runs itself.</h2>
            <ol className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-3">
              {[
                {
                  n: "1",
                  who: "The admin",
                  title: "creates the school and its sections.",
                  body: "One school code to share. Sections like 12-CORE get an adviser. That's the whole structure.",
                },
                {
                  n: "2",
                  who: "Teachers",
                  title: "add the subjects they teach.",
                  body: "Pick the section, name the subject, set the days and times. The roster is already there: it's the section.",
                },
                {
                  n: "3",
                  who: "Students",
                  title: "pick their section. Done.",
                  body: "Their subjects, schedule, announcements, and work appear on their own. No codes to type, nothing to join.",
                },
              ].map((s) => (
                <li key={s.n} className="relative rounded-[8px] border border-line bg-paper-2 p-5 pt-6 shadow-paper">
                  <span className="absolute -top-3 left-4 grid h-7 w-7 place-items-center rounded-full bg-ink font-display text-[1rem] text-paper-2">{s.n}</span>
                  <p className="text-[1.25rem] leading-tight">
                    <span className="text-ink-3">{s.who}</span> {s.title}
                  </p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:py-20">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">Who it&rsquo;s for</p>
          <h2 className="text-[2rem] leading-tight sm:text-[2.4rem]">Three roles, and nobody steps on anyone.</h2>
          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-3">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.name}>
                  <div className="flex items-end">
                    <div className="folder-tab">
                      <Icon size={15} /> {r.name}
                    </div>
                  </div>
                  <div className="folder-body p-5">
                    <p className="font-display text-[1.35rem] italic text-ink-2">&hellip;{r.line}.</p>
                    <ul className="ruled margin-line mt-3 pl-12 text-[14.5px]" style={{ ["--rule-h" as string]: "1.85rem" }}>
                      {r.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Demo CTA */}
        <section className="mx-auto max-w-[1120px] px-5 pb-20 sm:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 rounded-[10px] border border-line-2 bg-ink px-6 py-8 text-paper sm:px-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h2 className="text-[1.9rem] leading-tight text-paper-2 sm:text-[2.2rem]">Try it with a whole demo school.</h2>
              <p className="mt-2 max-w-[36rem] text-[15px] text-paper-2/80">
                Lakeside Academy comes pre-filled: four sections, six teachers, a full timetable, graded work, and a busy bulletin board.
                Sign in as the admin, a teacher, or a student and click around.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:flex-col">
              <Link href={primaryHref} className={buttonClass("secondary", "lg", "border-paper-2/30 bg-paper-2 text-ink hover:bg-paper")}>
                {primaryLabel} <ArrowRight size={16} />
              </Link>
              {signedIn ? null : (
                <Link href="/login" className={buttonClass("ghost", "lg", "text-paper-2 hover:bg-paper-2/10 hover:text-paper-2")}>
                  See the demo accounts
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line-2">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-ink-3 sm:px-8">
          <span className="inline-flex items-center gap-2">
            <GraduationCap size={14} /> StapL · a student portal built for a school research project
          </span>
          <span className="flex gap-4">
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-ink">
              Create an account
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
