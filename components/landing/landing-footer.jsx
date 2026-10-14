import Link from "next/link";
import { OriginWordmark } from "@/components/shared/origin-logo";

export default function LandingFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-white/10 bg-[#07090f] px-8 py-7 text-white/50">
      <Link href="/" className="text-sm text-white/70"><OriginWordmark className="text-sm" /></Link>
      <p className="text-xs tracking-[0.22em]">BUILT BY <span className="font-semibold text-white">TECH PIONEERS</span></p>
      <Link href="/privacy-policy" className="text-sm transition-colors hover:text-white">Privacy Policy ↗</Link>
    </footer>
  );
}
