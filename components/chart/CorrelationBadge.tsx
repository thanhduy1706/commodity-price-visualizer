"use client"

import { CountUp } from "./CountUp"

interface CorrelationBadgeProps {
  label: string
  value: number
}

/**
 * Displays a correlation value with color-coded styling
 * - Green for strong positive correlation (> 0.5)
 * - Red for strong negative correlation (< -0.5)
 * - Neutral for weak correlation
 */
export function CorrelationBadge({ label, value }: CorrelationBadgeProps) {
  const color = value > 0.5
    ? "text-green-600 dark:text-green-400"
    : value < -0.5
      ? "text-red-600 dark:text-red-400"
      : "text-slate-500 dark:text-slate-400"

  const bg = value > 0.5
    ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800"
    : value < -0.5
      ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800"
      : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${bg} transition-transform hover:scale-105 duration-300`}>
      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</span>
      <span className={`text-sm font-bold ${color}`}>
        <CountUp value={value} />
      </span>
    </div>
  )
}
