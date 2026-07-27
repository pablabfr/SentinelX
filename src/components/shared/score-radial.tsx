"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRadialProps {
  score: number; // 0-100, higher = better (security score) unless invert
  size?: number;
  strokeWidth?: number;
  label?: string;
  colorFor?: (score: number) => string;
  className?: string;
}

const defaultColorFor = (score: number) => {
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-accent-blue)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
};

export function ScoreRadial({
  score,
  size = 180,
  strokeWidth = 12,
  label = "Security Score",
  colorFor = defaultColorFor,
  className,
}: ScoreRadialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);

  useEffect(() => {
    const controls = animate(mv, score, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, mv]);

  const offset = useTransform(mv, (v) => circumference - (v / 100) * circumference);
  const color = colorFor(score);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset, filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold tabular-nums" style={{ color }}>
          {display}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      </div>
    </div>
  );
}
