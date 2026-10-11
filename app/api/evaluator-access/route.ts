import { NextResponse } from "next/server";
import { evaluatorAccess } from "@/lib/evaluator-access.mjs";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(evaluatorAccess(process.env), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        mode: "disabled",
        error: "Evaluator access is not configured safely yet.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
