import { CredentialReviews } from "@/components/platform/credential-reviews";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ review?: string | string[] }>;
}) {
  const params = await searchParams;
  const review = typeof params.review === "string" ? params.review : "";
  return <CredentialReviews role="institution" selectedRequest={review} />;
}
