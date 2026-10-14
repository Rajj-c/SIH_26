import { redirect } from "next/navigation";
export default function ApplicationsPage() {
  redirect("/student/career?tab=applications");
}
