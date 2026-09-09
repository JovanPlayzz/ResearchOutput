import { Trash2 } from "lucide-react";
import { addSlot, deleteSlot } from "@/actions/classes";
import type { ScheduleSlot } from "@/db/schema";
import { DAY_NAMES, DAY_SHORT, fmtRange, sortSlots } from "@/lib/schedule";
import { ActionForm } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";

/** Lists a class's weekly slots and lets a teacher or admin add or remove them. Clashes are refused. */
export function ScheduleEditor({ classroomId, slots }: { classroomId: string; slots: ScheduleSlot[] }) {
  const sorted = sortSlots(slots);
  return (
    <div className="space-y-4">
      {sorted.length ? (
        <ul className="divide-y divide-dashed divide-line rounded-[6px] border border-line bg-paper">
          {sorted.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-24 font-semibold">{DAY_NAMES[s.day]}</span>
              <span className="font-mono text-[13px]">{fmtRange(s.startMin, s.endMin)}</span>
              <span className="flex-1 text-ink-3">{s.room ?? ""}</span>
              <form action={deleteSlot}>
                <input type="hidden" name="slotId" value={s.id} />
                <ConfirmButton message="Remove this time slot?" variant="ghost" size="sm" className="text-ink-3 hover:text-red" aria-label="Remove slot">
                  <Trash2 size={14} />
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">No time slots yet. Add the days and time this class meets.</p>
      )}

      <ActionForm action={addSlot} submitLabel="Add to timetable" pendingLabel="Adding…" closeOnSuccess={false} className="space-y-3 rounded-[6px] border border-dashed border-line-2 p-3">
        <input type="hidden" name="classroomId" value={classroomId} />
        <fieldset>
          <legend className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">Days</legend>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <label key={d} className="cursor-pointer">
                <input type="checkbox" name="day" value={d} className="peer sr-only" />
                <span className="inline-block rounded-[4px] border border-line-2 bg-paper-2 px-2.5 py-1 font-mono text-[12px] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  {DAY_SHORT[d]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Starts">
            <Input name="start" type="time" defaultValue="07:30" required />
          </Field>
          <Field label="Ends">
            <Input name="end" type="time" defaultValue="08:30" required />
          </Field>
          <Field label="Room" hint="Optional.">
            <Input name="room" placeholder="Room 301" />
          </Field>
        </div>
      </ActionForm>
    </div>
  );
}
