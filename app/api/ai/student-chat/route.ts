import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OFF_TOPIC_REPLY, STUDENT_CHAT_SCOPE, STUDENT_CHAT_PROMPT, validateChatInput, guardedChatReply } from "@/lib/ai/student-chat.mjs";

export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
// Per-process protection; use a shared limiter when deploying multiple replicas.
const windows = new Map<string, { count: number; until: number }>();
function reserve(userId: string) {
  const now = Date.now();
  for (const [id, value] of windows) if (value.until <= now) windows.delete(id);
  const window = windows.get(userId) ?? { count: 0, until: now + 60000 };
  if (window.count >= 10 || (!windows.has(userId) && windows.size >= 10000)) return Math.max(1, Math.ceil((window.until - now) / 1000));
  window.count += 1;
  windows.set(userId, window);
  return 0;
}

export async function POST(req: Request) {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return reply({ error: "Please sign in to use the student assistant." }, 401);
    const { data: profile, error } = await db.from("profiles").select("role").eq("id", user.id).single();
    if (error || profile?.role !== "student") return reply({ error: "This assistant is available to students only." }, 403);
    let input;
    try {
      const raw = await req.text();
      if (raw.length > 40000) return reply({ error: "This conversation is too long. Please start a new chat." }, 413);
      input = validateChatInput(JSON.parse(raw));
    } catch { return reply({ error: "Please send a valid message." }, 400); }
    if (!input) return reply({ error: "Please enter a message of 1–1,500 characters." }, 400);
    const key = process.env.GEMINI_API_KEY;
    if (!key) return reply({ error: "The student assistant is not configured yet." }, 503);
    const retryAfter = reserve(user.id);
    if (retryAfter > 0) return reply({ error: `Please wait ${retryAfter} seconds before another AI request.` }, 429);
    const signal = AbortSignal.timeout(30000);
    async function generate(instruction: string, schema: object) {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1800, responseMimeType: "application/json", responseJsonSchema: schema },
        }),
      });
      if (!response.ok) throw new Error("Provider unavailable");
      const data = await response.json();
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason !== "STOP") throw new Error("Incomplete answer");
      const text = candidate.content?.parts?.filter((part: { text?: string; thought?: boolean }) => typeof part.text === "string" && !part.thought).map((part: { text: string }) => part.text).join("");
      return JSON.parse(text);
    }
    // A separate scope gate runs before answer generation; denied output is never returned.
    const scope = await generate(STUDENT_CHAT_SCOPE, { type: "object", properties: { allowed: { type: "boolean" } }, required: ["allowed"], additionalProperties: false });
    if (scope.allowed !== true) return reply({ text: OFF_TOPIC_REPLY });
    const result = await generate(STUDENT_CHAT_PROMPT, { type: "object", properties: { allowed: { type: "boolean" }, answer: { type: "string" } }, required: ["allowed", "answer"], additionalProperties: false });
    return reply({ text: guardedChatReply(result) });
  } catch {
    return reply({ error: "The assistant couldn’t respond right now. Please try again shortly." }, 503);
  }
}
