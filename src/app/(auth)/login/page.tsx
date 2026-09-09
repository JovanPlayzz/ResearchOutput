import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { login } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { Folder } from "@/components/ui/paper";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.schoolId ? "/dashboard" : "/onboarding");

  return (
    <div className="w-full max-w-[420px]">
      <Folder tab="Sign in" bodyClassName="p-6 sm:p-7">
        <h1 className="text-[1.9rem]">Welcome back.</h1>
        <p className="mb-5 mt-1 text-ink-2">Open your folders for today.</p>

        <ActionForm action={login} submitLabel="Sign in" pendingLabel="Signing in…" resetOnSuccess={false} closeOnSuccess={false}>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" placeholder="you@school.edu" required autoFocus />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
        </ActionForm>

        <p className="mt-5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>
            New here?{" "}
            <Link href="/register" className="text-accent underline">
              Create an account
            </Link>
          </span>
          <Link href="/forgot" className="text-ink-3 underline hover:text-ink">
            Forgot your password?
          </Link>
        </p>
      </Folder>

      <div className="sticky-note mx-auto mt-8 w-[300px] rounded-[3px] px-4 py-3 text-[14px] leading-snug">
        <p className="font-semibold">Demo accounts</p>
        <p className="mt-1 font-mono text-[12px] leading-relaxed">
          admin@lakeside.edu
          <br />
          reyes@lakeside.edu (teacher)
          <br />
          maya@lakeside.edu (student)
        </p>
        <p className="mt-1 text-[13px]">
          Password for all: <span className="font-mono">password123</span>
        </p>
      </div>
    </div>
  );
}
