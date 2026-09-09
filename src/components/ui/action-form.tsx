"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { FormError, FormSuccess } from "./field";
import { SubmitButton } from "./submit-button";
import { useDisclosure } from "./disclosure";
import type { FormState } from "@/actions/auth";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * A form wired to a server action that returns { error } or { ok }.
 * On success it resets, shows a message (optional), and closes an enclosing Disclosure.
 *
 * Forms with resetOnSuccess={false} (editing existing things) submit through a
 * transition instead of the native form action, because React resets a form's
 * fields to their old defaults after a native action completes, which made
 * saved edits look like they had bounced back.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  successMessage,
  resetOnSuccess = true,
  closeOnSuccess = true,
  className,
  footer,
  submitVariant = "primary",
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: ReactNode;
  pendingLabel?: string;
  successMessage?: ReactNode;
  resetOnSuccess?: boolean;
  closeOnSuccess?: boolean;
  className?: string;
  footer?: ReactNode;
  submitVariant?: "primary" | "secondary" | "danger";
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const disclosure = useDisclosure();
  const okAt = state?.ok ? state : null;

  useEffect(() => {
    if (!okAt) return;
    if (resetOnSuccess) ref.current?.reset();
    if (closeOnSuccess) disclosure?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [okAt]);

  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={
        resetOnSuccess
          ? undefined
          : (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              startTransition(() => formAction(data));
            }
      }
      className={className ?? "space-y-4"}
    >
      {children}
      <FormError>{state?.error}</FormError>
      {state?.ok && successMessage ? <FormSuccess>{successMessage}</FormSuccess> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {footer}
        <SubmitButton variant={submitVariant} pendingText={pendingLabel} pending={resetOnSuccess ? undefined : isPending}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
