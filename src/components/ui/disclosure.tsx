"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const Ctx = createContext<{ close: () => void } | null>(null);

/** Lets a form inside a Disclosure close it after a successful submit. */
export function useDisclosure() {
  return useContext(Ctx);
}

/**
 * A button that reveals an inline panel (usually a form). Forms inside can call
 * useDisclosure().close() when they finish.
 */
export function Disclosure({
  label,
  icon,
  title,
  children,
  variant = "primary",
  size = "md",
  className,
  panelClassName,
  defaultOpen = false,
}: {
  label: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  panelClassName?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Ctx.Provider value={{ close: () => setOpen(false) }}>
      <div className={cn("contents", className)}>
        <Button type="button" variant={variant} size={size} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {icon}
          {label}
        </Button>
        {open ? (
          <div className={cn("panel-in col-span-full mt-3 w-full rounded-[8px] border border-line-2 bg-paper-2 p-4 shadow-paper-lg", panelClassName)}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg">{title ?? label}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </Button>
            </div>
            {children}
          </div>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}
