import { DisplayMode, ChartDataPoint } from "./constants"

/**
 * Calculate indexed values (Base 100) and percentage changes for chart data
 */
export function calculateChartData(data: ChartDataPoint[], mode: DisplayMode): ChartDataPoint[] {
  if (data.length === 0) return []

  // Base values (first item in valid range)
  const baseItem = data[0]
  const baseCopper = baseItem?.copper || 1
  const baseZinc = baseItem?.zinc || 1
  const baseOil = baseItem?.oil || 1

  return data.map(item => {
    // Percentage change since start of period
    const copperPct = item.copper ? ((item.copper - baseCopper) / baseCopper) * 100 : 0
    const zincPct = item.zinc ? ((item.zinc - baseZinc) / baseZinc) * 100 : 0
    const oilPct = item.oil ? ((item.oil - baseOil) / baseOil) * 100 : 0

    // Indexed value (Base 100)
    const copperIndexed = 100 + copperPct
    const zincIndexed = 100 + zincPct
    const oilIndexed = 100 + oilPct

    return {
      ...item,
      // Values for chart lines
      copper: mode === "indexed" ? copperIndexed : item.copper,
      zinc: mode === "indexed" ? zincIndexed : item.zinc,
      oil: mode === "indexed" ? oilIndexed : item.oil,
      // Raw values for tooltip
      rawCopper: item.copper,
      rawZinc: item.zinc,
      rawOil: item.oil,
      // Percentage changes for tooltip
      pctCopper: copperPct,
      pctZinc: zincPct,
      pctOil: oilPct
    }
  })
}

/**
 * Calculate 30-day rolling Pearson correlation coefficient between two data series
 */
export function calculateCorrelation(data: ChartDataPoint[], key1: keyof ChartDataPoint, key2: keyof ChartDataPoint): number {
  const validData = data.filter(d => d[key1] != null && d[key2] != null).slice(-30)
  if (validData.length < 5) return 0

  const x = validData.map(d => d[key1] as number)
  const y = validData.map(d => d[key2] as number)
  const n = x.length

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))

  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Get chart colors based on theme
 */
export function getChartColors(isDark: boolean) {
  return {
    copper: isDark ? "#E08A4E" : "#C87533",
    zinc: isDark ? "#9FB6C2" : "#6C8A9B",
    oil: isDark ? "#4A4A4A" : "#2B2B2B",
    grid: isDark ? "#334155" : "#e2e8f0",
    text: isDark ? "#94a3b8" : "#64748b",
    brushFill: isDark ? "#1e293b" : "#f8fafc",
    brushStroke: isDark ? "#475569" : "#94a3b8",
  }
}
