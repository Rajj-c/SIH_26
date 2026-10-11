"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
export interface LearningSession {
  id: string;
  owner_id: string;
  program_id: string | null;
  title: string;
  kind: string;
  audience: string;
  speaker: string;
  agenda: string;
  mode: string;
  starts_at: string;
  ends_at: string;
  registration_closes_at: string;
  capacity: number;
  status: string;
}
export interface SessionRegistration {
  id: string;
  session_id: string;
  learner_id: string;
  learner_name: string;
  status: string;
  attendance: string;
  rating: number | null;
  feedback: string | null;
  feedback_at: string | null;
}
const KEY = "/api/learning-sessions";
export function useLearningSessions() {
  const s = useSWR<{
    sessions: LearningSession[];
    registrations: SessionRegistration[];
    access: { session_id: string; location: string }[];
  }>(
    KEY,
    async () => {
      async function rows(table: string, key = "id") {
        const all: any[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .order(key)
            .range(offset, offset + 499);
          if (error)
            throw new Error(
              "Session data unavailable. Apply migration 202609220015_learning_sessions.sql, then retry.",
            );
          all.push(...data);
          if (data.length < 500) return all;
        }
      }
      const [sessions, registrations, access] = await Promise.all([
        rows("learning_sessions"),
        rows("learning_session_registrations"),
        rows("learning_session_access", "session_id"),
      ]);
      return { sessions, registrations, access };
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
export async function sessionAction(
  name:
    | "schedule_learning_session"
    | "register_learning_session"
    | "record_session_attendance"
    | "finish_learning_session"
    | "submit_session_feedback",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
  await mutate(KEY);
}
