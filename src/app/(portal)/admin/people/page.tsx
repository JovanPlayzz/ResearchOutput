import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { assignSection, reorderSections } from "@/actions/school";
import { requireRole } from "@/lib/auth";
import { schoolSections, schoolTeachers, searchPeople, unassignedStudents } from "@/lib/queries";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input, Select } from "@/components/ui/field";
import { Paper, SectionTitle, Tag } from "@/components/ui/paper";
import { FolderGrid, type FolderItem } from "@/components/portal/folder-grid";
import { SectionForm } from "@/components/portal/forms";
import { ResetPasswordButton } from "@/components/portal/reset-password-button";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; dept?: string; welcome?: string }> }) {
  const { q, dept, welcome } = await searchParams;
  const user = await requireRole("admin");
  const sections = await schoolSections(user.schoolId);
  const teachers = await schoolTeachers(user.schoolId);
  const unassigned = await unassignedStudents(user.schoolId);
  const hits = q?.trim() ? await searchPeople(user.schoolId, q) : null;

  const sectionFolders: FolderItem[] = sections.map((s) => ({
    id: s.id,
    href: `/admin/sections/${s.id}`,
    label: s.label,
    sublabel: s.adviserName ? `Adviser: ${s.adviserName}` : "No adviser yet",
    tab: `Grade ${s.gradeLevel}`,
    group: `Grade ${s.gradeLevel}`,
    count: s.studentCount,
    countLabel: s.studentCount === 1 ? "student" : "students",
    extra: `${s.classCount} subject${s.classCount === 1 ? "" : "s"}`,
  }));

  const departments = [...new Set(teachers.map((t) => t.department ?? "No department"))].sort((a, b) => a.localeCompare(b));
  const deptFolders: FolderItem[] = departments.map((d) => {
    const list = teachers.filter((t) => (t.department ?? "No department") === d);
    return {
      id: d,
      href: `/admin/people?dept=${encodeURIComponent(d)}`,
      label: d,
      sublabel: list
        .map((t) => t.name.split(" ").slice(-1)[0])
        .slice(0, 3)
        .join(", ") + (list.length > 3 ? "…" : ""),
      tab: "Department",
      count: list.length,
      countLabel: list.length === 1 ? "teacher" : "teachers",
      extra: `${list.reduce((a, t) => a + t.classCount, 0)} classes`,
    };
  });
  const deptTeachers = dept ? teachers.filter((t) => (t.department ?? "No department") === dept) : null;

  return (
    <>
      {dept ? <Breadcrumbs items={[{ label: "People", href: "/admin/people" }, { label: dept }]} /> : null}
      <PageHeader
        eyebrow="Office"
        title="People"
        description="Sections are folders of students; departments are folders of teachers. Open a folder to see who's inside, their timetable, and their subjects."
        actions={
          <>
            <form action="/admin/people" className="flex items-center gap-1">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <Input name="q" defaultValue={q ?? ""} placeholder="Find a student or teacher" className="h-9 w-[240px] pl-8" />
              </div>
              {q ? (
                <LinkButton href="/admin/people" variant="ghost" size="sm" aria-label="Clear search">
                  <X size={14} />
                </LinkButton>
              ) : null}
            </form>
            <Disclosure label="Add section" icon={<Plus size={15} />} panelClassName="mt-4">
              <SectionForm teachers={teachers} />
            </Disclosure>
          </>
        }
      />

      {welcome ? (
        <div className="sticky-note mb-6 rounded-[3px] px-4 py-3 text-sm">
          <span className="font-semibold">Your school is set up.</span> Next: add your sections (like 12-CORE), then share the school code{" "}
          <span className="font-mono">{user.school?.code}</span> with teachers and students. Students file themselves into a section when they sign up.
        </div>
      ) : null}

      {hits ? (
        <Paper className="mb-8">
          <div className="flex items-baseline justify-between px-4 pt-4">
            <SectionTitle className="mb-2">Results for &ldquo;{q}&rdquo;</SectionTitle>
            <span className="font-mono text-[12px] text-ink-3">{hits.length}</span>
          </div>
          {hits.length ? (
            <ul className="divide-y divide-dashed divide-line">
              {hits.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={p.name} seed={p.id} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-[12px] text-ink-3">{p.email}</p>
                  </div>
                  <Tag tone={p.role === "admin" ? "manila" : p.role === "teacher" ? "accent" : "neutral"}>{p.role}</Tag>
                  {p.id !== user.id ? <ResetPasswordButton userId={p.id} name={p.name} compact /> : null}
                  {p.href ? (
                    <Link href={p.href} className="text-sm text-accent underline">
                      {p.where}
                    </Link>
                  ) : (
                    <span className="text-sm text-ink-3">{p.where}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 pb-4 text-sm text-ink-3">Nobody matches that.</p>
          )}
        </Paper>
      ) : null}

      <section className="mb-10">
        <SectionTitle aside={<span>{sections.length} sections</span>}>Sections</SectionTitle>
        <FolderGrid items={sectionFolders} reorderAction={reorderSections} groupLabel="Grade" emptyText="No sections yet. Add the first one with the button above." />
      </section>

      {unassigned.length ? (
        <section id="unassigned" className="mb-10">
          <SectionTitle aside={<span className="text-amber">{unassigned.length} waiting</span>}>Not in a section yet</SectionTitle>
          <Paper>
            <ul className="divide-y divide-dashed divide-line">
              {unassigned.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <Avatar name={s.name} seed={s.id} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="truncate text-[12px] text-ink-3">{s.email}</p>
                  </div>
                  <form action={assignSection} className="flex items-center gap-1.5">
                    <input type="hidden" name="userId" value={s.id} />
                    <Select name="sectionId" defaultValue="" className="h-8 w-[180px] py-1 text-sm" required>
                      <option value="" disabled>
                        Choose a section
                      </option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.label}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm" variant="primary">
                      File
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </Paper>
        </section>
      ) : null}

      <section>
        <SectionTitle aside={<span>{teachers.length} teachers</span>}>Teachers by department</SectionTitle>
        {deptTeachers ? (
          <Paper>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Link href="/admin/people" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
                <ArrowLeft size={14} /> All departments
              </Link>
              <h3 className="font-display text-[1.3rem]">{dept}</h3>
              <span className="font-mono text-[12px] text-ink-3">{deptTeachers.length}</span>
            </div>
            <ul className="divide-y divide-dashed divide-line">
              {deptTeachers.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={t.name} seed={t.id} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/teachers/${t.id}`} className="text-sm font-semibold hover:underline">
                      {t.name}
                    </Link>
                    <p className="truncate text-[12px] text-ink-3">
                      {t.classCount} class{t.classCount === 1 ? "" : "es"} · {t.sectionCount} section{t.sectionCount === 1 ? "" : "s"}
                      {t.advises.length ? ` · adviser of ${t.advises.join(", ")}` : ""}
                    </p>
                  </div>
                  <LinkButton href={`/admin/teachers/${t.id}`} size="sm">
                    Open
                  </LinkButton>
                </li>
              ))}
            </ul>
          </Paper>
        ) : (
          <FolderGrid items={deptFolders} defaultSort="name" emptyText="No teachers have joined yet." />
        )}
      </section>
    </>
  );
}
