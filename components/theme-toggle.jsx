"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const modes = [
    { value: "light", icon: Sun, label: "Light mode" },
    { value: "dark", icon: Moon, label: "Dark mode" },
  ];

  const currentIndex = modes.findIndex((m) => m.value === resolvedTheme);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  const CurrentIcon = modes[currentIndex]?.icon || Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextMode.value)}
      className={cn(
        "h-9 w-9 rounded-full transition-colors duration-normal hover:bg-muted",
        className
      )}
      aria-label={`Switch to ${nextMode.label}`}
    >
      <CurrentIcon className="h-[1.15rem] w-[1.15rem] transition-transform duration-normal" />
    </Button>
  );
}
