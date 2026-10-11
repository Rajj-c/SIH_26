"use client";
import useSWR from "swr";
import { supabase } from "./supabase/client";
import type { IndustryQuestion } from "./industry-assessments";
export interface BankItem {
  id: string;
  owner_id: string;
  question: IndustryQuestion;
  status: string;
  reason: string | null;
  history: {
    id: string;
    decision: string;
    reason: string;
    created_at: string;
  }[];
}
export function useQuestionBank() {
  const state = useSWR(
    "/api/question-bank",
    async () => {
      const [items, reviewer] = await Promise.all([
        supabase.rpc("question_bank_items"),
        supabase.rpc("is_question_reviewer"),
      ]);
      if (items.error || reviewer.error)
        throw new Error(
          "Question bank unavailable. Apply migration 023 and retry.",
        );
      return {
        items: items.data as BankItem[],
        reviewer: reviewer.data === true,
      };
    },
    { shouldRetryOnError: false },
  );
  return {
    data: state.data,
    loading: state.isLoading,
    error: state.error?.message as string | undefined,
    refresh: state.mutate,
  };
}
export async function submitQuestionBank(assessment: string) {
  const { data, error } = await supabase.rpc("submit_question_bank", {
    assessment,
  });
  if (error) throw new Error(error.message);
  return data as number;
}
