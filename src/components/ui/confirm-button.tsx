"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";

/** A submit button that asks before firing. Use inside a <form action={...}>. */
export function ConfirmButton({ message, onClick, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}
