"use client";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useAction } from "./primitives";
export function EmailPreferences() {
  const action = useAction();
  const state = useSWR(
    "/api/notifications/email-preferences",
    async () => {
      const r = await fetch("/api/notifications/email-preferences", {
        cache: "no-store",
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      return b;
    },
    { shouldRetryOnError: false },
  );
  return (
    <section className="glass-panel rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold">Daily email updates</h2>
      <p className="text-xs text-muted-foreground">
        Optional, off by default. Your account email is shared with the email
        delivery provider to send a generic inbox reminder, without meeting
        links, scores or private application details. Delivery requires the
        server worker to be scheduled.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      )}
      {action.feedback}
      {state.data && (
        <>
          <p className="text-xs text-muted-foreground">
            {state.data.configured
              ? "Server configuration present; scheduling and delivery must be verified by the administrator."
              : "Delivery is not configured. Your preference can be saved, but no delivery is promised."}
          </p>
          <Button
            variant="outline"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error("Sign in required");
                const { error } = await supabase
                  .from("notification_email_preferences")
                  .upsert({ user_id: user.id, enabled: !state.data.enabled });
                if (error) throw error;
                await state.mutate();
              }, "Email preference saved.")
            }
          >
            {state.data.enabled
              ? "Disable daily emails"
              : "Consent and enable daily emails"}
          </Button>
        </>
      )}
    </section>
  );
}
