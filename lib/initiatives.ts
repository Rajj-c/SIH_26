"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "./supabase/client";
export interface Initiative {
  id: string;
  owner_id: string;
  publisher_name: string;
  kind: string;
  title: string;
  description: string;
  criteria: string;
  audience: string;
  deadline: string;
  capacity: number;
  status: string;
}
export interface InitiativeEntry {
  id: string;
  initiative_id: string;
  learner_id: string;
  learner_name: string;
  proposal: string;
  evidence_url: string;
  status: string;
  score: number | null;
  feedback: string | null;
}
interface Journal {
  id: string;
  entry_id: string;
  kind: string;
  message: string;
  created_at: string;
}
const KEY = "/api/initiatives";
export function useInitiatives() {
  const s = useSWR<{
    initiatives: Initiative[];
    entries: InitiativeEntry[];
    journal: Journal[];
  }>(
    KEY,
    async () => {
      async function rows(table: string) {
        const all: any[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .order("id")
            .range(offset, offset + 499);
          if (error)
            throw new Error(
              "Initiatives unavailable. Apply migration 020 and retry.",
            );
          all.push(...data);
          if (data.length < 500) return all;
        }
      }
      const [initiatives, entries, journal] = await Promise.all([
        rows("initiatives"),
        rows("initiative_entries"),
        rows("initiative_journal"),
      ]);
      return { initiatives, entries, journal };
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  return {
    data: s.data,
    loading: s.isLoading,
    error: s.error?.message as string | undefined,
    refresh: s.mutate,
  };
}
export async function initiativeAction(
  name:
    | "publish_initiative"
    | "submit_initiative_entry"
    | "update_initiative_entry"
    | "close_initiative",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
  await mutate(KEY);
}
