import { notFound } from "next/navigation";
import { QuestionBank } from "@/components/platform/question-bank";
import type { Role } from "@/lib/platform-store";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!["industry", "academician", "institution"].includes(role)) notFound();
  return <QuestionBank role={role as Role} />;
}
