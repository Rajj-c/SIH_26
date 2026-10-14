"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, Target, CalendarDays, BookMarked } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import RubberSegment from "@/components/ui/RubberSegment";
import { RosterInvitations } from "./roster-invitations";
import { Initiatives } from "./initiatives";
import { LearningSessions } from "./learning-sessions";
import { LearningPrograms } from "./learning-programs";

const tabs = [
  { id: "invitations", label: "Institution Invitations", icon: Landmark },
  { id: "initiatives", label: "Challenges & Mentorship", icon: Target },
  { id: "sessions", label: "Sessions & Events", icon: CalendarDays },
  { id: "programs", label: "Learning Programs", icon: BookMarked },
];

export function StudentCommunityHub() {
  const router = useRouter();
  const params = useSearchParams();
  const active = tabs.find((tab) => tab.id === params.get("tab")) ?? tabs[0];
  return (
    <DashboardShell role="student" title="Campus & Community">
      <div className="community-hub space-y-8">
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <RubberSegment
            items={tabs.map(({ id, label, icon: Icon }) => ({
              value: id,
              label,
              icon: <Icon className="h-4 w-4 shrink-0" />,
            }))}
            value={active.id}
            onChange={(value: string) =>
              router.replace(`/student/community?tab=${value}`, {
                scroll: false,
              })
            }
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
            aria-label="Campus & Community Navigation"
          />
        </div>
        <div className="community-hub-content">
          {active.id === "invitations" && (
            <RosterInvitations embedded role="student" />
          )}
          {active.id === "initiatives" && (
            <Initiatives embedded role="student" />
          )}
          {active.id === "sessions" && (
            <LearningSessions embedded role="student" />
          )}
          {active.id === "programs" && (
            <LearningPrograms embedded role="student" />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
