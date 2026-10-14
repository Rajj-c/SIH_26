"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Factory, Presentation, School, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import styles from "./portal-journey.module.css";

const portals = [
  { role: "Student", Icon: GraduationCap, summary: "Assessments · Skill mapping · Portfolio", points: [
    ["Discover your next skill", "Assess your abilities, understand skill gaps and plan learning around the opportunities you want."],
    ["Turn progress into proof", "Build a portfolio of projects and certifications, apply for internships and track your journey through recruitment."]
  ] },
  { role: "Academician", Icon: Presentation, summary: "FDPs · Research · Student tracking", points: [
    ["Bring industry into learning", "Explore faculty development programs and faculty internships, and participate in research collaborations with industry teams."],
    ["Support every milestone", "Accept student supervision assignments, follow internship progress and review reports within authorized workspaces."]
  ] },
  { role: "Institution", Icon: School, summary: "Analytics · Placement · Accreditation", points: [
    ["See the bigger picture", "Understand your approved cohort’s skill readiness and placement outcomes through analytics, skill-demand views and scoped exports."],
    ["Coordinate trusted evidence", "Manage memberships, assign supervisors and review credentials to organize evidence for institutional reporting and accreditation preparation."]
  ] },
  { role: "Industry", Icon: Factory, summary: "Post roles · Source talent · Mentorship", points: [
    ["Find talent with evidence", "Publish opportunities, define skill requirements and review portfolios and assessment evidence through a shared recruitment timeline."],
    ["Guide practical learning", "Offer programs and mentorship, supervise internship milestones and review student work with meaningful feedback."]
  ] }
];

export default function PortalJourney() {
  const section = useRef(null);
  const viewport = useRef(null);
  const sticky = useRef(null);
  const paths = useRef([]);
  const spark = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let frame = 0;

    const update = () => {
      if (disposed || !section.current) return;
      if (reducedMotion.matches) {
        setProgress(1);
        return;
      }
      const bounds = section.current.getBoundingClientRect();
      const pinnedHeight = sticky.current?.getBoundingClientRect().height ?? window.innerHeight;
      const distance = Math.max(1, bounds.height - pinnedHeight);
      const current = Math.min(1, Math.max(0, -bounds.top / distance));
      setProgress(current);
    };

    update();
    // Keep measuring while visible: first-load layout and scroll restoration
    // can move the section without a window scroll or resize event.
    const tick = () => {
      update();
      frame = window.requestAnimationFrame(tick);
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      window.cancelAnimationFrame(frame);
      update();
      if (entry.isIntersecting && !reducedMotion.matches) {
        frame = window.requestAnimationFrame(tick);
      }
    });
    visibilityObserver.observe(section.current);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    window.addEventListener("pageshow", update);
    const observer = new ResizeObserver(update);
    if (document.body) observer.observe(document.body);
    if (section.current) observer.observe(section.current);
    if (sticky.current) observer.observe(sticky.current);
    document.fonts?.ready?.then(update);
    reducedMotion.addEventListener("change", update);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      visibilityObserver.disconnect();
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("pageshow", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  // Smooth linear progression across the section scroll without artificial dead zones
  const connection = Math.min(3, Math.max(0, progress * 3.3));
  const active = Math.min(3, Math.floor(connection));

  useEffect(() => {
    const segment = Math.min(2, active);
    const path = paths.current[segment];
    if (path && spark.current) {
      try {
        const total = path.getTotalLength();
        const point = path.getPointAtLength(total * Math.min(1, Math.max(0, connection - segment)));
        spark.current.setAttribute("cx", point.x);
        spark.current.setAttribute("cy", point.y);
      } catch {
        // SVG metrics not ready yet
      }
    }
  }, [connection, active]);

  useEffect(() => {
    const row = viewport.current;
    if (!row) return;
    const cards = row.querySelectorAll("article");
    const card = cards[active];
    if (card && row.scrollWidth > row.clientWidth) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      row.scrollTo({ left: reduced ? 0 : Math.max(0, card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2), behavior: reduced ? "instant" : "smooth" });
    }
  }, [active]);
  return (
    <section id="explore" ref={section} className={styles.journey} aria-labelledby="portal-heading">
      <div ref={sticky} className={styles.sticky}>
        <header id="about" className={styles.heading}>
          <p className={styles.eyebrow}>FOUR PORTALS. ONE CONNECTED FUTURE.</p>
          <h2 id="portal-heading">Opportunity is a <em>shared journey.</em></h2>
          <p>From your first skill to your next breakthrough. Discover how each role brings the whole ecosystem forward.</p>
        </header>
        <div ref={viewport} className={styles.viewport}>
        <div id="portals" className={styles.cards}>
          <svg className={styles.thread} viewBox="0 0 750 64" preserveAspectRatio="none" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <path ref={(element) => { paths.current[index] = element; }} key={index} d={`M ${index * 250} 64 C ${index * 250} 4, ${(index + 1) * 250} 4, ${(index + 1) * 250} 64`}
                pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, Math.max(0, connection - index))} />
            ))}
            <circle ref={spark} className={styles.spark} r="3" opacity={connection > 0 && connection < 3 ? 1 : 0} />
          </svg>
          {portals.map(({ role, Icon, summary, points }, index) => (
            <article key={role} className={`${styles.card} ${index <= active ? styles.lit : ""}`}>
              <span className={styles.sheen} aria-hidden="true" />
              <span className={styles.port} aria-hidden="true" />
              <div className={styles.cardTop}><Icon size={26} strokeWidth={1.5} /><span>0{index + 1}</span></div>
              <h3>{role}</h3>
              <p className={styles.summary}>{summary}</p>
              <ol className={styles.points}>{points.map(([title, description]) => <li key={title}><h4>{title}</h4><p>{description}</p></li>)}</ol>
              <Link href="/signup" className={styles.link}>Explore your portal <ArrowUpRight size={16} /></Link>
            </article>
          ))}
        </div>
        </div>
        <div className={styles.scrollHint}><span>SCROLL TO CONNECT</span><span>0{active + 1} / 04</span></div>
      </div>
    </section>
  );
}
