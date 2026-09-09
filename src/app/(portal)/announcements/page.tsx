import Link from "next/link";
import type { Metadata } from "next";
import { CheckCheck, Plus } from "lucide-react";
import { markAllRead } from "@/actions/announcements";
import { requireUser } from "@/lib/auth";
import { listAnnouncements, postingAudiences } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty";
import { AnnouncementCard } from "@/components/portal/announcement-card";
import { AnnouncementForm } from "@/components/portal/forms";

export const metadata: Metadata = { title: "Announcements" };

type Filter = "unread" | "school" | "section" | "classes";
const FILTERS: Filter[] = ["unread", "school", "section", "classes"];

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: raw } = await searchParams;
  const filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : undefined;
  const user = await requireUser();
  const all = await listAnnouncements(user);
  const list = filter ? await listAnnouncements(user, { filter }) : all;
  const audiences = await postingAudiences(user);
  const unread = all.filter((a) => !a.read).length;

  const tabs: Array<{ key?: Filter; label: string; n: number }> = [
    { label: "All", n: all.length },
    { key: "unread", label: "Unread", n: unread },
    { key: "school", label: "School-wide", n: all.filter((a) => !a.classroomId && !a.sectionId).length },
    { key: "section", label: user.role === "student" ? "My section" : "Sections", n: all.filter((a) => a.sectionId).length },
    { key: "classes", label: user.role === "student" ? "My subjects" : "Classes", n: all.filter((a) => a.classroomId).length },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Bulletin board"
        title="Announcements"
        description="Everything the school, your section, and your teachers want you to know, in one place where it can't get buried."
        actions={
          <>
            {unread ? (
              <form action={markAllRead}>
                <Button type="submit" variant="ghost">
                  <CheckCheck size={15} /> Mark all read
                </Button>
              </form>
            ) : null}
            {audiences.length ? (
              <Disclosure label="New announcement" icon={<Plus size={15} />} panelClassName="mt-4">
                <AnnouncementForm audiences={audiences} />
              </Disclosure>
            ) : null}
          </>
        }
      />

      <nav className="mb-5 flex flex-wrap gap-1 border-b border-line-2" aria-label="Filter">
        {tabs.map((t) => {
          const active = t.key === filter;
          return (
            <Link
              key={t.label}
              href={t.key ? `/announcements?filter=${t.key}` : "/announcements"}
              className={cn("-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm", active ? "border-red text-ink" : "border-transparent text-ink-3 hover:text-ink")}
            >
              {t.label}
              <span className="font-mono text-[11px] text-ink-3">{t.n}</span>
            </Link>
          );
        })}
      </nav>

      {list.length ? (
        <div className="space-y-3">
          {list.map((a) => (
            <AnnouncementCard key={a.id} a={a} viewer={user} />
          ))}
        </div>
      ) : (
        <EmptyState title={filter === "unread" ? "You're all caught up." : "Nothing posted here yet."}>
          {filter === "unread" ? "Every announcement has been read." : "New announcements will show up here."}
        </EmptyState>
      )}
    </>
  );
}
