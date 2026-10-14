"use client";

import { cn } from "@/lib/utils";
import lettering from "./origin-lettering.json";

// Fixed Ethnocentric Rg artwork keeps the brand identical on every device.
function OriginLettering({ word }) {
  const { path, width, height, left, top } = lettering[word];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ height: "0.72em", width: `${(width / height) * 0.72}em` }}
      className="shrink-0"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={path} transform={`translate(${-left} ${top}) scale(1 -1)`} />
    </svg>
  );
}

export function OriginSymbol({ className, ...props }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("origin-symbol inline-block shrink-0 align-middle", className || "h-[1.15em] w-[1.15em] mx-1.5")}
      aria-hidden="true"
      {...props}
    >
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="#000000"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="0.8"
      />
      <g transform="translate(4, 4)">
        <path
          d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function OriginWordmark({ className, symbolClassName, ...props }) {
  return (
    <span
      role="img"
      aria-label="Origin Point"
      className={cn(
        "origin-wordmark inline-flex items-center tracking-tight select-none",
        className
      )}
      {...props}
    >
      <OriginLettering word="ORIGIN" />
      <OriginSymbol className={symbolClassName} />
      <OriginLettering word="POINT" />
    </span>
  );
}

export default OriginWordmark;
