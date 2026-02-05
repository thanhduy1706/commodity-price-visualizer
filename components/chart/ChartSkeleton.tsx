"use client"

import { ChartBarIcon } from "@heroicons/react/24/outline"

/**
 * Loading skeleton with shimmer animation for chart placeholder
 */
export function ChartSkeleton() {
  return (
    <div className="relative h-full w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3">
        <ChartBarIcon className="h-16 w-16 animate-pulse opacity-50" />
        <span className="font-medium tracking-wide text-sm animate-pulse">Loading market data...</span>
      </div>
    </div>
  )
}
