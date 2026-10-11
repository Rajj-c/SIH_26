import { notFound } from "next/navigation";
import type { Role } from "@/lib/platform-store";
import { OutcomeTrends } from "@/components/platform/outcome-trends";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!["industry", "institution"].includes(role)) notFound();
  return <OutcomeTrends role={role as Role} />;
}
