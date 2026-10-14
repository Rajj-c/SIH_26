"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

import "./CometDial.css";

const R = 80;
const K = 12;
const V_FULL = 4;
const TAU_V = 0.05;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const decimalsOf = (step) => {
  const s = String(step);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
};
const pointAt = (deg) => {
  const a = (deg * Math.PI) / 180;
  return [100 + Math.cos(a) * R, 100 + Math.sin(a) * R];
};
const arcPath = (a0, a1) => {
  if (a1 - a0 >= 359.999)
    return `${arcPath(a0, a0 + 180)} ${arcPath(a0 + 180, a0 + 360)}`;
  const [x0, y0] = pointAt(a0);
  const [x1, y1] = pointAt(a1);
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`;
};

export default function CometDial({
  value = 0,
  defaultValue = 62,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  label = "Profile completeness",
  accent = "#f5f5f5",
  ink = "#fdfdfd",
  size = 250,
  sweep = 360,
  thickness = 5,
  speed = 25,
  tapBounce = 0.2,
  cometReach = 180,
  cometWidth = 12,
  disabled = false,
  className = "",
}) {
  const reduce = useReducedMotion();
  const svgRef = useRef(null);
  const litRef = useRef(null);
  const headRef = useRef(null);
  const comet = useRef([]);
  const figure = useRef(null);
  const target = useRef(clamp(value ?? defaultValue, min, max));
  const loop = useRef({
    raf: 0,
    last: 0,
    v: 0,
    rPrev: null,
    text: "",
    valueText: "",
  });
  const reading = useMotionValue(target.current);

  const range = Math.max(1e-9, max - min);
  const start = -90;
  const end = start + sweep;
  const decimals = decimalsOf(step);
  const k = 200 + (clamp(speed, 0, 100) / 100) * 700;
  const crit = 2 * Math.sqrt(k);
  const snap = (v) =>
    step > 0
      ? clamp(Math.round((v - min) / step) * step + min, min, max)
      : clamp(v, min, max);

  const paintRef = useRef(null);
  const tick = useCallback((now) => paintRef.current?.(now), []);
  const wake = () => {
    const L = loop.current;
    if (L.raf) return;
    L.last = performance.now();
    L.rPrev = null;
    L.raf = requestAnimationFrame(tick);
  };
  const launch = (to, bounce, velocity = reading.getVelocity()) => {
    reading.stop();
    if (reduce) {
      reading.jump(to);
      wake();
      return;
    }
    animate(reading, to, {
      type: "spring",
      stiffness: k,
      damping: crit * (1 - clamp(bounce, 0, 0.9)),
      mass: 1,
      velocity,
    });
    wake();
  };

  const paint = (now) => {
    const L = loop.current;
    const svg = svgRef.current;
    if (!svg) {
      L.raf = 0;
      return;
    }
    const dt = clamp((now - L.last) / 1000, 0, 0.05);
    L.last = now;
    const r = reading.get();
    const vRaw =
      L.rPrev == null || dt === 0 || reduce ? 0 : (r - L.rPrev) / dt / range;
    L.rPrev = r;
    L.v += (vRaw - L.v) * (1 - Math.exp(-dt / TAU_V));
    const v = L.v;
    const s = clamp(Math.abs(v) / V_FULL, 0, 1);
    const dir = Math.sign(v) || 1;
    const f = clamp((r - min) / range, 0, 1);
    const ang = start + f * sweep;
    if (litRef.current)
      litRef.current.setAttribute("d", f > 0.0005 ? arcPath(start, ang) : "");
    if (headRef.current) {
      const [cx, cy] = pointAt(ang);
      headRef.current.setAttribute("cx", cx.toFixed(3));
      headRef.current.setAttribute("cy", cy.toFixed(3));
    }
    const seg = (cometReach * s) / K;
    for (let j = 0; j < K; j++) {
      const el = comet.current[j];
      if (!el) continue;
      let a0 = dir > 0 ? ang - (j + 1) * seg : ang + j * seg;
      let a1 = dir > 0 ? ang - j * seg : ang + (j + 1) * seg;
      a0 = clamp(a0, start, end);
      a1 = clamp(a1, start, end);
      if (seg < 0.01 || a1 - a0 < 0.01) {
        if (el.style.opacity !== "0") el.style.opacity = "0";
        continue;
      }
      const w = 1 - j / K;
      el.setAttribute("d", arcPath(a0, a1));
      el.setAttribute(
        "stroke-width",
        (thickness + cometWidth * w * s).toFixed(2),
      );
      el.style.opacity = (w * s).toFixed(3);
    }
    const shown = clamp(r, min, max).toFixed(decimals);
    if (shown !== L.text) {
      L.text = shown;
      if (figure.current) figure.current.textContent = shown;
      svg.setAttribute("aria-valuenow", shown);
    }
    const valueText = `${target.current}${unit}`;
    if (valueText !== L.valueText) {
      L.valueText = valueText;
      svg.setAttribute("aria-valuetext", valueText);
    }
    const moving = reading.isAnimating() || Math.abs(v) > 0.002;
    if (!moving) {
      for (const el of comet.current)
        if (el && el.style.opacity !== "0") el.style.opacity = "0";
    }
    L.raf = moving ? requestAnimationFrame(tick) : 0;
  };
  paintRef.current = paint;

  useLayoutEffect(() => {
    const L = loop.current;
    L.text = "";
    L.valueText = "";
    paintRef.current?.(performance.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step, sweep, thickness, cometReach, cometWidth, unit]);
  useEffect(() => {
    if (value === undefined) return;
    const s = snap(value);
    if (s === target.current) return;
    target.current = s;
    launch(s, tapBounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(
    () => () => {
      cancelAnimationFrame(loop.current.raf);
      reading.stop();
    },
    [reading],
  );

  return (
    <div
      className={`comet-dial${className ? ` ${className}` : ""}`}
      data-disabled={disabled ? "" : undefined}
      style={{
        "--cd-accent": accent,
        "--cd-ink": ink,
        "--cd-size": `${size}px`,
        "--cd-figure": `${Math.round(size * 0.16)}px`,
      }}
    >
      <svg
        ref={svgRef}
        className="comet-dial__ring"
        viewBox="0 0 200 200"
        role="progressbar"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={target.current}
        aria-valuetext={`${target.current}${unit}`}
      >
        <path
          className="comet-dial__track"
          d={arcPath(start, end)}
          strokeWidth={thickness}
        />
        <path
          ref={litRef}
          className="comet-dial__lit"
          strokeWidth={thickness}
        />
        <g className="comet-dial__comet">
          {Array.from({ length: K }, (_, j) => (
            <path
              key={j}
              ref={(el) => {
                comet.current[j] = el;
              }}
              style={{ opacity: 0 }}
            />
          ))}
        </g>
        <circle
          ref={headRef}
          className="comet-dial__head"
          r={thickness * 1.8}
        />
      </svg>
      <div className="comet-dial__readout" aria-hidden="true">
        <span className="comet-dial__value">
          <span ref={figure} className="comet-dial__figure" />
          {unit ? <span className="comet-dial__unit">{unit}</span> : null}
        </span>
      </div>
    </div>
  );
}
