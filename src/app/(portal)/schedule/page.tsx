import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser, sectionLabel } from "@/lib/auth";
import { mySlots, schoolSections, visibleClassrooms } from "@/lib/queries";
import { semesterOf, viewQuarter } from "@/lib/view";
import { PageHeader } from "@/components/shell/page-header";
import { LinkButton } from "@/components/ui/button";
import { Timetable } from "@/components/portal/timetable";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin/people");

  const viewing = await viewQuarter(user);
  const semester = semesterOf(viewing);
  const slots = await mySlots(user, semester);
  const classes = await visibleClassrooms(user, { semester });

  if (user.role === "student") {
    const section = user.sectionId ? (await schoolSections(user.schoolId)).find((s) => s.id === user.sectionId) : null;
    return (
      <>
        <PageHeader
          eyebrow={`Weekly timetable · Semester ${semester}`}
          title={section ? section.label : "My schedule"}
          description={section ? `${classes.length} subjects this semester · adviser ${section.adviserName ?? "not set yet"}. Click a class to open it.` : "Pick your section to see your timetable."}
          actions={!section ? <LinkButton href="/onboarding" variant="primary">Pick my section</LinkButton> : null}
        />
        <Timetable slots={slots} detail="teacher" emptyTitle={`No classes on the semester ${semester} timetable yet.`} emptyText="Your teachers or the admin add the time slots for each subject. Try the other semester from the sidebar." />
      </>
    );
  }

  const sectionsTaught = [...new Set(classes.map((c) => sectionLabel(c.section)))];
  return (
    <>
      <PageHeader
        eyebrow={`Weekly timetable · Semester ${semester}`}
        title="My schedule"
        description={`${classes.length} classes across ${sectionsTaught.length} section${sectionsTaught.length === 1 ? "" : "s"}${sectionsTaught.length ? `: ${sectionsTaught.join(", ")}` : ""}.`}
      />
      <Timetable slots={slots} detail="section" emptyTitle={`Nothing on your semester ${semester} timetable yet.`} emptyText="Open a class and add its time slots under Settings." />
    </>
  );
}
