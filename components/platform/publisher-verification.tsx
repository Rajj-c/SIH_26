"use client";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
export function PublisherVerification({ ownerId }: { ownerId: string }) {
  const { data, error } = useSWR(
    "/api/organization-directory",
    async () => {
      const { data, error } = await supabase.rpc(
        "organization_verification_directory",
      );
      if (error) throw error;
      return data as {
        id: string;
        owner_id: string;
        legal_name: string;
        status: string;
      }[];
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  const record = data?.find(
    (r) => r.owner_id === ownerId && r.status === "Approved",
  );
  return (
    <p className="text-xs text-muted-foreground">
      {error
        ? "Organization verification unavailable"
        : !data
          ? "Checking organization status…"
          : record
            ? `Platform-reviewed identity: ${record.legal_name}. This does not accredit this offering.`
            : "Organization identity not currently verified by the platform."}
    </p>
  );
}
