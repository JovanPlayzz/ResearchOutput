import Link from "next/link";
import type { Metadata } from "next";
import { Folder } from "@/components/ui/paper";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <div className="w-full max-w-[460px]">
      <Folder tab="Forgot password" bodyClassName="p-6 sm:p-7">
        <h1 className="text-[1.9rem]">Ask your school admin.</h1>
        <p className="mt-2 text-ink-2">
          StapL runs inside your school and doesn&rsquo;t send email, so passwords are reset by a person, not a link.
        </p>
        <ol className="ruled margin-line mt-4 pl-12 text-[15px] text-ink-2" style={{ ["--rule-h" as string]: "2rem" }}>
          <li>Go to your school admin (or your adviser, who can ask them).</li>
          <li>They reset your account and give you a temporary password.</li>
          <li>Sign in with it. You&rsquo;ll be asked to choose a new password right away.</li>
        </ol>
        <p className="mt-5 text-sm text-ink-2">
          Remembered it after all?{" "}
          <Link href="/login" className="text-accent underline">
            Back to sign in
          </Link>
        </p>
      </Folder>
    </div>
  );
}
