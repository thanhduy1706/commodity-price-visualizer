/**
 * Format currency with optional abbreviation (e.g., $9.5k)
 */
export function formatCurrency(value: number, abbreviated: boolean = false): string {
  if (value >= 1000 && abbreviated) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toLocaleString()}`
}

/**
 * Format date for X-axis display (e.g., "Jan '24")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

/**
 * Format percentage with sign (e.g., "+2.50%", "-1.20%")
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Format full date for tooltip display
 */
export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  })
}
