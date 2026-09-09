import { Check, X } from "lucide-react";
import { deleteTodo, toggleTodo } from "@/actions/todos";
import type { Todo } from "@/db/schema";
import { cn, dueInfo } from "@/lib/utils";

const dueTone = { none: "", overdue: "text-red", today: "text-red", soon: "text-amber", later: "text-ink-3" } as const;

export function TodoList({ todos, compact = false }: { todos: Todo[]; compact?: boolean }) {
  return (
    <ul className={cn("ruled margin-line", compact ? "text-[14px]" : "")} style={{ ["--rule-h" as string]: compact ? "1.75rem" : "2rem" }}>
      {todos.map((t) => {
        const due = t.dueAt && !t.done ? dueInfo(t.dueAt) : null;
        return (
          <li key={t.id} className="group flex items-center gap-3 pl-3 pr-2">
            <form action={toggleTodo} className="flex w-8 shrink-0 justify-center">
              <input type="hidden" name="todoId" value={t.id} />
              <button
                type="submit"
                aria-label={t.done ? "Mark as not done" : "Mark as done"}
                className={cn(
                  "grid h-[18px] w-[18px] place-items-center rounded-[4px] border transition-colors",
                  t.done ? "pop border-ink bg-ink text-paper-2" : "border-line-2 bg-paper-2 hover:border-ink",
                )}
              >
                {t.done ? <Check size={12} strokeWidth={3} /> : null}
              </button>
            </form>
            <span className={cn("min-w-0 flex-1 truncate", t.done && "text-ink-3 line-through decoration-ink-3/60")}>
              {t.title}
              {!compact && t.notes ? <span className="ml-2 text-[13px] text-ink-3">— {t.notes}</span> : null}
            </span>
            {due ? (
              <span className={cn("shrink-0 font-mono text-[11px] uppercase tracking-[0.06em]", dueTone[due.state])}>
                {due.state === "overdue" ? "Overdue" : due.label.replace("Due ", "")}
              </span>
            ) : null}
            <form action={deleteTodo}>
              <input type="hidden" name="todoId" value={t.id} />
              <button
                type="submit"
                aria-label="Delete"
                className="grid h-6 w-6 place-items-center rounded-[4px] text-ink-3 opacity-0 transition-opacity hover:bg-paper-3 hover:text-red focus:opacity-100 group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
