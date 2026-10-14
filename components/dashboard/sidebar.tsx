"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { OriginWordmark } from "@/components/shared/origin-logo";
import {
  GraduationCap,
  CalendarDays,
  Building2,
  BookOpen,
  Landmark,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Briefcase,
  Users,
  FileText,
  Target,
  FolderKanban,
  BookMarked,
  FlaskConical,
  Handshake,
  TrendingUp,
  PieChart,
  UserCheck,
  Building,
  Settings,
  School,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  activePaths?: string[];
}

export function isNavigationItemActive(
  item: NavItem,
  pathname: string,
  role: string,
) {
  return [item.href, ...(item.activePaths ?? [])].some(
    (path) =>
      pathname === path ||
      (path !== `/${role}` && pathname.startsWith(`${path}/`)),
  );
}

const roleIcons: Record<string, LucideIcon> = {
  student: GraduationCap,
  industry: Building2,
  academician: BookOpen,
  institution: Landmark,
};

const roleLabels: Record<string, string> = {
  student: "Student",
  industry: "Industry",
  academician: "Academician",
  institution: "Institution",
};

export const roleNavigation: Record<string, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Project Teams", href: "/student/collaborations", icon: Users },
    { label: "Career Hub", href: "/student/career", icon: Briefcase },
    {
      label: "Assessment",
      href: "/student/assessments",
      icon: ClipboardCheck,
      activePaths: [
        "/student/assessment",
        "/student/industry-assessments",
        "/student/report",
      ],
    },
    { label: "Campus & Community", href: "/student/community", icon: School,
      activePaths: ["/student/roster", "/student/initiatives", "/student/sessions", "/student/programs"] },
    { label: "Career Readiness", href: "/student/readiness", icon: Target },
    {
      label: "Learning Plan",
      href: "/student/learning-plan",
      icon: BookMarked,
    },
    {
      label: "Credential Reviews",
      href: "/student/credential-reviews",
      icon: FileText,
    },
  ],
  industry: [
    {
      label: "Question Bank",
      href: "/industry/question-bank",
      icon: ClipboardCheck,
    },
    { label: "Outcome Explorer", href: "/industry/outcomes", icon: TrendingUp },
    {
      label: "Challenges & Mentorship",
      href: "/industry/initiatives",
      icon: Target,
    },
    {
      label: "Organization Trust",
      href: "/industry/organization",
      icon: Building2,
    },
    {
      label: "Learning Track Studio",
      href: "/industry/learning-tracks",
      icon: BookOpen,
    },
    {
      label: "Sessions & Events",
      href: "/industry/sessions",
      icon: CalendarDays,
    },
    { label: "Dashboard", href: "/industry", icon: LayoutDashboard },
    {
      label: "Collaborations",
      href: "/industry/collaborations",
      icon: Handshake,
    },
    {
      label: "Recruitment Tracker",
      href: "/industry/recruitment-tracker",
      icon: CalendarDays,
    },
    {
      label: "Assigned Supervision",
      href: "/industry/supervision",
      icon: UserCheck,
    },
    {
      label: "Assessment Studio",
      href: "/industry/assessments",
      icon: ClipboardCheck,
    },
    { label: "Post Opportunity", href: "/industry/post", icon: Briefcase },
    { label: "Candidates", href: "/industry/candidates", icon: Users },
    { label: "Shortlisted", href: "/industry/shortlist", icon: FolderKanban },
    { label: "Programs", href: "/industry/programs", icon: BookMarked },
    {
      label: "Internship Tracking",
      href: "/industry/internships",
      icon: FolderKanban,
    },
  ],
  academician: [
    {
      label: "Question Reviews",
      href: "/academician/question-bank",
      icon: ClipboardCheck,
    },
    {
      label: "Institution Invitations",
      href: "/academician/roster",
      icon: Landmark,
    },
    {
      label: "Challenges & Mentorship",
      href: "/academician/initiatives",
      icon: Target,
    },
    {
      label: "Learning Track Studio",
      href: "/academician/learning-tracks",
      icon: BookOpen,
    },
    {
      label: "Sessions & Events",
      href: "/academician/sessions",
      icon: CalendarDays,
    },
    { label: "Dashboard", href: "/academician", icon: LayoutDashboard },
    {
      label: "Collaborations",
      href: "/academician/collaborations",
      icon: Handshake,
    },
    {
      label: "Recruitment Tracker",
      href: "/academician/recruitment-tracker",
      icon: CalendarDays,
    },
    {
      label: "Learning Programs",
      href: "/academician/programs",
      icon: BookMarked,
    },
    {
      label: "Assigned Supervision",
      href: "/academician/supervision",
      icon: UserCheck,
    },
    { label: "FDPs", href: "/academician/fdps", icon: BookMarked },
    { label: "Consultancy", href: "/academician/consultancy", icon: Handshake },
    { label: "Research", href: "/academician/research", icon: FlaskConical },
    { label: "Internships", href: "/academician/internships", icon: Briefcase },
    {
      label: "My Applications",
      href: "/academician/applications",
      icon: Target,
    },
    {
      label: "Publish Collaboration",
      href: "/academician/publish",
      icon: Handshake,
    },
    { label: "Applicants", href: "/academician/candidates", icon: Users },
  ],
  institution: [
    {
      label: "Question Reviews",
      href: "/institution/question-bank",
      icon: ClipboardCheck,
    },
    {
      label: "Outcome Explorer",
      href: "/institution/outcomes",
      icon: TrendingUp,
    },
    { label: "Roster Import", href: "/institution/roster", icon: Users },
    {
      label: "Challenges & Mentorship",
      href: "/institution/initiatives",
      icon: Target,
    },
    {
      label: "Organization Trust",
      href: "/institution/organization",
      icon: Building2,
    },
    {
      label: "Learning Track Studio",
      href: "/institution/learning-tracks",
      icon: BookOpen,
    },
    {
      label: "Sessions & Events",
      href: "/institution/sessions",
      icon: CalendarDays,
    },
    {
      label: "Credential Reviews",
      href: "/institution/credential-reviews",
      icon: FileText,
    },
    { label: "Dashboard", href: "/institution", icon: LayoutDashboard },
    {
      label: "Collaborations",
      href: "/institution/collaborations",
      icon: Handshake,
    },
    {
      label: "Recruitment Tracker",
      href: "/institution/recruitment-tracker",
      icon: CalendarDays,
    },
    {
      label: "Learning Programs",
      href: "/institution/programs",
      icon: BookMarked,
    },
    { label: "Skill Analytics", href: "/institution/skills", icon: BarChart3 },
    { label: "Placement", href: "/institution/placement", icon: TrendingUp },
    { label: "Recruitment", href: "/institution/recruitment", icon: PieChart },
    { label: "Students", href: "/institution/students", icon: UserCheck },
    { label: "Departments", href: "/institution/departments", icon: Building },
    {
      label: "Internship Tracking",
      href: "/institution/internships",
      icon: FolderKanban,
    },
    {
      label: "Publish Collaboration",
      href: "/institution/publish",
      icon: Handshake,
    },
    { label: "Applicants", href: "/institution/candidates", icon: Users },
  ],
};

interface SidebarProps {
  role?: string;
  collapsed?: boolean;
}

export function Sidebar({ role = "student", collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const navItems = [
    ...(roleNavigation[role] ?? roleNavigation.student),
    ...(role === "student"
      ? []
      : [
          {
            label: "Profile & credentials",
            href: `/${role}/profile`,
            icon: Settings,
          },
        ]),
  ];
  const RoleIcon = roleIcons[role] ?? GraduationCap;
  const roleLabel = roleLabels[role] ?? "Student";

  return (
    <aside
      id="desktop-workspace-sidebar"
      inert={collapsed}
      aria-hidden={collapsed || undefined}
      className={cn(
        "dashboard-sidebar fixed bottom-0 left-0 top-0 z-50 w-64 flex-col border-r border-border bg-card",
      )}
    >
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="overflow-hidden">
          <Link href="/" className="block">
            <OriginWordmark
              className="text-[15px] xl:text-base font-bold tracking-tight whitespace-nowrap"
              symbolClassName=""
            />
          </Link>
        </div>
      </div>

      {/* Role indicator pill */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 role-bg-soft transition-colors">
          <RoleIcon className="h-4 w-4 role-text flex-shrink-0" />
          <span className="text-xs font-medium role-text whitespace-nowrap">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        <p className="px-3 pb-2 pt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationItemActive(item, pathname, role);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "role-text font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    isActive
                      ? "role-text"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
