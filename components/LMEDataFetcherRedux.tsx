"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { toast } from "sonner"
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClipboardDocumentIcon,
  PhotoIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  Legend,
} from "recharts"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchFreshData, loadFromDatabase, clearError } from "@/lib/redux/slices/commoditySlice"
import { setShowChart } from "@/lib/redux/slices/uiSlice"
import { toPng } from "html-to-image"
import * as XLSX from "xlsx"

// Commodity colors
const COLORS = {
  copper: "#C87533",
  zinc: "#6C8A9B",
  oil: "#2B2B2B",
}

// Date range filter options
const DATE_FILTERS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "YTD", months: -1 }, // Special case
  { label: "1Y", months: 12 },
  { label: "Max", months: 0 },
] as const

type DateFilterType = typeof DATE_FILTERS[number]["label"]
type DisplayMode = "absolute" | "indexed"

// Format currency with abbreviation
function formatCurrency(value: number, isLarge: boolean = false): string {
  if (value >= 1000 && isLarge) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toLocaleString()}`
}

// Format date for X-axis
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

// Format percentage
function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

// Calculate indexed values and percentage change
function calculateChartData(data: any[], mode: DisplayMode) {
  if (data.length === 0) return []

  // Base values (first item in valid range)
  const baseitem = data[0]
  const baseCopper = baseitem?.copper || 1
  const baseZinc = baseitem?.zinc || 1
  const baseOil = baseitem?.oil || 1

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

// ... correlation function ...
// Calculate 30-day rolling correlation
function calculateCorrelation(data: any[], key1: string, key2: string): number {
  const validData = data.filter(d => d[key1] != null && d[key2] != null).slice(-30)
  if (validData.length < 5) return 0

  const x = validData.map(d => d[key1])
  const y = validData.map(d => d[key2])
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

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, displayMode }: any) => {
  if (!active || !payload || !payload.length) return null

  // Helper to find the original raw value and pct from payload
  // Payload values might be indexed, so we look for custom props we added
  const dataItem = payload[0].payload

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 min-w-[200px]">
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
        {new Date(label).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        })}
      </p>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metals</p>

        {/* Copper */}
        {dataItem.rawCopper != null && (
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: COLORS.copper }}></span>
               <div className="flex flex-col">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Copper</span>
                 <span className={`text-xs ${dataItem.pctCopper >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(dataItem.pctCopper)}
                 </span>
               </div>
            </div>
            <div className="text-right">
               <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                 {formatCurrency(dataItem.rawCopper)}
               </span>
               <span className="text-xs text-slate-400 block">/ tonne</span>
            </div>
          </div>
        )}

        {/* Zinc */}
        {dataItem.rawZinc != null && (
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: COLORS.zinc }}></span>
               <div className="flex flex-col">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Zinc</span>
                 <span className={`text-xs ${dataItem.pctZinc >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(dataItem.pctZinc)}
                 </span>
               </div>
            </div>
            <div className="text-right">
               <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                 {formatCurrency(dataItem.rawZinc)}
               </span>
               <span className="text-xs text-slate-400 block">/ tonne</span>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-700">Energy</p>

        {/* Oil */}
        {dataItem.rawOil != null && (
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: COLORS.oil }}></span>
               <div className="flex flex-col">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Crude Oil</span>
                 <span className={`text-xs ${dataItem.pctOil >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(dataItem.pctOil)}
                 </span>
               </div>
            </div>
            <div className="text-right">
               <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                 ${dataItem.rawOil.toFixed(2)}
               </span>
               <span className="text-xs text-slate-400 block">/ barrel</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


// Correlation Badge Component
const CorrelationBadge = ({ label, value }: { label: string; value: number }) => {
  const color = value > 0.5 ? "text-green-600" : value < -0.5 ? "text-red-600" : "text-slate-500"
  const bg = value > 0.5 ? "bg-green-50" : value < -0.5 ? "bg-red-50" : "bg-slate-50"

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

// Loading Skeleton
const ChartSkeleton = () => (
  <div className="h-[450px] w-full bg-slate-50 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-slate-400 flex flex-col items-center gap-2">
      <ChartBarIcon className="h-12 w-12 animate-pulse" />
      <span>Loading chart data...</span>
    </div>
  </div>
)

export default function LMEDataFetcherRedux() {
  const dispatch = useAppDispatch()
  const chartRef = useRef<HTMLDivElement>(null)

  // Local state
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilterType>("Max")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("absolute")
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Redux state
  const { chartData, loading, error, lastFetchTime, dataSource } = useAppSelector((state) => state.commodity)
  const { showChart } = useAppSelector((state) => state.ui)

  // Filter chart data based on selected date range
  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []

    let cutoffStr = ""
    const now = new Date()

    if (dateFilter === "Max") {
      return chartData
    } else if (dateFilter === "YTD") {
      cutoffStr = `${now.getFullYear()}-01-01`
    } else {
      const filterConfig = DATE_FILTERS.find(f => f.label === dateFilter)
      if (!filterConfig || filterConfig.months === 0) {
         // Max filter -> Enforce 2023-01-01 start
         cutoffStr = "2023-01-01"
      } else {
         const cutoffDate = new Date(now.getFullYear(), now.getMonth() - filterConfig.months, now.getDate())
         cutoffStr = cutoffDate.toISOString().split("T")[0]
         // Ensure we don't go before 2023-01-01 even for specific ranges if they happen to overlap
         if (cutoffStr < "2023-01-01") cutoffStr = "2023-01-01"
      }
    }

    return chartData.filter(item => item.date >= cutoffStr)
  }, [chartData, dateFilter])

  // Calculate display data based on mode
  const displayData = useMemo(() => {
    return calculateChartData(filteredChartData, displayMode)
  }, [filteredChartData, displayMode])

  // Calculate correlations
  const correlations = useMemo(() => {
    return {
      copperOil: calculateCorrelation(filteredChartData, "copper", "oil"),
      zincOil: calculateCorrelation(filteredChartData, "zinc", "oil"),
      copperZinc: calculateCorrelation(filteredChartData, "copper", "zinc"),
    }
  }, [filteredChartData])

  // Load from database on mount
  useEffect(() => {
    dispatch(loadFromDatabase())
    dispatch(setShowChart(true))
  }, [dispatch])

  // Handle errors with toast
  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  // Simulate loading progress
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loading) {
      setLoadingProgress(0)
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.floor(Math.random() * 10) + 5
        })
      }, 800)
    } else {
      setLoadingProgress(100)
      const timer = setTimeout(() => setLoadingProgress(0), 1000)
      return () => clearTimeout(timer)
    }
    return () => clearInterval(interval)
  }, [loading])

  async function handleFetchFresh() {
    dispatch(clearError())

    const result = await dispatch(fetchFreshData())

    if (fetchFreshData.fulfilled.match(result)) {
      dispatch(setShowChart(true))
      toast.success(`Successfully fetched and saved ${result.payload.length} data points!`)
    }
  }

  function handleDownloadExcel() {
    if (filteredChartData.length === 0) return

    try {
      // Prepare data with headers
      const excelData = filteredChartData.map(row => ({
        "Date": row.date,
        "Copper ($/tonne)": row.copper || "",
        "Zinc ($/tonne)": row.zinc || "",
        "Oil ($/barrel)": row.oil || ""
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      ws["!cols"] = [
        { wch: 12 },  // Date
        { wch: 18 },  // Copper
        { wch: 16 },  // Zinc
        { wch: 16 },  // Oil
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Commodity Prices")

      // Generate and download
      XLSX.writeFile(wb, `Commodity_Prices_${new Date().toISOString().split("T")[0]}.xlsx`)

      toast.success(`Downloaded Excel with ${filteredChartData.length} data points`)
    } catch (err: any) {
      toast.error(`Download error: ${err.message}`)
    }
  }

  async function handleExportPNG() {
    if (!chartRef.current) return

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2
      })

      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `Commodity_Chart_${new Date().toISOString().split("T")[0]}.png`
      a.click()

      toast.success("Chart exported as PNG")
    } catch (err: any) {
      toast.error(`Export error: ${err.message}`)
    }
  }

  async function handleCopyImage() {
    if (!chartRef.current) return

    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#ffffff" })
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ])

      toast.success("Chart copied to clipboard")
    } catch (err: any) {
      toast.error(`Copy error: ${err.message}`)
    }
  }

  return (
    <div className="container max-w-9xl mx-auto py-8 px-4">
      <Card className="border shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 pb-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Commodity Market
              </CardTitle>
            </div>

            {dataSource && lastFetchTime && (
              <div className="flex flex-col items-end">
                 <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    <CircleStackIcon className="w-3 h-3 mr-1.5" />
                    Source: {dataSource === 'fresh' ? 'Live API' : dataSource === 'database' ? 'Database' : 'Cache'}
                 </div>
                 <p className="text-xs text-slate-400 mt-1.5">
                    Updated: {new Date(lastFetchTime).toLocaleString()}
                 </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Action Area */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleFetchFresh}
              disabled={loading}
              size="lg"
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              {loading ? (
                <div className="flex items-center">
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                  <span>Fetching... {loadingProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  <span>Fetch Fresh Data</span>
                </div>
              )}
            </Button>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadExcel}
                disabled={loading || filteredChartData.length === 0}
                variant="outline"
                size="lg"
                className="h-12"
                title="Export Excel"
              >
                <DocumentTextIcon className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleExportPNG}
                disabled={loading || filteredChartData.length === 0}
                variant="outline"
                size="lg"
                className="h-12"
                title="Export PNG"
              >
                <PhotoIcon className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleCopyImage}
                disabled={loading || filteredChartData.length === 0}
                variant="outline"
                size="lg"
                className="h-12"
                title="Copy to Clipboard"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Loading Progress Bar */}
          {loading && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          )}

          {/* Chart Section */}
          {showChart && (
            <div ref={chartRef} className="mt-6 border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-900">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Sidebar - Explanation Panel */}
                <div className="lg:w-64 shrink-0 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-slate-700 pt-6 lg:pt-0 lg:pr-6">
                  <div className="flex flex-col gap-6">
                    {/* Commodities Info */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tracked Commodities</h4>
                      <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: COLORS.copper }}></div>
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">Copper (LME)</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: COLORS.zinc }}></div>
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">Zinc (LME)</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: COLORS.oil }}></div>
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">Crude Oil (WTI)</span>
                          </div>
                        </div>
                      </div>
                    </div>

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

                {/* Right Content - Chart & Controls */}
                <div className="flex-1 min-w-0 order-1 lg:order-2">
                  {/* Chart Controls */}
                  <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Display Mode Toggle */}
                      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
                        <button
                          onClick={() => setDisplayMode("absolute")}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                            displayMode === "absolute"
                              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                          }`}
                        >
                          <ArrowTrendingUpIcon className="h-4 w-4 inline mr-1.5" />
                          Absolute
                        </button>
                        <button
                          onClick={() => setDisplayMode("indexed")}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                            displayMode === "indexed"
                              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                          }`}
                        >
                          <ChartBarIcon className="h-4 w-4 inline mr-1.5" />
                          Indexed (100)
                        </button>
                      </div>

                      {/* Analytics Toggle */}
                      <Button
                        variant={showAnalytics ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className="text-sm"
                      >
                        Analytics
                      </Button>
                    </div>

                    {/* Date Filter Buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 mr-2">Range:</span>
                      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
                        {DATE_FILTERS.map((filter) => (
                          <button
                            key={filter.label}
                            onClick={() => setDateFilter(filter.label)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                              dateFilter === filter.label
                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Analytics Panel */}
                  {showAnalytics && (
                    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        30-Day Rolling Correlation
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <CorrelationBadge label="Copper / Oil" value={correlations.copperOil} />
                        <CorrelationBadge label="Zinc / Oil" value={correlations.zincOil} />
                        <CorrelationBadge label="Copper / Zinc" value={correlations.copperZinc} />
                      </div>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap gap-6 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Metals</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.copper }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Copper</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.zinc }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Zinc</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Energy</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.oil }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Oil (WTI)</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  {displayData.length > 0 ? (
                    <div className="h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={displayData}
                          margin={{ top: 10, right: 60, left: 10, bottom: 40 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            vertical={true}
                            strokeOpacity={0.5}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={{ stroke: "#e2e8f0" }}
                            tickLine={false}
                            dy={10}
                            tickFormatter={formatDate}
                            minTickGap={60}
                          />

                          {/* Left Y-Axis for Metals */}
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            dx={-5}
                            tickFormatter={(value) =>
                              displayMode === "indexed"
                                ? value.toFixed(0)
                                : formatCurrency(value, true)
                            }
                            label={displayMode === "absolute" ? {
                              value: "$/tonne",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: 11, fill: "#94a3b8" }
                            } : undefined}
                          />

                          {/* Right Y-Axis for Oil */}
                          {displayMode === "absolute" && (
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              axisLine={false}
                              tickLine={false}
                              dx={5}
                              tickFormatter={(value) => `$${value}`}
                              label={{
                                value: "$/barrel",
                                angle: 90,
                                position: "insideRight",
                                style: { fontSize: 11, fill: "#94a3b8" }
                              }}
                            />
                          )}

                          <Tooltip
                            content={<CustomTooltip displayMode={displayMode} />}
                            cursor={{ stroke: "#94a3b8", strokeDasharray: "5 5" }}
                          />

                          {/* Reference line at 100 for indexed mode */}
                          {displayMode === "indexed" && (
                            <ReferenceLine
                              yAxisId="left"
                              y={100}
                              stroke="#94a3b8"
                              strokeDasharray="3 3"
                              label={{ value: "Base 100", position: "right", fill: "#94a3b8", fontSize: 10 }}
                            />
                          )}

                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="copper"
                            stroke={COLORS.copper}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 0, fill: COLORS.copper }}
                            animationDuration={1000}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="zinc"
                            stroke={COLORS.zinc}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 0, fill: COLORS.zinc }}
                            animationDuration={1000}
                          />
                          <Line
                            yAxisId={displayMode === "absolute" ? "right" : "left"}
                            type="monotone"
                            dataKey="oil"
                            stroke={COLORS.oil}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 0, fill: COLORS.oil }}
                            animationDuration={1000}
                          />

                          {/* Brush for Zoom */}
                          <Brush
                            dataKey="date"
                            height={30}
                            stroke="#94a3b8"
                            fill="#f8fafc"
                            tickFormatter={formatDate}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <ChartSkeleton />
                  )}

                  {/* Chart Footer */}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{displayData.length} data points</span>
                    <span>Drag the slider to zoom • Click legend to toggle series</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
