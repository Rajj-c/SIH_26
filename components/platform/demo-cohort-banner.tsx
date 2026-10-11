"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
export function DemoCohortBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active)
          setDemo(
            session?.user.app_metadata?.demo_batch === "tech-pioneers-v1" ||
              session?.user.app_metadata?.evaluation_batch ===
                "tech-pioneers-public-guests-v1",
          );
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  if (!demo) return null;
  return (
    <aside
      aria-label="Demonstration data notice"
      className="mb-5 rounded-2xl border border-blue-400/30 bg-blue-100/40 px-4 py-3 text-sm text-blue-950 backdrop-blur-xl dark:bg-blue-900/20 dark:text-blue-100"
    >
      <strong>Tech Pioneers · Demonstration data</strong>
      <span className="ml-2">
        Fictional participants and simulated activity. Not real partnerships,
        credentials or placement outcomes.
      </span>
    </aside>
  );
}
