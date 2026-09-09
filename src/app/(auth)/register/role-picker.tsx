"use client";

import { useState } from "react";
import { GraduationCap, Shield, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  { value: "student", label: "Student", hint: "Join classes, turn in work, see grades.", icon: GraduationCap },
  { value: "teacher", label: "Teacher", hint: "Create classes, post work, grade.", icon: UserRound },
  { value: "admin", label: "Admin", hint: "Create the school, post events.", icon: Shield },
] as const;

export function RolePicker() {
  const [role, setRole] = useState<string>("student");
  return (
    <fieldset>
      <legend className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">I am a</legend>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => {
          const Icon = r.icon;
          const active = role === r.value;
          return (
            <label
              key={r.value}
              className={cn(
                "cursor-pointer rounded-[6px] border px-2.5 py-2.5 text-left transition-colors",
                active ? "border-ink bg-paper-3" : "border-line-2 bg-paper-2 hover:bg-paper-3",
              )}
            >
              <input type="radio" name="role" value={r.value} checked={active} onChange={() => setRole(r.value)} className="sr-only" />
              <Icon size={16} className={active ? "text-ink" : "text-ink-3"} />
              <span className="mt-1.5 block text-sm font-semibold">{r.label}</span>
              <span className="block text-[12px] leading-snug text-ink-3">{r.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
