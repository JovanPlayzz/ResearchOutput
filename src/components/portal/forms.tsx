import { createAnnouncement } from "@/actions/announcements";
import { createAssignment, updateAssignment } from "@/actions/classwork";
import { createClassroom, updateClassroom } from "@/actions/classes";
import { createSection, updateSection } from "@/actions/school";
import { addTodo } from "@/actions/todos";
import { CLASS_COLORS, WORK_KINDS, type Assignment, type Classroom, type Section } from "@/db/schema";
import type { Audience, SectionSummary } from "@/lib/queries";
import { toInputDateTime } from "@/lib/utils";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { workKindLabel } from "./work-row";

/** A select of everywhere the user may post, grouped: School / Sections / Classes. */
export function AudienceSelect({ audiences, name = "audience", defaultValue }: { audiences: Audience[]; name?: string; defaultValue?: string }) {
  const groups = ["School", "Sections", "Classes"] as const;
  return (
    <Select name={name} defaultValue={defaultValue ?? audiences[0]?.value} required>
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
  );
}

export function AnnouncementForm({ audiences, fixedAudience }: { audiences: Audience[]; fixedAudience?: string }) {
  return (
    <ActionForm action={createAnnouncement} submitLabel="Post announcement" pendingLabel="Posting…">
      <Field label="Title">
        <Input name="title" placeholder="What's this about?" required />
      </Field>
      <Field label="Message">
        <Textarea name="body" rows={5} placeholder="Write the announcement. Line breaks are kept." required />
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {fixedAudience ? (
          <input type="hidden" name="audience" value={fixedAudience} />
        ) : (
          <Field label="Post to">
            <AudienceSelect audiences={audiences} />
          </Field>
        )}
        <Field label="Priority">
          <Select name="priority" defaultValue="normal">
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
      </div>
      <Field label="Image" hint="Optional. A poster or a photo of a memo, up to 8 MB.">
        <Input name="image" type="file" accept="image/*" className="file:mr-3 file:rounded-[4px] file:border file:border-line-2 file:bg-paper-3 file:px-2 file:py-1 file:text-sm" />
      </Field>
      <Checkbox name="pinned" label="Pin to the top of the board" />
    </ActionForm>
  );
}

export function WorkForm({ classroomId, assignment, currentQuarter }: { classroomId: string; assignment?: Assignment; currentQuarter: number }) {
  const editing = Boolean(assignment);
  return (
    <ActionForm
      action={editing ? updateAssignment : createAssignment}
      submitLabel={editing ? "Save changes" : "Post work"}
      pendingLabel={editing ? "Saving…" : "Posting…"}
      resetOnSuccess={!editing}
    >
      <input type="hidden" name="classroomId" value={classroomId} />
      {assignment ? <input type="hidden" name="assignmentId" value={assignment.id} /> : null}
      <Field label="Title">
        <Input name="title" defaultValue={assignment?.title} placeholder="Problem Set 4: The chain rule" required />
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-4">
        <Field label="Type">
          <Select name="kind" defaultValue={assignment?.kind ?? "assignment"}>
            {WORK_KINDS.map((k) => (
              <option key={k} value={k}>
                {workKindLabel[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quarter">
          <Select name="quarter" defaultValue={String(assignment?.quarter ?? currentQuarter)}>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>
                Quarter {q}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Points">
          <Input name="points" type="number" min={1} step="0.5" defaultValue={assignment?.points ?? 100} required />
        </Field>
        <Field label="Due">
          <Input name="dueAt" type="datetime-local" defaultValue={toInputDateTime(assignment?.dueAt)} />
        </Field>
      </div>
      <Field label="Instructions">
        <Textarea name="instructions" rows={5} defaultValue={assignment?.instructions ?? ""} placeholder="What should students do, and how should they turn it in?" />
      </Field>
      <Checkbox name="allowLate" defaultChecked={assignment?.allowLate ?? true} label="Accept late submissions" />
    </ActionForm>
  );
}

const colorLabel: Record<(typeof CLASS_COLORS)[number], string> = {
  blue: "Blue",
  red: "Red",
  green: "Green",
  amber: "Amber",
  violet: "Violet",
  teal: "Teal",
  rose: "Rose",
  slate: "Slate",
};

function ColorPicker({ value }: { value: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">Colour</legend>
      <div className="flex flex-wrap gap-2">
        {CLASS_COLORS.map((c) => (
          <label key={c} className="cursor-pointer" title={colorLabel[c]}>
            <input type="radio" name="color" value={c} defaultChecked={value === c} className="peer sr-only" />
            <span
              className="block h-7 w-7 rounded-[5px] border-2 border-transparent ring-offset-2 ring-offset-paper-2 transition-transform peer-checked:border-paper-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent hover:scale-110"
              style={{ backgroundColor: `var(--c-${c})` }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Teacher: create a subject for a section, or edit an existing class. */
export function ClassForm({ classroom, sections, defaultSemester = 1 }: { classroom?: Classroom; sections?: SectionSummary[]; defaultSemester?: number }) {
  const editing = Boolean(classroom);
  const grades = [...new Set((sections ?? []).map((s) => s.gradeLevel))];
  return (
    <ActionForm
      action={editing ? updateClassroom : createClassroom}
      submitLabel={editing ? "Save changes" : "Create class"}
      pendingLabel={editing ? "Saving…" : "Creating…"}
      resetOnSuccess={false}
      closeOnSuccess={editing}
      successMessage={editing ? "Saved." : undefined}
    >
      {classroom ? <input type="hidden" name="classroomId" value={classroom.id} /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[1fr_200px_140px]">
        <Field label="Subject">
          <Input name="name" defaultValue={classroom?.name} placeholder="General Biology 2" required />
        </Field>
        {!editing ? (
          <Field label="Section">
            <Select name="sectionId" required defaultValue="">
              <option value="" disabled>
                Pick a section
              </option>
              {grades.map((g) => (
                <optgroup key={g} label={`Grade ${g}`}>
                  {(sections ?? [])
                    .filter((s) => s.gradeLevel === g)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Semester" hint={editing ? undefined : "Quarters 1–2 or 3–4."}>
          <Select name="semester" defaultValue={String(classroom?.semester ?? defaultSemester)}>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </Select>
        </Field>
      </div>
      <Field label="Description" hint="Optional. One line about what the class covers.">
        <Textarea name="description" rows={2} defaultValue={classroom?.description ?? ""} placeholder="Genetics, evolution, and the organ systems." />
      </Field>
      <ColorPicker value={classroom?.color ?? "blue"} />
      {!editing ? <p className="text-[13px] text-ink-3">After creating the class you can add its timetable slots.</p> : null}
    </ActionForm>
  );
}

/** Admin: create or edit a section. */
export function SectionForm({ section, teachers }: { section?: Section; teachers: Array<{ id: string; name: string; department: string | null }> }) {
  const editing = Boolean(section);
  return (
    <ActionForm
      action={editing ? updateSection : createSection}
      submitLabel={editing ? "Save section" : "Add section"}
      pendingLabel="Saving…"
      resetOnSuccess={!editing}
      successMessage={editing ? "Saved." : undefined}
    >
      {section ? <input type="hidden" name="sectionId" value={section.id} /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Grade" hint="Just the number.">
          <Input name="gradeLevel" defaultValue={section?.gradeLevel} placeholder="12" required />
        </Field>
        <Field label="Section name">
          <Input name="name" defaultValue={section?.name} placeholder="CORE" className="uppercase" required />
        </Field>
      </div>
      <Field label="Adviser" hint="The homeroom teacher. Optional.">
        <Select name="adviserId" defaultValue={section?.adviserId ?? ""}>
          <option value="">No adviser yet</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.department ? ` · ${t.department}` : ""}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}

export function TodoForm() {
  return (
    <ActionForm action={addTodo} submitLabel="Add" pendingLabel="Adding…" closeOnSuccess={false} className="space-y-3">
      <Field label="To do">
        <Input name="title" placeholder="Finish lab report sketches" required />
      </Field>
      <Field label="Due" hint="Optional.">
        <Input name="dueAt" type="date" />
      </Field>
      <Field label="Notes" hint="Optional.">
        <Input name="notes" placeholder="Anything to remember" />
      </Field>
    </ActionForm>
  );
}
