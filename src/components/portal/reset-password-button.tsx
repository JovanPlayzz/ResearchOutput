"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetPassword } from "@/actions/account";
import { Button } from "@/components/ui/button";

/** Admin control: hands someone a temporary password and shows it once. */
export function ResetPasswordButton({ userId, name, compact = false }: { userId: string; name: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <form
      action={(fd) => {
        if (!window.confirm(`Give ${name} a temporary password? Their current password stops working right away.`)) return;
        action(fd);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      {state?.temp ? (
        <span className="rounded-[4px] border border-dashed border-line-2 bg-paper px-2 py-1 text-[12px]">
          Temporary password: <b className="select-all font-mono tracking-[0.12em]">{state.temp}</b>
        </span>
      ) : null}
      {state?.error ? <span className="text-[12px] text-red">{state.error}</span> : null}
      <Button type="submit" size="sm" variant="ghost" disabled={pending} title="Reset password" aria-label={`Reset password for ${name}`} className="text-ink-3 hover:text-ink">
        <KeyRound size={14} />
        {compact ? null : <span>{state?.temp ? "Reset again" : "Reset password"}</span>}
      </Button>
    </form>
  );
}
