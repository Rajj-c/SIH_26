"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";

import { RoleProvider } from "@/lib/role-context";
import { DemoCohortBanner } from "@/components/platform/demo-cohort-banner";
import { StudentChatbot } from "@/components/dashboard/student-chatbot";

interface DashboardShellProps {
  embedded?: boolean;
  role?: string;
  title?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  embedded = false,
  role = "student",
  title,
  children,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  if (embedded) return <>{children}</>;

  return (
    <RoleProvider defaultRole={role}>
      <div
        data-role={role}
        data-sidebar-collapsed={role === "student" && sidebarCollapsed}
        className="dashboard-frame min-h-screen bg-background"
      >
        <a href="#workspace-content" className="skip-navigation">
          Skip to workspace
        </a>
        {/* Sidebar (desktop) */}
        <Sidebar role={role} collapsed={role === "student" && sidebarCollapsed} />
        {role === "student" && (
          <button
            type="button"
            className="sidebar-edge-toggle"
            aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="desktop-workspace-sidebar"
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}

        {/* Main content area */}
        <div
          className={cn("dashboard-content-shell flex min-h-screen flex-col")}
        >
          <TopBar role={role} title={title} />
          <main
            id="workspace-content"
            tabIndex={-1}
            className="dashboard-main mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-8"
          >
            <DemoCohortBanner />
            {children}
          </main>
        </div>

        <MobileBottomNav role={role} />
        {role === "student" && <StudentChatbot />}
      </div>
    </RoleProvider>
  );
}
