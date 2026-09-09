import { requireUser } from "@/lib/auth";
import { unreadAnnouncementCount } from "@/lib/queries";
import { viewQuarter } from "@/lib/view";
import { PortalShell } from "@/components/shell/portal-shell";
import { Brand, Sidebar } from "@/components/shell/sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await unreadAnnouncementCount(user);
  const viewing = await viewQuarter(user);
  return (
    <PortalShell sidebar={<Sidebar user={user} unread={unread} viewing={viewing} />} brand={<Brand schoolName={user.school?.name ?? "Homeroom"} />}>
      {children}
    </PortalShell>
  );
}
