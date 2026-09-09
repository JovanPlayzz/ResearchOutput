import Link from "next/link";
import type { Metadata } from "next";
import { Archive, Clock, DoorOpen, ExternalLink, Plus, Table2, Trash2, Users } from "lucide-react";
import { addMaterial, archiveClassroom, deleteClassroom, deleteMaterial } from "@/actions/classes";
import { requireClassroomAccess } from "@/lib/access";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import type { SchoolUser } from "@/lib/auth";
import {
  calendarItems,
  classroomMaterials,
  classroomStudents,
  classroomWork,
  getClassroom,
  getClassroomSummary,
  listAnnouncements,
  schoolSections,
  type ClassroomSummary,
} from "@/lib/queries";
import { addDays, cn, endOfDay, startOfDay } from "@/lib/utils";
import { viewQuarter } from "@/lib/view";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty";
import { Field, Input } from "@/components/ui/field";
import { Paper, SectionTitle, classColorVar } from "@/components/ui/paper";
import { AnnouncementCard } from "@/components/portal/announcement-card";
import { EventForm } from "@/components/portal/event-form";
import { EventRow } from "@/components/portal/event-row";
import { AnnouncementForm, ClassForm, WorkForm } from "@/components/portal/forms";
import { ScheduleEditor } from "@/components/portal/schedule-editor";
import { WorkRow } from "@/components/portal/work-row";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const classroom = await getClassroom(id);
  return { title: classroom?.name ?? "Class" };
}

const TABS = ["stream", "work", "people", "materials", "settings"] as const;
type Tab = (typeof TABS)[number];

export default async function ClassroomPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab: tabRaw, q } = await searchParams;
  const { user, classroom, isTeacher, isAdmin, canManage, isStudent } = await requireClassroomAccess(id);
  const summary = (await getClassroomSummary(classroom.id))!;
  const viewing = await viewQuarter(user);
  const tab: Tab = TABS.includes(tabRaw as Tab) && (tabRaw !== "settings" || canManage) ? (tabRaw as Tab) : "stream";
  const room = summary.slots.find((s) => s.room)?.room;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "stream", label: "Stream" },
    { key: "work", label: "Classwork" },
    { key: "people", label: "People" },
    { key: "materials", label: "Materials" },
    ...(canManage ? [{ key: "settings" as Tab, label: "Settings" }] : []),
  ];

  return (
    <>
      <Breadcrumbs
        items={
          isAdmin
            ? [{ label: "People", href: "/admin/people" }, { label: summary.sectionLabel, href: `/admin/sections/${classroom.sectionId}` }, { label: classroom.name }]
            : [{ label: "Classes", href: "/classes" }, { label: `${classroom.name} · ${summary.sectionLabel}` }]
        }
      />
      <div className="mb-6 overflow-hidden rounded-[8px] border border-line-2 bg-paper-2 shadow-paper">
        <div className="h-2" style={{ backgroundColor: classColorVar(classroom.color) }} />
        <div className="px-5 pb-4 pt-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                {summary.sectionLabel}
                {summary.teacherDepartment ? ` · ${summary.teacherDepartment}` : ""}
                {` · Semester ${classroom.semester}`}
                {classroom.archived ? ` · Archived${classroom.schoolYear ? ` · S.Y. ${classroom.schoolYear}` : ""}` : ""}
              </p>
              <h1 className="text-[2rem] leading-none sm:text-[2.35rem]">{classroom.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-2">
                <span>{summary.teacherName}</span>
                <span className="inline-flex items-center gap-1 text-ink-3">
                  <Users size={13} /> {summary.studentCount} students
                </span>
                {room ? (
                  <span className="inline-flex items-center gap-1 text-ink-3">
                    <DoorOpen size={13} /> {room}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-ink-3">
                  <Clock size={13} /> {summary.scheduleText || "No schedule yet"}
                </span>
              </p>
            </div>
            {isAdmin ? (
              <LinkButton href={`/admin/sections/${classroom.sectionId}`} size="sm">
                Open {summary.sectionLabel}
              </LinkButton>
            ) : null}
          </div>
          {classroom.description ? <p className="mt-3 max-w-prose text-ink-2">{classroom.description}</p> : null}
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 sm:px-4" aria-label="Class sections">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/classes/${classroom.id}?tab=${t.key}`}
              className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm", tab === t.key ? "border-red text-ink" : "border-transparent text-ink-3 hover:text-ink")}
            >
              {t.label}
            </Link>
          ))}
          {canManage ? (
            <Link href={`/classes/${classroom.id}/gradebook`} className="-mb-px ml-auto inline-flex items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm text-accent hover:underline">
              <Table2 size={14} /> Gradebook
            </Link>
          ) : null}
        </nav>
      </div>

      {tab === "stream" ? <StreamTab classroomId={classroom.id} user={user} isTeacher={isTeacher} /> : null}
      {tab === "work" ? <WorkTab classroomId={classroom.id} user={user} isTeacher={isTeacher} isStudent={isStudent} quarter={q} viewing={viewing} /> : null}
      {tab === "people" ? <PeopleTab summary={summary} isAdmin={isAdmin} /> : null}
      {tab === "materials" ? <MaterialsTab classroomId={classroom.id} isTeacher={isTeacher} /> : null}
      {tab === "settings" && canManage ? <SettingsTab summary={summary} /> : null}
    </>
  );
}

async function StreamTab({ classroomId, user, isTeacher }: { classroomId: string; user: SchoolUser; isTeacher: boolean }) {
  const posts = await listAnnouncements(user, { classroomId });
  const now = new Date();
  const upcoming = (await calendarItems(user, startOfDay(now), endOfDay(addDays(now, 30)))).filter((e) => e.classroomId === classroomId);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {isTeacher ? (
          <div className="mb-4">
            <Disclosure label="Post to the stream" icon={<Plus size={15} />} variant="secondary">
              <AnnouncementForm audiences={[]} fixedAudience={`class:${classroomId}`} />
            </Disclosure>
          </div>
        ) : null}
        {posts.length ? (
          <div className="space-y-3">
            {posts.map((a) => (
              <AnnouncementCard key={a.id} a={a} viewer={user} />
            ))}
          </div>
        ) : (
          <EmptyState title="Quiet in here.">{isTeacher ? "Post the first announcement for this class." : "Your teacher hasn't posted anything yet."}</EmptyState>
        )}
      </div>
      <aside className="space-y-4">
        <Paper className="p-4">
          <SectionTitle>Coming up</SectionTitle>
          {upcoming.length ? (
            <ul className="divide-y divide-dashed divide-line">
              {upcoming.slice(0, 8).map((e) => (
                <EventRow key={e.id} e={e} viewer={user} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No class events or due dates in the next 30 days.</p>
          )}
          {isTeacher ? (
            <div className="mt-3">
              <Disclosure label="Add class event" icon={<Plus size={14} />} variant="secondary" size="sm">
                <EventForm audiences={[]} fixedAudience={`class:${classroomId}`} />
              </Disclosure>
            </div>
          ) : null}
        </Paper>
      </aside>
    </div>
  );
}

async function WorkTab({ classroomId, user, isTeacher, isStudent, quarter, viewing }: { classroomId: string; user: SchoolUser; isTeacher: boolean; isStudent: boolean; quarter?: string; viewing: number }) {
  const selected = quarter === "all" ? null : ["1", "2", "3", "4"].includes(quarter ?? "") ? Number(quarter) : viewing;
  const work = await classroomWork(classroomId, isStudent ? user.id : undefined, selected ?? undefined);
  const currentQuarter = viewing;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-[5px] border border-line-2 bg-paper-2 text-[13px]">
          {[null, 1, 2, 3, 4].map((qv) => (
            <Link
              key={qv ?? "all"}
              href={`/classes/${classroomId}?tab=work&q=${qv ?? "all"}`}
              className={cn("border-r border-line-2 px-2.5 py-1.5 last:border-r-0", selected === qv ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-3")}
            >
              {qv ? `Q${qv}` : "All"}
            </Link>
          ))}
        </div>
        {isTeacher ? (
          <>
            <Disclosure label="New work" icon={<Plus size={15} />}>
              <WorkForm classroomId={classroomId} currentQuarter={currentQuarter} />
            </Disclosure>
            <LinkButton href={`/classes/${classroomId}/gradebook`} variant="secondary" className="sm:ml-auto">
              <Table2 size={15} /> Gradebook
            </LinkButton>
          </>
        ) : null}
      </div>
      {work.length ? (
        <Paper>
          <ul className="divide-y divide-dashed divide-line p-1.5">
            {work.map((w) => (
              <WorkRow key={w.id} w={w} viewerRole={user.role} showQuarter={!selected} />
            ))}
          </ul>
        </Paper>
      ) : (
        <EmptyState title={selected ? `Nothing in quarter ${selected} yet.` : "No classwork yet."}>{isTeacher ? "Post an assignment, quiz, or project." : "Your teacher hasn't posted any work."}</EmptyState>
      )}
    </div>
  );
}

async function PeopleTab({ summary, isAdmin }: { summary: ClassroomSummary; isAdmin: boolean }) {
  const students = await classroomStudents(summary.id);
  const section = (await schoolSections(summary.schoolId)).find((s) => s.id === summary.sectionId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Paper className="p-4">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Teacher</h2>
          <div className="flex items-center gap-3">
            <Avatar name={summary.teacherName} seed={summary.teacherId} size={40} />
            <div className="min-w-0">
              <p className="font-semibold">{summary.teacherName}</p>
              <p className="truncate text-[13px] text-ink-3">{summary.teacherDepartment ?? "Teacher"}</p>
            </div>
          </div>
        </Paper>
        <Paper className="p-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Section</h2>
          <p className="font-display text-[1.5rem] leading-none">{summary.sectionLabel}</p>
          <p className="mt-1.5 text-[13px] text-ink-2">Adviser: {section?.adviserName ?? "not set"}</p>
          <p className="mt-2 text-[12px] text-ink-3">Everyone in {summary.sectionLabel} is automatically in this class.</p>
          {isAdmin ? (
            <LinkButton href={`/admin/sections/${summary.sectionId}`} size="sm" className="mt-3">
              Manage section
            </LinkButton>
          ) : null}
        </Paper>
      </div>
      <Paper>
        <div className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Students</h2>
          <span className="font-mono text-[12px] text-ink-3">{students.length}</span>
        </div>
        {students.length ? (
          <ul className="mt-2 divide-y divide-dashed divide-line">
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={s.name} seed={s.id} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-[12px] text-ink-3">{s.email}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <EmptyState title="No students yet.">Students appear here once they pick {summary.sectionLabel} as their section.</EmptyState>
          </div>
        )}
      </Paper>
    </div>
  );
}

async function MaterialsTab({ classroomId, isTeacher }: { classroomId: string; isTeacher: boolean }) {
  const items = await classroomMaterials(classroomId);
  return (
    <div>
      {isTeacher ? (
        <div className="mb-4">
          <Disclosure label="Add material" icon={<Plus size={15} />}>
            <ActionForm action={addMaterial} submitLabel="Add material" pendingLabel="Adding…">
              <input type="hidden" name="classroomId" value={classroomId} />
              <Field label="Title">
                <Input name="title" placeholder="Lab report template" required />
              </Field>
              <Field label="Link" hint="Optional. A shared document, slides, or a website.">
                <Input name="url" type="url" placeholder="https://" />
              </Field>
              <Field label="Note" hint="Optional.">
                <Input name="note" placeholder="Use this for every lab write-up." />
              </Field>
            </ActionForm>
          </Disclosure>
        </div>
      ) : null}
      {items.length ? (
        <Paper>
          <ul className="divide-y divide-dashed divide-line">
            {items.map((mat) => (
              <li key={mat.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {mat.url ? (
                    <a href={mat.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                      {mat.title} <ExternalLink size={13} />
                    </a>
                  ) : (
                    <p className="font-semibold">{mat.title}</p>
                  )}
                  {mat.note ? <p className="text-[14px] text-ink-2">{mat.note}</p> : null}
                  {mat.url ? <p className="truncate font-mono text-[11px] text-ink-3">{mat.url}</p> : null}
                </div>
                {isTeacher ? (
                  <form action={deleteMaterial}>
                    <input type="hidden" name="materialId" value={mat.id} />
                    <ConfirmButton message="Remove this material?" variant="ghost" size="sm" className="text-ink-3 hover:text-red" aria-label="Delete material">
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </Paper>
      ) : (
        <EmptyState title="No materials yet.">{isTeacher ? "Add links to slides, templates, or readings." : "Your teacher hasn't shared materials yet."}</EmptyState>
      )}
    </div>
  );
}

function SettingsTab({ summary }: { summary: ClassroomSummary }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Paper className="p-5">
          <SectionTitle aside={<span>Days and times this class meets</span>}>Timetable</SectionTitle>
          <ScheduleEditor classroomId={summary.id} slots={summary.slots} />
        </Paper>
        <Paper className="p-5">
          <SectionTitle>Class details</SectionTitle>
          <ClassForm classroom={summary} />
        </Paper>
      </div>
      <Paper className="p-5">
        <SectionTitle>Housekeeping</SectionTitle>
        <p className="text-sm text-ink-2">Archiving hides the class from students and from active lists. Nothing is deleted.</p>
        <form action={archiveClassroom} className="mt-3">
          <input type="hidden" name="classroomId" value={summary.id} />
          <Button type="submit" variant="secondary">
            <Archive size={15} /> {summary.archived ? "Unarchive class" : "Archive class"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-2">Deleting removes the class, its work, and every submission. This can&rsquo;t be undone.</p>
        <form action={deleteClassroom} className="mt-3">
          <input type="hidden" name="classroomId" value={summary.id} />
          <ConfirmButton message={`Delete ${summary.name} for ${summary.sectionLabel}, including all classwork and grades?`} variant="danger">
            <Trash2 size={15} /> Delete class
          </ConfirmButton>
        </form>
      </Paper>
    </div>
  );
}
