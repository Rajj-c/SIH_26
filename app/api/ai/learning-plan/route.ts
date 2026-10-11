import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { explainReadiness } from "@/lib/readiness.mjs";
import {
  PLAN_PROMPT_VERSION,
  planPrompt,
  validatePlan,
} from "@/lib/ai/learning-planner.mjs";
import { skillKey } from "@/lib/skill-taxonomy.mjs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "Please sign in." }, 401);
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile?.role !== "student")
    return reply({ error: "Student access required." }, 403);
  let b;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return reply({ error: "Request too large." }, 413);
    b = JSON.parse(raw);
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const days = (Date.parse(b?.targetDate) - Date.parse(today)) / 86400000 + 1;
  if (
    b?.consent !== true ||
    typeof b?.targetId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(b.targetId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b.targetDate) ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 181 ||
    !Number.isInteger(b.weeklyHours) ||
    b.weeklyHours < 1 ||
    b.weeklyHours > 40
  )
    return reply(
      {
        error:
          "Choose an open target, 1–40 hours per week, a date within 180 days and consent.",
      },
      400,
    );
  if (!process.env.GEMINI_API_KEY)
    return reply({ error: "Configure GEMINI_API_KEY on the server." }, 503);
  const { data: retryAfter, error: limitError } =
    await db.rpc("reserve_ai_request");
  if (limitError || !Number.isInteger(retryAfter) || retryAfter < 0)
    return reply(
      {
        error: "AI request limits unavailable. Apply migration 018 and retry.",
      },
      503,
    );
  if (retryAfter > 0)
    return reply(
      {
        error: `AI request allowance reached. Retry in ${retryAfter} seconds.`,
      },
      429,
    );
  try {
    const { error: migrationError } = await db
      .from("ai_learning_plans")
      .select("id")
      .limit(1);
    if (migrationError)
      return reply(
        { error: "Apply migration 202609220012_ai_learning_plans.sql first." },
        503,
      );
    const { data: target, error } = await db
      .from("opportunities")
      .select("id,skills,status,deadline,audience,type")
      .eq("id", b.targetId)
      .single();
    if (
      error ||
      !target ||
      target.status !== "Open" ||
      target.deadline < today ||
      !["student", "all"].includes(target.audience) ||
      !["Job", "Internship", "Apprenticeship", "Live Project"].includes(
        target.type,
      )
    )
      return reply(
        { error: "Choose an open student job or industry engagement." },
        400,
      );
    async function rows(table: string, select: string, own = false) {
      const all: any[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = db
          .from(table)
          .select(select)
          .order("id")
          .range(offset, offset + 499);
        if (own) query = query.eq("user_id", user!.id);
        const { data, error } = await query;
        if (error) throw error;
        all.push(...data);
        if (data.length < 500) return all;
      }
    }
    const evidence = await rows(
      "skill_evidence",
      "id,skill,score,threshold,created_at",
      true,
    );
    const gaps = explainReadiness(target.skills, [], evidence)
      .filter((s) => s.status !== "Assessment-backed")
      .map((s) => ({
        skill: s.skill,
        status: s.status,
        score: s.evidence?.score ?? null,
        threshold: s.evidence?.threshold ?? null,
      }));
    if (!gaps.length)
      return reply(
        {
          error:
            "No unproven required skills were found. You can still create practice goals manually.",
        },
        422,
      );
    const keys = new Set(gaps.map((g) => skillKey(g.skill)));
    const programs = await rows(
      "learning_programs",
      "id,opportunity:opportunities(title,skills,audience,status,deadline,type)",
    );
    const resources = programs
      .filter(
        (p) =>
          p.opportunity &&
          p.opportunity.status === "Open" &&
          p.opportunity.deadline >= today &&
          ["student", "all"].includes(p.opportunity.audience) &&
          ["Training", "Workshop", "Mentorship"].includes(p.opportunity.type) &&
          p.opportunity.skills.some((s: string) => keys.has(skillKey(s))),
      )
      .slice(0, 40)
      .map((p) => ({
        id: p.id,
        title: p.opportunity.title,
        skills: p.opportunity.skills,
      }));
    const context = {
      gaps,
      resources,
      weeks: Math.ceil(days / 7),
      weekly_hours: b.weeklyHours,
    };
    if (JSON.stringify(context).length > 22000)
      return reply(
        { error: "Target contains too many requirements for this planner." },
        422,
      );
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: planPrompt }] },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(context) }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 6000,
          },
        }),
      },
    );
    if (!response.ok)
      return reply(
        { error: "Gemini is unavailable. No plan was invented or saved." },
        503,
      );
    const result = await response.json(),
      candidate = result.candidates?.[0];
    const text = candidate?.content?.parts
      ?.filter((p: any) => typeof p.text === "string" && !p.thought)
      .map((p: any) => p.text)
      .join("");
    if (candidate?.finishReason !== "STOP" || !text || text.length > 30000)
      return reply(
        { error: "Gemini returned an incomplete plan. Try again." },
        502,
      );
    let draft;
    try {
      draft = validatePlan(JSON.parse(text), context);
    } catch {
      return reply(
        {
          error:
            "AI plan failed skill, resource or workload validation. Nothing was saved.",
        },
        502,
      );
    }
    const { data: plan, error: saveError } = await db
      .from("ai_learning_plans")
      .insert({
        target_id: target.id,
        target_date: b.targetDate,
        weekly_hours: b.weeklyHours,
        model,
        prompt_version: PLAN_PROMPT_VERSION,
        draft,
      })
      .select("*")
      .single();
    if (saveError)
      return reply(
        {
          error:
            "The draft could not be saved. Retry; no learning goals were created.",
        },
        503,
      );
    return reply({ plan });
  } catch {
    return reply(
      {
        error:
          "Could not create a learning draft. Your existing goals are unchanged.",
      },
      503,
    );
  }
}
