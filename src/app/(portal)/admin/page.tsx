import type { Metadata } from "next";
import { CalendarClock, FolderOpen, RefreshCw } from "lucide-react";
import { regenerateSchoolCode, startNewSchoolYear, updateSchool } from "@/actions/school";
import { requireRole } from "@/lib/auth";
import { schoolAdmins, schoolStats } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { nextSchoolYear } from "@/lib/view";
import { PageHeader } from "@/components/shell/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Paper, SectionTitle } from "@/components/ui/paper";

export const metadata: Metadata = { title: "School settings" };

export default async function AdminPage() {
  const user = await requireRole("admin");
  const school = user.school!;
  const stats = await schoolStats(user.schoolId);
  const admins = await schoolAdmins(user.schoolId);

  return (
    <>
      <PageHeader
        eyebrow="Office"
        title="School settings"
        description="The school's name, the code people join with, the current quarter, and the yearly rollover. People and sections live on their own page."
        actions={
          <LinkButton href="/admin/people">
            <FolderOpen size={15} /> People &amp; sections
          </LinkButton>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="stagger space-y-6">
          <Paper className="p-5">
            <SectionTitle>School details</SectionTitle>
            <ActionForm action={updateSchool} submitLabel="Save" pendingLabel="Saving…" resetOnSuccess={false} closeOnSuccess={false} successMessage="Saved.">
              <Field label="School name">
                <Input name="name" defaultValue={school.name} required />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Field label="School year">
                  <Input name="schoolYear" defaultValue={school.schoolYear ?? ""} placeholder="2026 – 2027" />
                </Field>
                <Field label="Motto">
                  <Input name="motto" defaultValue={school.motto ?? ""} placeholder="Learn well. Live kindly." />
                </Field>
                <Field label="Current quarter" hint="What everyone sees by default.">
                  <Select name="currentQuarter" defaultValue={String(school.currentQuarter)}>
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={q}>
                        Quarter {q} {q <= 2 ? "· Sem 1" : "· Sem 2"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </ActionForm>
          </Paper>

          <Paper className="p-5">
            <SectionTitle aside={<span>{admins.length}</span>}>Administrators</SectionTitle>
            <ul className="divide-y divide-dashed divide-line">
              {admins.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <Avatar name={a.name} seed={a.id} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {a.name} {a.id === user.id ? <span className="font-normal text-ink-3">(you)</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-ink-3">{a.email}</p>
                  </div>
                  <span className="font-mono text-[11px] text-ink-3">since {fmtDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-ink-3">Anyone who signs up as an admin with the school code becomes an administrator.</p>
          </Paper>

          <Paper className="p-5">
            <SectionTitle aside={<CalendarClock size={16} className="text-ink-3" />}>Start a new school year</SectionTitle>
            <p className="text-sm text-ink-2">
              Do this once, at the start of the year. Everything is kept for the record; nothing is deleted.
            </p>
            <ul className="ruled margin-line my-3 pl-12 text-[14px] text-ink-2" style={{ ["--rule-h" as string]: "1.85rem" }}>
              <li>Every subject from S.Y. {school.schoolYear ?? "this year"} is archived, with its classwork and grades.</li>
              <li>The current quarter goes back to Quarter 1.</li>
              <li>Students are taken out of their sections and pick the right one the next time they sign in.</li>
              <li>Sections and teachers stay. Rename or add sections on the People page, then teachers create the new year&rsquo;s subjects.</li>
            </ul>
            <ActionForm action={startNewSchoolYear} submitLabel="Start the new school year" pendingLabel="Rolling over…" submitVariant="danger" resetOnSuccess={false} closeOnSuccess={false} successMessage="Welcome to the new school year. Sections are ready for students to pick again.">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label="New school year">
                  <Input name="schoolYear" defaultValue={nextSchoolYear(school.schoolYear)} placeholder="2027 – 2028" required />
                </Field>
                <Checkbox name="sure" label="I understand this archives the current subjects" className="pb-2.5" />
              </div>
            </ActionForm>
          </Paper>
        </div>

        <aside className="stagger space-y-6">
          <Paper className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">School code</p>
            <p className="mt-1 font-mono text-[2rem] font-medium tracking-[0.25em]">{school.code}</p>
            <p className="mt-2 text-sm text-ink-2">Teachers and students enter this when they sign up. Students then pick their section.</p>
            <form action={regenerateSchoolCode} className="mt-4">
              <ConfirmButton message="Generate a new code? The old one will stop working." variant="secondary" size="sm">
                <RefreshCw size={14} /> New code
              </ConfirmButton>
            </form>
          </Paper>

          <Paper className="p-5">
            <SectionTitle>Numbers</SectionTitle>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["Students", stats.students],
                ["Teachers", stats.teachers],
                ["Sections", stats.sections],
                ["Subjects", stats.classes],
              ].map(([label, n]) => (
                <div key={label} className="rounded-[6px] border border-dashed border-line-2 px-3 py-2">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">{label}</dt>
                  <dd className="font-display text-[1.6rem] leading-none">{n}</dd>
                </div>
              ))}
            </dl>
            {stats.unassigned ? (
              <p className="mt-3 text-[13px] text-amber">
                {stats.unassigned} student{stats.unassigned === 1 ? " is" : "s are"} not in a section yet.
              </p>
            ) : null}
          </Paper>

          <Paper className="p-5">
            <SectionTitle>Forgot passwords</SectionTitle>
            <p className="text-sm text-ink-2">
              Open a section or a teacher on the People page and use <span className="font-semibold">Reset password</span>. You get a temporary password to hand over; they choose their own at sign-in.
            </p>
          </Paper>

          <Paper className="p-5">
            <SectionTitle>Reset demo data</SectionTitle>
            <p className="text-sm text-ink-2">
              Stop the server and run <code className="rounded bg-paper-3 px-1 font-mono text-[12px]">npm run db:reset</code>. The demo school is re-created on the next start.
            </p>
          </Paper>
        </aside>
      </div>
    </>
  );
}
