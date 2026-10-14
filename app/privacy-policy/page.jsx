import Link from "next/link";
import LandingFooter from "@/components/landing/landing-footer";
import { OriginWordmark } from "@/components/shared/origin-logo";

export const metadata = { title: "Privacy Policy", description: "How Origin Point handles account details, portfolios, assessments and shared workflow records." };

const sections = [
  ["Information you provide", "Origin Point processes account and profile details, your assigned role and organization information. Depending on the features you use, it also stores skills, projects, certifications, uploaded documents, assessment submissions, applications, learning activity, internship reports and collaboration records."],
  ["How information is used", "These records support authentication, skill mapping, portfolios, applications, recruitment, learning, supervision and institutional reporting. Assessment evidence, self-declared skills and reviewed outcomes are treated separately. Skill matching is not a guarantee of employment."],
  ["Who can access your records", "Access depends on your role and the workflow you participate in. Applications share relevant evidence with authorized recruiters. Approved institutional memberships and supervision assignments allow scoped access to student progress. Collaboration teams share records within their authorized workspaces. Review who will receive your information before submitting it."],
  ["Files and account security", "The platform uses authenticated sessions, database access policies and private file storage. Authorized users may receive short-lived links to files. Expiring a link cannot revoke a copy someone has already downloaded. Keep your account credentials private and upload only documents you are entitled to share."],
  ["Service providers and optional AI", "Supabase supports authentication, database records and file storage. Configured AI features use Google Gemini for tasks such as practice questions, draft learning plans and match explanations; relevant inputs may be sent to that provider when you use those features. Configured email workflows use Resend. Provider availability and processing depend on the deployment and enabled features."],
  ["Cookies and notifications", "Authentication uses cookies to maintain and refresh your session. The application also uses local client state and caches to support its interface, with account-change cache cleanup. In-app notifications support your workflows; optional email notification delivery depends on your preferences and deployment configuration."],
  ["Retention, corrections and requests", "Saved records support ongoing workflows and their history. This prototype does not publish a fixed retention period or an automated account-deletion guarantee. Use available profile and portfolio controls to correct your information. For access, removal or privacy questions, contact the Tech Pioneers team through the channel provided by your institution or deployment operator."],
  ["Shared evaluation accounts", "Public evaluation accounts are shared and allow visitors to change demonstration activity. Do not submit personal documents, sensitive information or real applications through these accounts. Use your own account for personal activity."],
  ["Changes to this policy", "This page describes the project’s documented prototype behavior. Features and deployment configuration may change, and the policy should be updated to reflect those changes. Your institution or deployment operator may provide additional information about its own handling of records."]
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#07090f] text-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap gap-4 items-center justify-between px-6 py-8"><Link href="/"><OriginWordmark className="text-base sm:text-lg" /></Link><Link href="/" className="text-sm text-white/60 hover:text-white">← Back to home</Link></nav>
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <p className="mb-5 text-xs tracking-[0.2em] text-cyan-200/70">YOUR INFORMATION. YOUR JOURNEY.</p>
        <h1 className="font-serif text-5xl sm:text-6xl">Privacy Policy</h1>
        <p className="mt-5 text-sm text-white/45">Last updated: 13 October 2026</p>
        <p className="mt-8 leading-8 text-white/70">Origin Point connects students, industry, academicians and institutions. This policy explains the information used to support those connections in the Tech Pioneers prototype.</p>
        <div className="mt-12 space-y-10">{sections.map(([title, body], index) => <section key={title} className="border-t border-white/10 pt-7"><h2 className="mb-3 text-xl font-medium"><span className="mr-3 text-sm text-cyan-200/50">{String(index + 1).padStart(2, "0")}</span>{title}</h2><p className="text-sm leading-7 text-white/60">{body}</p></section>)}</div>
      </article>
      <LandingFooter />
    </main>
  );
}
