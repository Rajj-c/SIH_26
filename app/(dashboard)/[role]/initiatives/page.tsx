import { notFound } from "next/navigation";
import type { Role } from "@/lib/platform-store";
import { Initiatives } from "@/components/platform/initiatives";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!["student", "industry", "academician", "institution"].includes(role))
    notFound();
  return <Initiatives role={role as Role} />;
}
