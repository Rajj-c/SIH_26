"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeading, Metric, Empty } from "@/components/platform/primitives";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { Briefcase, Target, FileText } from "lucide-react";

export default function StudentStylePreview() {
  return (
    <DashboardShell role="student" title="Dashboard">
      <div className="space-y-6">
        <PageHeading eyebrow="Your next chapter" title="Make room for your next opportunity." description="Build your skills, explore opportunities and keep your career moving forward." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Skills assessed" value="0" detail="Discover your strengths" icon={<Target className="h-5 w-5" />} />
          <Metric label="Applications" value="0" detail="Find your next opportunity" icon={<Briefcase className="h-5 w-5" />} />
          <Metric label="Portfolio projects" value="0" detail="Turn your progress into proof" icon={<FileText className="h-5 w-5" />} />
        </div>
        <WorkspaceTabs label="Career Hub" href="/student/career" active="marketplace" tabs={[{ id: "marketplace", label: "Marketplace", icon: Briefcase }, { id: "applications", label: "Applications", icon: Target }, { id: "portfolio", label: "Portfolio", icon: FileText }]} />
        <DashboardShell embedded role="student" title="Marketplace">
          <Empty title="Your next step starts here" description="Explore learning programs, build a portfolio and find opportunities that match your skills." />
        </DashboardShell>
      </div>
    </DashboardShell>
  );
}
