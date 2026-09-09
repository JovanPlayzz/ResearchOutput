"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & {
  pendingText?: string;
  /** Override the form status (for forms submitted through a transition). */
  pending?: boolean;
};

export function SubmitButton({ children, pendingText, disabled, pending: pendingProp, ...props }: Props) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
