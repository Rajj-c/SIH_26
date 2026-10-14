import { Suspense } from "react";
import { StudentAssessmentHub } from "@/components/platform/student-assessment-hub";

export default function AssessmentPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8">Loading Assessment…</p>}>
      <StudentAssessmentHub />
    </Suspense>
  );
}
