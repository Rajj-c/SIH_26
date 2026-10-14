/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      /* ── Color system ─────────────────────────── */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        /* Fixed brand ramp for marketing surfaces */
        brand: {
          indigo: "hsl(var(--brand-indigo))",
          violet: "hsl(var(--brand-violet))",
          cyan: "hsl(var(--brand-cyan))",
          emerald: "hsl(var(--brand-emerald))",
          amber: "hsl(var(--brand-amber))",
        },
        /* Role-aware accent colors */
        role: {
          DEFAULT: "hsl(var(--role-primary))",
          foreground: "hsl(var(--role-primary-foreground))",
          soft: "hsl(var(--role-primary-soft))",
          surface: "hsl(var(--role-surface))",
        },
      },

      /* ── Typography ─────────────────────────── */
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        hero: ["clamp(2.5rem, 5vw + 1rem, 5rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-lg": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        "display-md": ["3rem", { lineHeight: "1.12", letterSpacing: "-0.025em" }],
        "display-sm": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
      },

      /* ── Spacing ─────────────────────────── */
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "sidebar": "16rem",
        "sidebar-collapsed": "4.5rem",
      },

      /* ── Border radius ─────────────────────── */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },

      /* ── Box shadows ─────────────────────── */
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow) hsl(var(--role-primary) / 0.15)",
        "glow-lg": "var(--shadow-glow) hsl(var(--role-primary) / 0.25)",
      },

      /* ── Transitions ─────────────────────── */
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
        smooth: "var(--ease-smooth)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },

      /* ── Animations ─────────────────────── */
      animation: {
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.4s var(--ease-smooth) both",
        "fade-in": "fade-in 0.3s ease both",
        "scale-in": "scale-in 0.3s var(--ease-spring) both",
        "spin-slow": "spin-slow 20s linear infinite",
        "spin-reverse": "spin-slow 28s linear infinite reverse",
        "orbit": "orbit 18s linear infinite",
        "tilt": "tilt 8s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--role-primary) / 0.3)" },
          "50%": { boxShadow: "0 0 0 8px hsl(var(--role-primary) / 0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        orbit: {
          from: { transform: "rotate(0deg) translateX(var(--orbit-r, 8rem)) rotate(0deg)" },
          to: { transform: "rotate(360deg) translateX(var(--orbit-r, 8rem)) rotate(-360deg)" },
        },
        tilt: {
          "0%, 100%": { transform: "rotate(-1.5deg)" },
          "50%": { transform: "rotate(1.5deg)" },
        },
      },

      /* ── Z-index scale ─────────────────────── */
      zIndex: {
        dropdown: "50",
        sticky: "100",
        overlay: "200",
        modal: "300",
        toast: "400",
        command: "500",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
