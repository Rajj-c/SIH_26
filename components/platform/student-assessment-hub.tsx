"use client";

import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Building2, BarChart3 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { StudentSkillAssessment } from "./student-skill-assessment";
import { IndustryAssessmentsWorkspace } from "./industry-assessments";
import { StudentSkillReport } from "./student-skill-report";

const tabs = [
  { id: "skills", label: "Skill Assessment", icon: ClipboardCheck },
  { id: "industry", label: "Industry Assessment", icon: Building2 },
  { id: "report", label: "Skill Report", icon: BarChart3 },
];

export function StudentAssessmentHub() {
  const searchParams = useSearchParams();
  const active =
    tabs.find((tab) => tab.id === searchParams.get("tab")) ?? tabs[0];
  return (
    <DashboardShell role="student" title={active.label}>
      <div className="space-y-8">
        <WorkspaceTabs
          label="Assessment"
          href="/student/assessments"
          active={active.id}
          tabs={tabs}
        />
        <div className="assessment-hub-content">
          {active.id === "skills" && <StudentSkillAssessment embedded />}
          {active.id === "industry" && <IndustryAssessmentsWorkspace embedded />}
          {active.id === "report" && <StudentSkillReport embedded />}
        </div>
      </div>
    </DashboardShell>
  );
}
