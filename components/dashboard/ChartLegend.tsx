"use client"

import type { VisibleSeries, ChartColors } from "@/lib/chart/constants"

interface ChartLegendProps {
  visibleSeries: VisibleSeries
  chartColors: ChartColors
  onToggleSeries: (series: keyof VisibleSeries) => void
}

export function ChartLegend({ visibleSeries, chartColors, onToggleSeries }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap gap-6 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Metals</span>
        <button
          onClick={() => onToggleSeries('copper')}
          className={`flex items-center gap-2 transition-all duration-300 ease-out active:scale-95 ${
            visibleSeries.copper
              ? 'opacity-100 scale-100'
              : 'opacity-40 grayscale hover:opacity-70 hover:scale-105'
          }`}
          title="Toggle Copper"
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.copper }}></div>
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Copper</span>
        </button>
        <button
          onClick={() => onToggleSeries('zinc')}
          className={`flex items-center gap-2 transition-all duration-300 ease-out active:scale-95 ${
            visibleSeries.zinc
              ? 'opacity-100 scale-100'
              : 'opacity-40 grayscale hover:opacity-70 hover:scale-105'
          }`}
          title="Toggle Zinc"
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.zinc }}></div>
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Zinc</span>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Energy</span>
        <button
          onClick={() => onToggleSeries('oil')}
          className={`flex items-center gap-2 transition-all duration-300 ease-out active:scale-95 ${
            visibleSeries.oil
              ? 'opacity-100 scale-100'
              : 'opacity-40 grayscale hover:opacity-70 hover:scale-105'
          }`}
          title="Toggle Oil"
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.oil }}></div>
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Oil (WTI)</span>
        </button>
      </div>
    </div>
  )
}
