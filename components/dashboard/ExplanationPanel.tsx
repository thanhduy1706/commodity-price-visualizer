"use client"

export function ExplanationPanel() {
  return (
    <div className="lg:w-64 shrink-0 order-first border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-slate-700 pt-6 lg:pt-0 lg:pr-6">
      <div className="flex flex-col gap-6">
        {/* Mode Explanation */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Display Modes</h4>
          <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Absolute Price</span>
              <p>Shows actual USD prices. Metals use left axis ($/tonne), Oil uses right axis ($/barrel).</p>
            </div>
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Indexed (Base 100)</span>
              <p>Rebases all commodities to 100 at the start of the period. Useful for comparing relative performance and volatility.</p>
            </div>
          </div>
        </div>

        {/* Interpretation Guide */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">How to Read</h4>
          <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <p>• <span className="font-medium">Tooltip</span> shows absolute price and % change since period start.</p>
            <p>• <span className="font-medium">Correlation</span> values indicate how prices move together (-1 to +1).</p>
            <p>• Use <span className="font-medium">Range filters</span> to focus on specific timeframes.</p>
            <p>• <span className="font-medium">Brush slider</span> at bottom allows zooming into date ranges.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
