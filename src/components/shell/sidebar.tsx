import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  FolderOpen,
  GraduationCap,
  Home,
  LogOut,
  Megaphone,
  Settings,
  Shield,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { userSubtitle, type CurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { NavLink } from "./nav-link";
import { QuarterPicker } from "./quarter-picker";
import { ThemeToggle } from "./theme-toggle";

export function Brand({ schoolName }: { schoolName: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" title={schoolName}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-ink text-paper-2">
        <GraduationCap size={17} />
      </span>
      <span className="sb-text min-w-0">
        <span className="block truncate font-display text-[1.15rem] leading-tight">{schoolName}</span>
      </span>
    </Link>
  );
}

export function Sidebar({ user, unread, viewing }: { user: CurrentUser; unread: number; viewing: number }) {
  const school = user.school;
  const iconSize = 17;

  return (
    <div className="flex h-full flex-col">
      <div className="sb-head border-b border-dashed border-line-2 px-4 pb-4 pt-5">
        <Brand schoolName={school?.name ?? "Homeroom"} />
        {school ? (
          <div className="sb-text">
            <QuarterPicker viewing={viewing} current={school.currentQuarter} schoolYear={school.schoolYear} />
          </div>
        ) : null}
      </div>

      <nav className="sb-nav flex-1 space-y-0.5 overflow-y-auto py-4 pl-3">
        <p className="sb-text mb-1.5 px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">Folders</p>
        <NavLink href="/dashboard" icon={<Home size={iconSize} />} label="Today" />
        <NavLink href="/announcements" icon={<Megaphone size={iconSize} />} label="Announcements" badge={unread} />
        <NavLink href="/calendar" icon={<CalendarDays size={iconSize} />} label="Calendar" />
        {user.role !== "admin" ? <NavLink href="/schedule" icon={<CalendarRange size={iconSize} />} label="Schedule" /> : null}
        <NavLink href="/classes" icon={<BookOpen size={iconSize} />} label="Classes" />
        {user.role === "student" ? <NavLink href="/grades" icon={<GraduationCap size={iconSize} />} label="Grades" /> : null}
        <NavLink href="/todo" icon={<CheckSquare size={iconSize} />} label="My to-do" />

        {user.role === "admin" ? (
          <>
            <p className="sb-text mb-1.5 mt-5 px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">Office</p>
            <NavLink href="/admin/people" icon={<FolderOpen size={iconSize} />} label="People" />
            <NavLink href="/admin" icon={<Shield size={iconSize} />} label="School settings" exact />
          </>
        ) : null}
      </nav>

      <div className="sb-footer border-t border-dashed border-line-2 p-3">
        <div className="sb-user flex items-center gap-2.5">
          <Avatar name={user.name} seed={user.id} size={34} />
          <div className="sb-text min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
            <p className="truncate text-[12px] text-ink-3">{userSubtitle(user)}</p>
          </div>
        </div>
        <div className="sb-footer-row mt-2.5 flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-transparent text-ink-2 transition-colors hover:border-line-2 hover:bg-paper-3 hover:text-ink"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} />
          </Link>
          <form action={logout} className="sb-signout ml-auto">
            <button
              type="submit"
              title="Sign out"
              className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-transparent px-2 text-[13px] text-ink-2 transition-colors hover:border-line-2 hover:bg-paper-3 hover:text-ink"
            >
              <LogOut size={14} /> <span className="sb-text">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
