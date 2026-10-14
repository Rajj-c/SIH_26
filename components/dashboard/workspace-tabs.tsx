"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceTabs({
  label,
  href,
  active,
  tabs,
}: {
  label: string;
  href: string;
  active: string;
  tabs: { id: string; label: string; icon: LucideIcon }[];
}) {
  return (
    <nav
      aria-label={label}
      className="workspace-tabs flex flex-wrap gap-2 rounded-2xl border border-border bg-card/70 p-2 shadow-sm sm:gap-3"
    >
      {tabs.map(({ id, label: title, icon: Icon }) => (
        <Link
          key={id}
          href={`${href}?tab=${id}`}
          scroll={false}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active === id
              ? "role-bg-soft role-text shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {title}
        </Link>
      ))}
    </nav>
  );
}
