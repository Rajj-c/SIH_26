"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  Briefcase,
  Target,
  FolderKanban,
  FileText,
  CalendarDays,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OpportunityWorkspace } from "./opportunities";
import { ApplicationsWorkspace } from "./applications";
import { InternshipWorkspace } from "./application-tracking";
import { PortfolioWorkspace } from "./student-portfolio";
import { RecruitmentWorkspace } from "./recruitment";
import RubberSegment from "@/components/ui/RubberSegment";

const tabs = [
  { id: "portfolio", label: "Portfolio", icon: FileText },
  { id: "marketplace", label: "Marketplace", icon: Briefcase },
  { id: "applications", label: "Applications", icon: Target },
  { id: "internships", label: "Internship Tracking", icon: FolderKanban },
  { id: "recruitment", label: "Recruitment Tracker", icon: CalendarDays },
];

export function StudentCareerHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const active = tabs.find((tab) => tab.id === currentTab) ?? tabs[0];

  const segmentItems = tabs.map((tab) => {
    const Icon = tab.icon;
    return {
      value: tab.id,
      label: tab.label,
      icon: <Icon className="h-4 w-4 shrink-0" />,
    };
  });

  const handleTabChange = (val: string) => {
    router.replace(`/student/career?tab=${val}`, { scroll: false });
  };

  return (
    <DashboardShell role="student" title={active.label}>
      <div className="career-hub space-y-8">
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <RubberSegment
            items={segmentItems}
            value={active.id}
            onChange={handleTabChange}
            trackColor="#ffffff"
            thumbColor="#2563eb"
            textColor="#161616"
            activeTextColor="#ffffff"
            size="lg"
            radius={12}
            inset={4}
            equalSlots={false}
            stretch={100}
            squash={3}
            speed={1}
            glide={75}
            draggable
            aria-label="Career Hub Navigation"
          />
        </div>
        <div className="career-hub-content">
          {active.id === "marketplace" && (
            <OpportunityWorkspace embedded role="student" title="Marketplace" />
          )}
          {active.id === "applications" && <ApplicationsWorkspace embedded />}
          {active.id === "internships" && (
            <InternshipWorkspace embedded role="student" />
          )}
          {active.id === "portfolio" && <PortfolioWorkspace embedded />}
          {active.id === "recruitment" && (
            <RecruitmentWorkspace embedded role="student" />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
