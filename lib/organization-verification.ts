"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "./supabase/client";
export interface Verification {
  id: string;
  owner_id: string;
  legal_name: string;
  website: string;
  evidence_url: string;
  explanation: string;
  status: string;
  reason: string | null;
  reviewed_at: string | null;
}
export interface ReviewEvent {
  id: string;
  organization_id: string;
  action: string;
  reason: string;
  created_at: string;
}
const KEY = "/api/organization-verification";
export function useOrganizationVerification() {
  const state = useSWR(
    KEY,
    async () => {
      const [requests, events, reviewer] = await Promise.all([
        supabase
          .from("organization_verifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("organization_review_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.rpc("is_platform_reviewer"),
      ]);
      if (requests.error || events.error || reviewer.error)
        throw new Error(
          "Verification workspace unavailable. Apply migration 017 and retry.",
        );
      return {
        requests: requests.data as Verification[],
        events: events.data as ReviewEvent[],
        reviewer: reviewer.data === true,
      };
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  return {
    data: state.data,
    loading: state.isLoading,
    error: state.error?.message as string | undefined,
    refresh: state.mutate,
  };
}
export async function verificationAction(
  name: "request_organization_verification" | "review_organization",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
  await mutate(KEY);
}
