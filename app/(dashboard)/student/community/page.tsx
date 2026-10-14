import { Suspense } from "react";
import { StudentCommunityHub } from "@/components/platform/student-community-hub";

export default function CommunityPage() {
  return <Suspense fallback={<p role="status" className="p-8">Loading Campus & Community…</p>}><StudentCommunityHub /></Suspense>;
}
