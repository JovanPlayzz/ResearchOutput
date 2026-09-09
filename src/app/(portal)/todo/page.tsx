import type { Metadata } from "next";
import { Eraser } from "lucide-react";
import { clearDoneTodos } from "@/actions/todos";
import { requireUser } from "@/lib/auth";
import { studentUpcomingWork, teacherGradingQueue, userTodos } from "@/lib/queries";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Folder, Paper } from "@/components/ui/paper";
import { TodoForm } from "@/components/portal/forms";
import { TodoList } from "@/components/portal/todo-list";
import { WorkRow } from "@/components/portal/work-row";

export const metadata: Metadata = { title: "My to-do" };

export default async function TodoPage() {
  const user = await requireUser();
  const all = await userTodos(user.id);
  const open = all.filter((t) => !t.done);
  const done = all.filter((t) => t.done);
  const upcoming = user.role === "student" ? await studentUpcomingWork(user, 20) : [];
  const queue = user.role === "teacher" ? await teacherGradingQueue(user, 20) : [];

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="My to-do"
        description={
          user.role === "student"
            ? "Your own list, plus everything your subjects still need from you. Turned-in work drops off on its own."
            : user.role === "teacher"
              ? "Your own list, plus work that is waiting to be graded."
              : "Your own list. Only you can see it."
        }
        actions={
          done.length ? (
            <form action={clearDoneTodos}>
              <Button type="submit" variant="ghost">
                <Eraser size={15} /> Clear {done.length} done
              </Button>
            </form>
          ) : null
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="stagger space-y-8">
          {user.role === "student" ? (
            <Folder tab="From your subjects" aside={<span className="font-mono text-[12px] text-ink-3">{upcoming.length} to turn in</span>}>
              {upcoming.length ? (
                <ul className="stagger-rows divide-y divide-dashed divide-line p-1.5">
                  {upcoming.map((w) => (
                    <WorkRow key={w.id} w={w} viewerRole="student" showClass />
                  ))}
                </ul>
              ) : (
                <div className="p-3">
                  <EmptyState title="All caught up with your subjects.">Anything your teachers post shows up here until you turn it in.</EmptyState>
                </div>
              )}
            </Folder>
          ) : null}

          {user.role === "teacher" ? (
            <Folder tab="To grade" aside={<span className="font-mono text-[12px] text-ink-3">{queue.length}</span>}>
              {queue.length ? (
                <ul className="stagger-rows divide-y divide-dashed divide-line p-1.5">
                  {queue.map((w) => (
                    <WorkRow key={w.id} w={w} viewerRole="teacher" showClass />
                  ))}
                </ul>
              ) : (
                <div className="p-3">
                  <EmptyState title="Nothing waiting to be graded.">New submissions show up here.</EmptyState>
                </div>
              )}
            </Folder>
          ) : null}

          <Folder tab={user.role === "admin" ? "Open" : "My own list"} aside={<span className="font-mono text-[12px] text-ink-3">{open.length}</span>}>
            {open.length ? (
              <div className="py-2">
                <TodoList todos={open} />
              </div>
            ) : (
              <div className="p-3">
                <EmptyState title="Nothing on your own list.">Add something with the form on the right.</EmptyState>
              </div>
            )}
          </Folder>

          {done.length ? (
            <Folder tab="Done" aside={<span className="font-mono text-[12px] text-ink-3">{done.length}</span>}>
              <div className="py-2">
                <TodoList todos={done} />
              </div>
            </Folder>
          ) : null}
        </div>

        <aside>
          <Paper className="p-4">
            <h2 className="mb-3 text-[1.35rem]">Add to the list</h2>
            <TodoForm />
          </Paper>
        </aside>
      </div>
    </>
  );
}
