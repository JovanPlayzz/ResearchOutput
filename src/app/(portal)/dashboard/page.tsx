import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FolderOpen, Plus, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  calendarItems,
  listAnnouncements,
  mySlots,
  schoolSections,
  schoolStats,
  studentGrades,
  studentUpcomingWork,
  teacherGradingQueue,
  userTodos,
  visibleClassrooms,
} from "@/lib/queries";
import { addDays, endOfDay, fmtDate, gradeLetter, startOfDay } from "@/lib/utils";
import { semesterOf, viewQuarter } from "@/lib/view";
import { PageHeader } from "@/components/shell/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { CountUp } from "@/components/ui/count-up";
import { ClassDot, Folder, Paper, SectionTitle } from "@/components/ui/paper";
import { Scribble } from "@/components/ui/scribble";
import { AnnouncementCard } from "@/components/portal/announcement-card";
import { EventRow } from "@/components/portal/event-row";
import { GradeValue } from "@/components/portal/grade-value";
import { TodayList } from "@/components/portal/timetable";
import { TodoList } from "@/components/portal/todo-list";
import { WorkRow } from "@/components/portal/work-row";

export const metadata: Metadata = { title: "Today" };

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const firstName = user.name.split(" ")[0];

  const viewing = await viewQuarter(user);
  const semester = semesterOf(viewing);
  const classes = await visibleClassrooms(user, { semester });
  const latest = await listAnnouncements(user, { limit: 3 });
  const week = await calendarItems(user, startOfDay(now), endOfDay(addDays(now, 7)));
  const openTodos = (await userTodos(user.id)).filter((t) => !t.done).slice(0, 6);
  const slots = user.role === "admin" ? [] : await mySlots(user, semester);

  const upcoming = user.role === "student" ? await studentUpcomingWork(user, 6) : [];
  const grades = user.role === "student" ? await studentGrades(user, user.id, semester) : [];
  const queue = user.role === "teacher" ? await teacherGradingQueue(user, 6) : [];
  const stats = user.role === "admin" ? await schoolStats(user.schoolId) : null;
  const mySection = user.role === "student" && user.sectionId ? (await schoolSections(user.schoolId)).find((s) => s.id === user.sectionId) : null;

  return (
    <>
      <PageHeader
        eyebrow={<span className="stamp-in">{fmtDate(now, "long")}</span>}
        title={
          <>
            {greeting(now)}, <Scribble>{firstName}</Scribble>.
          </>
        }
        description={user.school?.motto ?? undefined}
      />

      {user.role === "student" && !user.sectionId ? (
        <div className="sticky-note mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[3px] px-4 py-3 text-sm">
          <span>
            <span className="font-semibold">You&rsquo;re not in a section yet.</span> Pick your section to see your subjects, schedule, and work.
          </span>
          <LinkButton href="/onboarding" size="sm" variant="primary">
            Pick my section
          </LinkButton>
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="stagger min-w-0 space-y-8">
          {user.role === "student" ? (
            <Folder tab="Due soon" aside={<Link href="/calendar" className="text-sm text-accent underline">Calendar</Link>}>
              {upcoming.length ? (
                <ul className="stagger-rows divide-y divide-dashed divide-line p-1.5">
                  {upcoming.map((w) => (
                    <WorkRow key={w.id} w={w} viewerRole="student" showClass />
                  ))}
                </ul>
              ) : (
                <div className="p-3">
                  <EmptyState title="Nothing due. Nice.">Work your teachers post will show up here.</EmptyState>
                </div>
              )}
            </Folder>
          ) : null}

          {user.role === "teacher" ? (
            <Folder tab="Needs grading" aside={<Link href="/classes" className="text-sm text-accent underline">All classes</Link>}>
              {queue.length ? (
                <ul className="stagger-rows divide-y divide-dashed divide-line p-1.5">
                  {queue.map((w) => (
                    <WorkRow key={w.id} w={w} viewerRole="teacher" showClass />
                  ))}
                </ul>
              ) : (
                <div className="p-3">
                  <EmptyState title="Inbox zero.">Everything turned in has been graded.</EmptyState>
                </div>
              )}
            </Folder>
          ) : null}

          {user.role === "admin" && stats ? (
            <Folder tab="School at a glance" aside={<Link href="/admin/people" className="text-sm text-accent underline">People</Link>}>
              <dl className="grid grid-cols-2 divide-x divide-dashed divide-line sm:grid-cols-4">
                {[
                  ["Students", stats.students],
                  ["Teachers", stats.teachers],
                  ["Sections", stats.sections],
                  ["Subjects", stats.classes],
                ].map(([label, n]) => (
                  <div key={label} className="px-4 py-4">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{label}</dt>
                    <dd className="mt-1 font-display text-[2rem] leading-none">
                      <CountUp value={Number(n)} />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line px-4 py-3">
                <LinkButton href="/admin/people" size="sm">
                  <FolderOpen size={14} /> Sections &amp; teachers
                </LinkButton>
                <LinkButton href="/announcements" size="sm">
                  <Plus size={14} /> Announcement
                </LinkButton>
                {stats.unassigned ? (
                  <Link href="/admin/people#unassigned" className="ml-auto inline-flex items-center gap-1 text-[13px] text-amber underline">
                    <UserRound size={13} /> {stats.unassigned} student{stats.unassigned === 1 ? "" : "s"} not in a section
                  </Link>
                ) : (
                  <span className="ml-auto font-mono text-[12px] text-ink-3">
                    School code <span className="font-medium tracking-[0.15em] text-ink">{user.school?.code}</span>
                  </span>
                )}
              </div>
            </Folder>
          ) : null}

          <section>
            <SectionTitle
              aside={
                <Link href="/announcements" className="inline-flex items-center gap-1 text-accent underline">
                  All announcements <ArrowRight size={13} />
                </Link>
              }
            >
              Announcements
            </SectionTitle>
            {latest.length ? (
              <div className="space-y-3">
                {latest.map((a) => (
                  <AnnouncementCard key={a.id} a={a} viewer={user} compact />
                ))}
              </div>
            ) : (
              <EmptyState title="No announcements yet.">When admins or teachers post, they&rsquo;ll land here.</EmptyState>
            )}
          </section>
        </div>

        <aside className="stagger min-w-0 space-y-6" style={{ ["--stagger-offset" as string]: "3" }}>
          {user.role !== "admin" ? (
            <Paper className="p-4">
              <SectionTitle aside={<Link href="/schedule" className="text-accent underline">Full week</Link>}>Today&rsquo;s classes</SectionTitle>
              <TodayList slots={slots} detail={user.role === "teacher" ? "section" : "teacher"} />
            </Paper>
          ) : null}

          {mySection ? (
            <Paper className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">My section</p>
              <p className="mt-0.5 font-display text-[1.6rem] leading-none">{mySection.label}</p>
              <p className="mt-1.5 text-[13px] text-ink-2">
                Adviser: {mySection.adviserName ?? "not set"} · {mySection.studentCount} classmates · {mySection.classCount} subjects
              </p>
            </Paper>
          ) : null}

          <Paper className="p-4">
            <SectionTitle aside={<Link href="/calendar" className="text-accent underline">Calendar</Link>}>This week</SectionTitle>
            {week.length ? (
              <ul className="divide-y divide-dashed divide-line">
                {week.slice(0, 6).map((e) => (
                  <EventRow key={e.id} e={e} viewer={user} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">A quiet week. Nothing on the calendar in the next seven days.</p>
            )}
          </Paper>

          <Paper className="p-4">
            <SectionTitle aside={<Link href="/todo" className="text-accent underline">Open list</Link>}>My to-do</SectionTitle>
            {openTodos.length ? <TodoList todos={openTodos} compact /> : <p className="text-sm text-ink-3">Nothing on your list. Add something on the to-do page.</p>}
          </Paper>

          {user.role === "student" && grades.length ? (
            <Paper className="p-4">
              <SectionTitle aside={<Link href="/grades" className="text-accent underline">All grades</Link>}>Standing · Q{viewing}</SectionTitle>
              <ul className="space-y-2">
                {grades.map((g) => {
                  const q = g.quarters.find((x) => x.quarter === viewing);
                  const pct = q?.pct ?? null;
                  return (
                    <li key={g.classroom.id} className="flex items-center gap-2 text-sm">
                      <ClassDot color={g.classroom.color} />
                      <Link href={`/classes/${g.classroom.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {g.classroom.name}
                      </Link>
                      <span className="inline-flex items-baseline gap-1 text-[13px]">
                        <GradeValue v={pct} /> <span className="font-mono text-ink-3">{gradeLetter(pct)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Paper>
          ) : null}

          {user.role === "teacher" && classes.length ? (
            <Paper className="p-4">
              <SectionTitle aside={<Link href="/classes" className="text-accent underline">Classes</Link>}>My load</SectionTitle>
              <ul className="space-y-2">
                {classes.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <ClassDot color={c.color} />
                    <Link href={`/classes/${c.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {c.name}
                    </Link>
                    <span className="font-mono text-[12px] text-ink-3">{c.sectionLabel}</span>
                  </li>
                ))}
              </ul>
            </Paper>
          ) : null}
        </aside>
      </div>
    </>
  );
}
