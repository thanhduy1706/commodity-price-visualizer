"use client"

import { formatCurrency, formatPercent, formatFullDate } from "@/lib/chart/formatters"
import { COLORS, ChartColors, VisibleSeries } from "@/lib/chart/constants"

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  displayMode: "absolute" | "indexed"
  visibleSeries: VisibleSeries
  colors?: Partial<ChartColors>
}

/**
 * Custom tooltip for commodity price chart
 * Displays detailed price information with color-coded indicators
 */
export function CustomTooltip({
  active,
  payload,
  label,
  displayMode,
  visibleSeries,
  colors
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  // Use passed colors or fallback to defaults
  const themeColors = { ...COLORS, ...colors }
  const dataItem = payload[0].payload

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 min-w-[200px]">
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
        {formatFullDate(label || "")}
      </p>

      <div className="space-y-3">
        {(visibleSeries.copper || visibleSeries.zinc) && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metals</p>
        )}

        {/* Copper */}
        {visibleSeries.copper && dataItem.rawCopper != null && (
          <TooltipRow
            color={themeColors.copper}
            label="Copper"
            value={formatCurrency(dataItem.rawCopper)}
            unit="/ tonne"
            percentChange={dataItem.pctCopper}
          />
        )}

        {/* Zinc */}
        {visibleSeries.zinc && dataItem.rawZinc != null && (
          <TooltipRow
            color={themeColors.zinc}
            label="Zinc"
            value={formatCurrency(dataItem.rawZinc)}
            unit="/ tonne"
            percentChange={dataItem.pctZinc}
          />
        )}

        {visibleSeries.oil && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-700">Energy</p>
        )}

        {/* Oil */}
        {visibleSeries.oil && dataItem.rawOil != null && (
          <TooltipRow
            color={themeColors.oil}
            label="Crude Oil"
            value={`$${dataItem.rawOil.toFixed(2)}`}
            unit="/ barrel"
            percentChange={dataItem.pctOil}
          />
        )}
      </div>
    </div>
  )
}

interface TooltipRowProps {
  color: string
  label: string
  value: string
  unit: string
  percentChange: number
}

function TooltipRow({ color, label, value, unit, percentChange }: TooltipRowProps) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: color }}></span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <span className={`text-xs ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(percentChange)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
        <span className="text-xs text-slate-400 block">{unit}</span>
      </div>
    </div>
  )
}
