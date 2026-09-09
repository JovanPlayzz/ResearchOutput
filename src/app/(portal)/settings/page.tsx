import type { Metadata } from "next";
import { changePassword, updateProfile } from "@/actions/account";
import { chooseSection } from "@/actions/school";
import { requireUser, userSubtitle } from "@/lib/auth";
import { schoolSections } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ActionForm } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Select } from "@/components/ui/field";
import { Paper, SectionTitle, Tag } from "@/components/ui/paper";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const sections = user.role === "student" ? await schoolSections(user.schoolId) : [];
  const grades = [...new Set(sections.map((s) => s.gradeLevel))];

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, password, and how the portal looks." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Paper className="p-5">
            <SectionTitle>Profile</SectionTitle>
            <ActionForm action={updateProfile} submitLabel="Save profile" pendingLabel="Saving…" resetOnSuccess={false} closeOnSuccess={false} successMessage="Profile saved.">
              <Field label="Full name">
                <Input name="name" defaultValue={user.name} required />
              </Field>
              {user.role === "teacher" ? (
                <Field label="Department" hint="How you're grouped with other teachers, e.g. Science, Mathematics.">
                  <Input name="department" defaultValue={user.department ?? ""} placeholder="Science" />
                </Field>
              ) : null}
              <Field label="Email" hint="Email can't be changed here.">
                <Input value={user.email} disabled />
              </Field>
            </ActionForm>
          </Paper>

          {user.role === "student" ? (
            <Paper className="p-5">
              <SectionTitle>My section</SectionTitle>
              <p className="mb-3 text-sm text-ink-2">Your section decides which subjects, teachers, and schedule you see. Picked the wrong one? Change it here.</p>
              <ActionForm action={chooseSection} submitLabel="Save section" pendingLabel="Saving…" resetOnSuccess={false} closeOnSuccess={false} successMessage="Section updated.">
                <Field label="Section">
                  <Select name="sectionId" defaultValue={user.sectionId ?? ""} required>
                    <option value="" disabled>
                      Pick your section
                    </option>
                    {grades.map((g) => (
                      <optgroup key={g} label={`Grade ${g}`}>
                        {sections
                          .filter((s) => s.gradeLevel === g)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                              {s.adviserName ? ` · ${s.adviserName}` : ""}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
              </ActionForm>
            </Paper>
          ) : null}

          <Paper className="p-5">
            <SectionTitle>Password</SectionTitle>
            <ActionForm action={changePassword} submitLabel="Change password" pendingLabel="Changing…" closeOnSuccess={false} successMessage="Password changed.">
              <Field label="Current password">
                <Input name="current" type="password" autoComplete="current-password" required />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <Field label="New password">
                  <Input name="next" type="password" autoComplete="new-password" minLength={8} required />
                </Field>
                <Field label="Confirm new password">
                  <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
                </Field>
              </div>
            </ActionForm>
          </Paper>
        </div>

        <aside className="space-y-6">
          <Paper className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} seed={user.id} size={48} />
              <div className="min-w-0">
                <p className="font-semibold">{user.name}</p>
                <p className="truncate text-[13px] text-ink-3">{user.email}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Role</dt>
                <dd>
                  <Tag tone={user.role === "admin" ? "manila" : user.role === "teacher" ? "accent" : "neutral"}>{user.role}</Tag>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">{user.role === "student" ? "Section" : user.role === "teacher" ? "Department" : "Access"}</dt>
                <dd className="text-right">{userSubtitle(user)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">School</dt>
                <dd className="text-right">{user.school?.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Member since</dt>
                <dd>{fmtDate(user.createdAt)}</dd>
              </div>
            </dl>
          </Paper>

          <Paper className="p-5">
            <SectionTitle>Appearance</SectionTitle>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-2">Paper by day, desk lamp by night. Your choice is remembered on this device.</p>
              <ThemeToggle className="border-line-2" />
            </div>
          </Paper>
        </aside>
      </div>
    </>
  );
}
