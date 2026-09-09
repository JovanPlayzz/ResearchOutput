import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { chooseSection, createSchool, joinSchool } from "@/actions/school";
import { logout } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { schoolSections } from "@/lib/queries";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { Folder } from "@/components/ui/paper";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.schoolId && (user.role !== "student" || user.sectionId)) redirect("/dashboard");

  const first = user.name.split(" ")[0];

  // Step 2 for students: pick a section.
  if (user.schoolId) {
    const sections = await schoolSections(user.schoolId);
    const grades = [...new Set(sections.map((s) => s.gradeLevel))];
    return (
      <div className="w-full max-w-[460px]">
        <Folder tab="Your section" bodyClassName="p-6 sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Welcome to {user.school?.name}, {first}</p>
          <h1 className="mt-1 text-[1.9rem]">Which section are you in?</h1>
          <p className="mb-5 mt-1 text-ink-2">Your section decides which subjects, teachers, and schedule you see. Your adviser or the admin can move you later.</p>
          {sections.length ? (
            <ActionForm action={chooseSection} submitLabel="That's my section" pendingLabel="Saving…" resetOnSuccess={false} closeOnSuccess={false}>
              <input type="hidden" name="redirectTo" value="dashboard" />
              <Field label="Section">
                <Select name="sectionId" defaultValue="" required autoFocus>
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
          ) : (
            <div className="rounded-[6px] border border-dashed border-line-2 p-4 text-sm text-ink-2">
              Your school hasn&rsquo;t set up sections yet. You can still look around and pick your section later in Settings.
              <div className="mt-3">
                <Link href="/dashboard" className="text-accent underline">
                  Continue to the portal
                </Link>
              </div>
            </div>
          )}
          <SignedInAs email={user.email} />
        </Folder>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  return (
    <div className="w-full max-w-[460px]">
      <Folder tab={isAdmin ? "Create a school" : "Join your school"} bodyClassName="p-6 sm:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Hi, {first}</p>
        {isAdmin ? (
          <>
            <h1 className="mt-1 text-[1.9rem]">Set up your school.</h1>
            <p className="mb-5 mt-1 text-ink-2">You&rsquo;ll get a school code to share with teachers and students. Then you add sections, and everyone files themselves into the right one.</p>
            <ActionForm action={createSchool} submitLabel="Create school" pendingLabel="Creating…" resetOnSuccess={false} closeOnSuccess={false}>
              <Field label="School name">
                <Input name="name" placeholder="Lakeside Academy" required autoFocus />
              </Field>
              <Field label="School year" hint="Optional.">
                <Input name="schoolYear" placeholder="2026 – 2027" />
              </Field>
              <Field label="Motto" hint="Optional. Shows on the dashboard.">
                <Input name="motto" placeholder="Learn well. Live kindly." />
              </Field>
            </ActionForm>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-[1.9rem]">Enter your school code.</h1>
            <p className="mb-5 mt-1 text-ink-2">Your school admin has a six-character code. Ask them for it.</p>
            <ActionForm action={joinSchool} submitLabel={user.role === "student" ? "Next: pick my section" : "Join school"} pendingLabel="Joining…" resetOnSuccess={false} closeOnSuccess={false}>
              <Field label="School code">
                <Input name="code" placeholder="LAKE26" required autoFocus className="font-mono text-lg uppercase tracking-[0.2em]" maxLength={8} />
              </Field>
              {user.role === "teacher" ? (
                <Field label="Department" hint="How you're grouped with other teachers, e.g. Science, Mathematics, English.">
                  <Input name="department" placeholder="Science" />
                </Field>
              ) : null}
            </ActionForm>
          </>
        )}
        <SignedInAs email={user.email} />
      </Folder>
    </div>
  );
}

function SignedInAs({ email }: { email: string }) {
  return (
    <form action={logout} className="mt-6 border-t border-dashed border-line-2 pt-4 text-sm text-ink-3">
      Signed in as {email}.{" "}
      <button type="submit" className="text-accent underline">
        Sign out
      </button>
    </form>
  );
}
