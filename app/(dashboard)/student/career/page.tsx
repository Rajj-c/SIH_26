import { Suspense } from "react";
import { StudentCareerHub } from "@/components/platform/student-career-hub";

export default function CareerPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8">Loading Career Hub…</p>}>
      <StudentCareerHub />
    </Suspense>
  );
}
