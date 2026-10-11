import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function authorized(request: Request) {
  const secret = process.env.NOTIFICATION_JOB_SECRET;
  if (!secret || secret.length < 32) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!authorized(request)) return reply({ error: "Unauthorized" }, 401);
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL ||
    !process.env.NEXT_PUBLIC_APP_URL
  )
    return reply({ error: "Email delivery is not configured." }, 503);
  let origin;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
    origin = url.origin;
  } catch {
    return reply({ error: "Configure the public HTTPS application URL." }, 503);
  }
  try {
    const db = createAdminClient();
    const { data: jobs, error } = await db.rpc("claim_notification_emails", {
      app_origin: origin,
      sender: process.env.RESEND_FROM_EMAIL,
    });
    if (error) throw error;
    const results = await Promise.all(
      (jobs ?? []).map(async (job: any) => {
        let accepted = false;
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `origin-notification/${job.job_id}`,
            },
            body: JSON.stringify(job.payload),
            signal: AbortSignal.timeout(20000),
          });
          accepted = response.ok;
        } catch {
          /* A later lease retries the same stored payload and provider idempotency key. */
        }
        const { error: ackError } = await db.rpc("finish_notification_email", {
          job: job.job_id,
          lease: job.lease,
          delivered: accepted,
        });
        return accepted && !ackError;
      }),
    );
    return reply({
      claimed: results.length,
      acceptedByProvider: results.filter(Boolean).length,
      retryPending: results.filter((r) => !r).length,
    });
  } catch {
    return reply({ error: "Notification delivery unavailable." }, 503);
  }
}
