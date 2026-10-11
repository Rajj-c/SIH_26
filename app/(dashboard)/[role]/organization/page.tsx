import { notFound } from "next/navigation";
import { OrganizationVerification } from "@/components/platform/organization-verification";
import type { Role } from "@/lib/platform-store";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!["student", "industry", "academician", "institution"].includes(role))
    notFound();
  return <OrganizationVerification role={role as Role} />;
}
