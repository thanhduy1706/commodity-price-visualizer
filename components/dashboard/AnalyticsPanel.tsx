"use client"

import { CorrelationBadge } from "@/components/chart"

interface AnalyticsPanelProps {
  correlations: {
    copperOil: number
    zincOil: number
    copperZinc: number
  }
}

export function AnalyticsPanel({ correlations }: AnalyticsPanelProps) {
  return (
    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg gsap-analytics-panel overflow-hidden">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
        30-Day Rolling Correlation
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <CorrelationBadge label="Copper / Oil" value={correlations.copperOil} />
        <CorrelationBadge label="Zinc / Oil" value={correlations.zincOil} />
        <CorrelationBadge label="Copper / Zinc" value={correlations.copperZinc} />
      </div>
    </div>
  )
}
