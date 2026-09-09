import { Check, Eye, Pin, PinOff, Trash2, Users } from "lucide-react";
import { deleteAnnouncement, markRead, togglePin } from "@/actions/announcements";
import type { AnnouncementRow } from "@/lib/queries";
import { cn, timeAgo, truncate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ClassDot, Tag } from "@/components/ui/paper";

export function AnnouncementCard({
  a,
  viewer,
  compact = false,
}: {
  a: AnnouncementRow;
  viewer: { id: string; role: string };
  compact?: boolean;
}) {
  const canManage = viewer.role === "admin" || a.authorId === viewer.id;

  return (
    <article className={cn("rounded-[8px] border bg-paper-2 shadow-paper transition-shadow hover:shadow-paper-lg", a.read ? "border-line" : "border-line-2")}>
      <div className="flex items-start gap-3 px-4 pb-2 pt-4 sm:px-5">
        <span aria-label={a.read ? "Read" : "Unread"} className={cn("mt-2.5 h-2 w-2 shrink-0 rounded-full", a.read ? "bg-transparent" : "bg-red")} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {a.pinned ? (
              <Tag tone="manila">
                <Pin size={11} /> Pinned
              </Tag>
            ) : null}
            {a.priority === "urgent" ? <Tag tone="red">Urgent</Tag> : null}
            {a.priority === "important" ? <Tag tone="amber">Important</Tag> : null}
            {a.className ? (
              <Tag>
                <ClassDot color={a.classColor} size={8} /> {a.className}
              </Tag>
            ) : a.sectionLabel ? (
              <Tag tone="manila">
                <Users size={11} /> {a.sectionLabel}
              </Tag>
            ) : (
              <Tag tone="accent">School-wide</Tag>
            )}
          </div>
          <h3 className={cn("leading-tight", compact ? "text-[1.15rem]" : "text-[1.35rem]")}>{a.title}</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {a.authorName}
            {a.authorRole === "admin" ? " · Admin" : ""} · {timeAgo(a.createdAt)}
          </p>
        </div>
      </div>

      <div className="ruled margin-line whitespace-pre-line pb-3 pl-14 pr-4 text-[15px] text-ink-2 sm:pr-5" style={{ ["--rule-h" as string]: "1.75rem" }}>
        {compact ? truncate(a.body, 200) : a.body}
      </div>
      {a.imageUrl ? (
        <div className="px-4 pb-4 pl-14 sm:px-5 sm:pl-14">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, access-checked image with unknown dimensions */}
          <img src={a.imageUrl} alt={a.imageName ?? ""} loading="lazy" className={cn("h-auto w-auto max-w-full rounded-[6px] border border-line bg-paper", compact ? "max-h-[240px]" : "max-h-[520px]")} />
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line px-3 py-1.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          {a.read ? (
            <span className="inline-flex items-center gap-1 px-1 text-[12px] text-ink-3">
              <Check size={13} /> Read
            </span>
          ) : (
            <form action={markRead}>
              <input type="hidden" name="announcementId" value={a.id} />
              <Button type="submit" variant="ghost" size="sm">
                <Check size={14} /> Mark as read
              </Button>
            </form>
          )}
          {a.audienceCount != null && a.readCount != null && a.unreadNames ? (
            <details className="relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[4px] px-1.5 py-1 text-[12px] text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink [&::-webkit-details-marker]:hidden">
                <Eye size={13} />
                {a.audienceCount === 0
                  ? "Nobody to read it yet"
                  : a.readCount === a.audienceCount
                    ? `Read by everyone (${a.audienceCount})`
                    : `Read by ${a.readCount} of ${a.audienceCount}`}
              </summary>
              <div className="panel-in absolute bottom-full left-0 z-20 mb-1 w-64 rounded-[6px] border border-line-2 bg-paper-2 p-3 text-[12.5px] shadow-paper-lg">
                {a.unreadNames.length ? (
                  <>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Not yet read · {a.unreadNames.length}</p>
                    <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                      {a.unreadNames.slice(0, 40).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                      {a.unreadNames.length > 40 ? <li className="text-ink-3">and {a.unreadNames.length - 40} more</li> : null}
                    </ul>
                  </>
                ) : (
                  <p className="text-ink-2">Everyone this was posted to has read it.</p>
                )}
              </div>
            </details>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex items-center gap-1">
            <form action={togglePin}>
              <input type="hidden" name="announcementId" value={a.id} />
              <Button type="submit" variant="ghost" size="sm" title={a.pinned ? "Unpin" : "Pin to top"}>
                {a.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                <span className="sr-only sm:not-sr-only">{a.pinned ? "Unpin" : "Pin"}</span>
              </Button>
            </form>
            <form action={deleteAnnouncement}>
              <input type="hidden" name="announcementId" value={a.id} />
              <ConfirmButton message="Delete this announcement?" variant="ghost" size="sm" className="text-red hover:text-red">
                <Trash2 size={14} />
                <span className="sr-only sm:not-sr-only">Delete</span>
              </ConfirmButton>
            </form>
          </div>
        ) : null}
      </footer>
    </article>
  );
}
