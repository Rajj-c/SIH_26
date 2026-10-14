import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AssessmentRunner } from "@/components/platform/assessment-runner";
import { PageHeading } from "@/components/platform/primitives";
import { getPublishedTrack } from "@/lib/learning-track-server";
export default async function Page({
  params: pendingParams,
}: {
  params: Promise<{ courseId: string; moduleId: string; subtopicId: string }>;
}) {
  const params = await pendingParams;
  const course = await getPublishedTrack(params.courseId);
  const courseModule = course?.modules.find((m) => m.id === params.moduleId);
  const topic = courseModule?.subTopics.find((s) => s.id === params.subtopicId);
  if (!course || !courseModule || !topic) notFound();
  return (
    <DashboardShell role="student" title={topic.title}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={"/student/assessment/course/" + course.id}
          className="text-xs font-semibold role-text"
        >
          ← Back to {course.title}
        </Link>
        <PageHeading
          eyebrow={courseModule.title}
          title={topic.title}
          description={courseModule.description}
        />
        <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          Review the study notes above before starting the practice questions.
          Submitting this practice records participation, not verified
          proficiency, course accreditation or a provider-issued certificate.
        </div>
        <AssessmentRunner request={params} courseMode />
      </div>
    </DashboardShell>
  );
}
