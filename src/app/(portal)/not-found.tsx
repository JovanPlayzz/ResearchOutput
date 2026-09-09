import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/shell/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Nothing filed here." eyebrow="404" />
      <EmptyState title="This folder is empty." action={<LinkButton href="/dashboard">Back to today</LinkButton>}>
        The page you asked for doesn&rsquo;t exist, or you don&rsquo;t have access to it.
      </EmptyState>
    </>
  );
}
