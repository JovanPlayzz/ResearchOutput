import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { setNewPassword } from "@/actions/account";
import { logout } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { Folder } from "@/components/ui/paper";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect(user.schoolId ? "/dashboard" : "/onboarding");

  return (
    <div className="w-full max-w-[420px]">
      <Folder tab="New password" bodyClassName="p-6 sm:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Hi, {user.name.split(" ")[0]}</p>
        <h1 className="mt-1 text-[1.9rem]">Choose your own password.</h1>
        <p className="mb-5 mt-1 text-ink-2">You signed in with a temporary password from your admin. Pick a new one to keep your account yours.</p>
        <ActionForm action={setNewPassword} submitLabel="Save and continue" pendingLabel="Saving…" resetOnSuccess={false} closeOnSuccess={false}>
          <Field label="New password" hint="At least 8 characters.">
            <Input name="next" type="password" autoComplete="new-password" minLength={8} required autoFocus />
          </Field>
          <Field label="Confirm new password">
            <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </ActionForm>
        <form action={logout} className="mt-6 border-t border-dashed border-line-2 pt-4 text-sm text-ink-3">
          Not you?{" "}
          <button type="submit" className="text-accent underline">
            Sign out
          </button>
        </form>
      </Folder>
    </div>
  );
}
