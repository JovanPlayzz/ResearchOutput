"use client";

import { useState } from "react";
import { createEvent } from "@/actions/events";
import { EVENT_KINDS } from "@/db/schema";
import type { Audience } from "@/lib/queries";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";

const kindLabel: Record<(typeof EVENT_KINDS)[number], string> = {
  school: "School event",
  holiday: "Holiday / no classes",
  exam: "Exam",
  activity: "Activity",
  meeting: "Meeting",
  class: "Class session",
};

export function EventForm({
  audiences,
  fixedAudience,
  defaultDate,
}: {
  audiences: Audience[];
  fixedAudience?: string;
  defaultDate?: string;
}) {
  const [allDay, setAllDay] = useState(true);
  const groups = ["School", "Sections", "Classes"] as const;
  return (
    <ActionForm action={createEvent} submitLabel="Add to calendar" pendingLabel="Adding…">
      <Field label="Title">
        <Input name="title" placeholder="Foundation Day" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {fixedAudience ? (
          <input type="hidden" name="audience" value={fixedAudience} />
        ) : (
          <Field label="For">
            <Select name="audience" defaultValue={audiences[0]?.value} required>
              {groups.map((g) => {
                const list = audiences.filter((a) => a.group === g);
                if (list.length === 0) return null;
                return (
                  <optgroup key={g} label={g}>
                    {list.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
          </Field>
        )}
        <Field label="Kind">
          <Select name="kind" defaultValue={fixedAudience?.startsWith("class:") ? "class" : "school"}>
            {EVENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Checkbox name="allDay" label="All day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />

      {allDay ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date">
            <Input name="startDate" type="date" defaultValue={defaultDate} required />
          </Field>
          <Field label="End date" hint="Leave blank for a single day.">
            <Input name="endDate" type="date" />
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts">
            <Input name="startsAt" type="datetime-local" defaultValue={defaultDate ? `${defaultDate}T08:00` : undefined} required />
          </Field>
          <Field label="Ends" hint="Optional.">
            <Input name="endsAt" type="datetime-local" />
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Location" hint="Optional.">
          <Input name="location" placeholder="Covered Court" />
        </Field>
      </div>
      <Field label="Details" hint="Optional.">
        <Textarea name="description" rows={3} placeholder="Anything people should know." />
      </Field>
    </ActionForm>
  );
}
