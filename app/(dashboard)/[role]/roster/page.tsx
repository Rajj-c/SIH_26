import { notFound } from "next/navigation";
import type { Role } from "@/lib/platform-store";
import { RosterInvitations } from "@/components/platform/roster-invitations";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!["student", "academician", "institution"].includes(role)) notFound();
  return <RosterInvitations role={role as Role} />;
}
