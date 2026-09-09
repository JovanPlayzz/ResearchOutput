import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { register } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { Folder } from "@/components/ui/paper";
import { RolePicker } from "./role-picker";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.schoolId ? "/dashboard" : "/onboarding");

  return (
    <div className="w-full max-w-[460px]">
      <Folder tab="New account" bodyClassName="p-6 sm:p-7">
        <h1 className="text-[1.9rem]">Let&rsquo;s get you a folder.</h1>
        <p className="mb-5 mt-1 text-ink-2">Tell us who you are. You&rsquo;ll join or create a school right after.</p>

        <ActionForm action={register} submitLabel="Create account" pendingLabel="Creating…" resetOnSuccess={false} closeOnSuccess={false}>
          <Field label="Full name">
            <Input name="name" autoComplete="name" placeholder="Maya Santos" required autoFocus />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" placeholder="you@school.edu" required />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <RolePicker />
        </ActionForm>

        <p className="mt-5 text-sm text-ink-2">
          Already have an account?{" "}
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>
        </p>
      </Folder>
    </div>
  );
}
