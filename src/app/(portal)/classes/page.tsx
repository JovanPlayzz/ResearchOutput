import Link from "next/link";
import type { Metadata } from "next";
import { CalendarRange, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { schoolSections, visibleClassrooms, type ClassroomSummary } from "@/lib/queries";
import { semesterOf, viewQuarter } from "@/lib/view";
import { PageHeader } from "@/components/shell/page-header";
import { LinkButton } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty";
import { ClassCard } from "@/components/portal/class-card";
import { ClassForm } from "@/components/portal/forms";

export const metadata: Metadata = { title: "Classes" };

function groupBy<T>(list: T[], key: (t: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return [...map.entries()];
}

export default async function ClassesPage() {
  const user = await requireUser();
  const viewing = await viewQuarter(user);
  const semester = semesterOf(viewing);
  const isCurrent = viewing === (user.school?.currentQuarter ?? 1);
  const all = await visibleClassrooms(user, { includeArchived: user.role !== "student", semester });
  const active = all.filter((c) => !c.archived);
  const archived = all.filter((c) => c.archived);
  const sections = await schoolSections(user.schoolId);
  const period = `Semester ${semester} · Quarter ${viewing}${isCurrent ? "" : " (not the current quarter)"}`;

  /* ---------- student ---------- */
  if (user.role === "student") {
    const mine = user.sectionId ? sections.find((s) => s.id === user.sectionId) : null;
    return (
      <>
        <PageHeader
          eyebrow={mine ? `Section ${mine.label} · ${period}` : period}
          title="My subjects"
          description={mine ? `Adviser ${mine.adviserName ?? "not set yet"} · ${mine.studentCount} classmates. Every subject your section takes this semester is here.` : "Pick your section to see your subjects."}
          actions={
            mine ? (
              <LinkButton href="/schedule">
                <CalendarRange size={15} /> Weekly schedule
              </LinkButton>
            ) : (
              <LinkButton href="/onboarding" variant="primary">
                Pick my section
              </LinkButton>
            )
          }
        />
        {active.length ? (
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((c) => (
              <ClassCard key={c.id} c={c} viewerRole="student" />
            ))}
          </div>
        ) : (
          <EmptyState title={`No subjects for semester ${semester} yet.`}>
            {mine ? "Your teachers haven't set up subjects for this semester. Try switching the quarter in the sidebar." : "Once you're in a section, its subjects appear here."}
          </EmptyState>
        )}
      </>
    );
  }

  /* ---------- teacher: grouped by subject ---------- */
  if (user.role === "teacher") {
    const bySubject = groupBy(active, (c) => c.name);
    return (
      <>
        <PageHeader
          eyebrow={`Teaching load · ${period}`}
          title="My classes"
          description={`${active.length} classes · ${new Set(active.map((c) => c.sectionId)).size} sections this semester. One card per subject and section.`}
          actions={
            <>
              <LinkButton href="/schedule">
                <CalendarRange size={15} /> Weekly schedule
              </LinkButton>
              <Disclosure label="New class" icon={<Plus size={15} />} panelClassName="mt-4">
                <ClassForm sections={sections} defaultSemester={semester} />
              </Disclosure>
            </>
          }
        />
        {bySubject.length ? (
          <div className="stagger space-y-8">
            {bySubject.map(([subject, list]) => (
              <section key={subject}>
                <h2 className="mb-3 flex items-baseline gap-2 text-[1.35rem]">
                  {subject} <span className="font-mono text-[12px] text-ink-3">{list.length} section{list.length === 1 ? "" : "s"}</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((c) => (
                    <ClassCard key={c.id} c={c} viewerRole="teacher" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title={`No classes for semester ${semester} yet.`}>Create one: pick the subject, the section, and the semester you teach it in.</EmptyState>
        )}
        <Archived list={archived} />
      </>
    );
  }

  /* ---------- admin: grouped by section ---------- */
  const bySection = groupBy(active, (c) => c.sectionLabel);
  return (
    <>
      <PageHeader eyebrow={`All sections · ${period}`} title="Classes" description={`${active.length} subjects across ${bySection.length} sections this semester. Teachers create these; you can edit any of them.`} />
      {bySection.length ? (
        <div className="stagger space-y-8">
          {bySection.map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-3 flex items-baseline gap-3 text-[1.35rem]">
                {label}
                <Link href={`/admin/sections/${list[0].sectionId}`} className="text-sm text-accent underline">
                  Open section
                </Link>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((c) => (
                  <ClassCard key={c.id} c={c} viewerRole="admin" />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title={`No classes for semester ${semester} yet.`}>Teachers haven&rsquo;t created subjects for this semester.</EmptyState>
      )}
      <Archived list={archived} />
    </>
  );
}

function Archived({ list }: { list: ClassroomSummary[] }) {
  if (list.length === 0) return null;
  const byYear = groupBy(list, (c) => c.schoolYear ?? "Earlier");
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Archived</h2>
      {byYear.map(([year, items]) => (
        <div key={year} className="mb-6">
          <p className="mb-2 text-[13px] text-ink-3">S.Y. {year}</p>
          <div className="grid gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((c) => (
              <ClassCard key={c.id} c={c} viewerRole="teacher" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
