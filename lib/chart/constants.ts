// Chart color palettes for light and dark modes
export const CHART_COLORS = {
  light: {
    copper: "#C87533",
    zinc: "#6C8A9B",
    oil: "#2B2B2B",
    grid: "#e2e8f0",
    text: "#64748b",
    brushFill: "#f8fafc",
    brushStroke: "#94a3b8",
  },
  dark: {
    copper: "#E08A4E",
    zinc: "#9FB6C2",
    oil: "#4A4A4A",
    grid: "#334155",
    text: "#94a3b8",
    brushFill: "#1e293b",
    brushStroke: "#475569",
  },
} as const

// Legacy COLORS constant for backwards compatibility
export const COLORS = {
  copper: "#C87533",
  zinc: "#6C8A9B",
  oil: "#2B2B2B",
}

// Date range filter options
export const DATE_FILTERS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "YTD", months: -1 }, // Special case
  { label: "1Y", months: 12 },
  { label: "Max", months: 0 },
] as const

// Types
export type DateFilterType = typeof DATE_FILTERS[number]["label"] | "Custom"
export type DisplayMode = "absolute" | "indexed"

export interface ChartColors {
  copper: string
  zinc: string
  oil: string
  grid: string
  text: string
  brushFill: string
  brushStroke: string
}

export interface VisibleSeries {
  copper: boolean
  zinc: boolean
  oil: boolean
}

export interface ChartDataPoint {
  date: string
  copper?: number
  zinc?: number
  oil?: number
  rawCopper?: number
  rawZinc?: number
  rawOil?: number
  pctCopper?: number
  pctZinc?: number
  pctOil?: number
}
