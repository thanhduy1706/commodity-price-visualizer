"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
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
} from "recharts"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchFreshData, loadFromDatabase, clearError } from "@/lib/redux/slices/commoditySlice"
import { setShowChart } from "@/lib/redux/slices/uiSlice"
import { toPng } from "html-to-image"
import * as XLSX from "xlsx"
import { useTheme } from "next-themes"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(useGSAP)

// Chart utilities
import {
  DATE_FILTERS,
  type DateFilterType,
  type DisplayMode,
} from "@/lib/chart/constants"
import { formatCurrency, formatDate } from "@/lib/chart/formatters"
import { calculateChartData, calculateCorrelation, getChartColors } from "@/lib/chart/calculations"

// Chart components
import { ChartSkeleton, CustomTooltip } from "@/components/chart"

// Dashboard components
import {
  DashboardHeader,
  ActionButtons,
  ChartToolbar,
  ChartLegend,
  ExplanationPanel,
  ChangeLogModal,
  AnalyticsPanel,
} from "@/components/dashboard"

export default function LMEDataFetcherRedux() {
  const dispatch = useAppDispatch()
  const chartRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  // Dynamic Chart Colors for Dark/Light Mode
  const chartColors = useMemo(() => getChartColors(resolvedTheme === "dark"), [resolvedTheme])

  // Local state
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilterType>("Max")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [displayMode, setDisplayMode] = useState<DisplayMode>("absolute")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [chartReady, setChartReady] = useState(false)

  const [visibleSeries, setVisibleSeries] = useState({
    copper: true,
    zinc: true,
    oil: true
  })

  // Toggle visibility of a series
  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }))
  }

  // Change Log State
  const [changeLog, setChangeLog] = useState<string[]>([])
  const [showChangeLog, setShowChangeLog] = useState(false)



  // Redux state
  const { chartData, loading, error, lastFetchTime, dataSource } = useAppSelector((state) => state.commodity)
  const { showChart } = useAppSelector((state) => state.ui)

  // Delay chart rendering to ensure container size is calculated
  useEffect(() => {
    if (showChart) {
      // Increased delay to ensure layout is fully stable
      const timer = setTimeout(() => setChartReady(true), 500)
      return () => clearTimeout(timer)
    } else {
      setChartReady(false)
    }
  }, [showChart])

  // GSAP Animations
  useGSAP(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) return

    // Initial entrance animation
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

    tl.fromTo(containerRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 }
    )
    .fromTo(".gsap-header-item",
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.6 }, "-=0.4"
    )
    .fromTo(".gsap-action-btn",
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.05, duration: 0.5 }, "-=0.4"
    )

  }, { scope: containerRef })

  // Animate chart appearance when it shows
  useGSAP(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches || !chartRef.current) return

    if (showChart) {
      gsap.fromTo(chartRef.current,
        { opacity: 0, y: 30, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "expo.out", // Smoother ease
          delay: 0.1
        }
      )
    }
  }, [showChart])

  // Animate analytics panel
  useGSAP(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) return

    if (showAnalytics) {
      gsap.fromTo(".gsap-analytics-panel",
        { height: 0, opacity: 0, scaleY: 0.95, transformOrigin: "top" },
        { height: "auto", opacity: 1, scaleY: 1, duration: 0.6, ease: "power4.out" }
      )
    }
  }, [showAnalytics])

  // Filter chart data based on selected date range
  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []

    let cutoffStr = ""
    const now = new Date()

    if (dateFilter === "Custom") {
      if (dateRange?.from) {
        const fromStr = format(dateRange.from, "yyyy-MM-dd")
        const toStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "9999-12-31"
        return chartData.filter(item => item.date >= fromStr && item.date <= toStr)
      }
      return chartData
    } else if (dateFilter === "Max") {
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
  }, [chartData, dateFilter, dateRange])

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

    // Capture current data for comparison
    const prevData = chartData

    const result = await dispatch(fetchFreshData())

    if (fetchFreshData.fulfilled.match(result)) {
      dispatch(setShowChart(true))

      const newData = result.payload
      const changes: string[] = []

      // 1. Detect New Dates
      const prevDates = new Set(prevData.map(d => d.date))
      const newEntries = newData.filter(d => !prevDates.has(d.date))

      if (newEntries.length > 0) {
        changes.push(`Added ${newEntries.length} new data point(s).`)
        // List up to 3 details
        newEntries.slice(0, 3).forEach(d => {
           changes.push(`New: ${d.date} | Cu: $${d.copper} | Zn: $${d.zinc} | Oil: $${d.oil}`)
        })
        if (newEntries.length > 3) changes.push(`...and ${newEntries.length - 3} more.`)
      }

      // 2. Detect Updates to Existing Dates (Recent 5)
      // We assume data is sorted by date
      let updatesCount = 0
      const updatesLog: string[] = []

      const prevMap = new Map(prevData.map(d => [d.date, d]))

      // Check from newest to oldest for relevance
      const reversedNew = [...newData].reverse()

      for (const d of reversedNew) {
         if (prevMap.has(d.date)) {
            const p = prevMap.get(d.date)!
            if (p.copper !== d.copper || p.zinc !== d.zinc || p.oil !== d.oil) {
               updatesCount++
               if (updatesCount <= 3) {
                  updatesLog.push(`Update ${d.date}: Values refreshed.`)
               }
            }
         }
      }

      if (updatesCount > 0) {
         changes.push(`Updated ${updatesCount} existing data point(s).`)
         changes.push(...updatesLog)
         if (updatesCount > 3) changes.push(`...and ${updatesCount - 3} more updates.`)
      }

      if (changes.length > 0) {
         setChangeLog(changes)
         setShowChangeLog(true)
         toast.success(`Fetched new data. ${changes.length} types of changes detected.`)

         // Persist log to DB
         const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
         fetch(`${PYTHON_API}/api/logs/change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: `Data Update: ${newEntries.length} new, ${updatesCount} updated`,
              details: changes
            })
         }).catch(err => console.error("Failed to save log:", err))

      } else {
         toast.info("Data is up to date. No changes detected.")
      }
    }
  }

  // Auto-fetch data every 5 minutes
  const fetchRef = useRef(handleFetchFresh)
  fetchRef.current = handleFetchFresh

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchRef.current()
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [loading])

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
        backgroundColor: resolvedTheme === "dark" ? "#0F172A" : "#ffffff",
        pixelRatio: 4, // 4x is plenty high (20 is overkill/slow)
        cacheBust: true,
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
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: resolvedTheme === "dark" ? "#0F172A" : "#ffffff",
        pixelRatio: 4
      })
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
    <div ref={containerRef} className="container max-w-9xl mx-auto py-2 sm:py-4 px-2 sm:px-4 h-[100dvh] sm:h-screen sm:max-h-screen flex flex-col">
      <Card className="border shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col flex-1 min-h-0">
        <DashboardHeader dataSource={dataSource} lastFetchTime={lastFetchTime} />

        <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <ActionButtons
            loading={loading}
            loadingProgress={loadingProgress}
            hasData={filteredChartData.length > 0}
            onFetchFresh={handleFetchFresh}
            onDownloadExcel={handleDownloadExcel}
            onExportPNG={handleExportPNG}
            onCopyImage={handleCopyImage}
          />

          {/* Loading Progress Bar */}
          {loading && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          )}

          {/* Chart Section */}
          {showChart && (
            <div ref={chartRef} className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col lg:flex-row gap-6 lg:h-full h-auto">
                <ExplanationPanel />

                {/* Right Content - Chart & Controls */}
                <div className="flex-1 min-w-0 order-last flex flex-col min-h-0">
                  <ChartToolbar
                    displayMode={displayMode}
                    setDisplayMode={setDisplayMode}
                    showAnalytics={showAnalytics}
                    setShowAnalytics={setShowAnalytics}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                  />

                  {showAnalytics && <AnalyticsPanel correlations={correlations} />}

                  <ChartLegend
                    visibleSeries={visibleSeries}
                    chartColors={chartColors}
                    onToggleSeries={toggleSeries}
                  />

                  {/* Chart */}
                  {displayData.length > 0 ? (
                    <div className="w-full h-[400px] lg:h-auto lg:flex-1 min-h-0 bg-slate-50/30 rounded-lg">
                      {chartReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={displayData}
                            margin={{ top: 10, right: 60, left: 10, bottom: 5 }}
                          >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={chartColors.grid}
                            vertical={true}
                            strokeOpacity={0.5}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: chartColors.text }}
                            axisLine={{ stroke: chartColors.grid }}
                            tickLine={false}
                            dy={10}
                            tickFormatter={formatDate}
                            minTickGap={60}
                          />

                          {/* Left Y-Axis for Metals */}
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11, fill: chartColors.text }}
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
                              style: { fontSize: 11, fill: chartColors.text }
                            } : undefined}
                          />

                          {/* Right Y-Axis for Oil */}
                          {displayMode === "absolute" && (
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 11, fill: chartColors.text }}
                              axisLine={false}
                              tickLine={false}
                              dx={5}
                              tickFormatter={(value) => `$${value}`}
                              label={{
                                value: "$/barrel",
                                angle: 90,
                                position: "insideRight",
                                style: { fontSize: 11, fill: chartColors.text }
                              }}
                            />
                          )}

                          <Tooltip
                            content={<CustomTooltip displayMode={displayMode} visibleSeries={visibleSeries} colors={chartColors} />}
                            cursor={{ stroke: chartColors.text, strokeDasharray: "5 5" }}
                          />

                          {/* Reference line at 100 for indexed mode */}
                          {displayMode === "indexed" && (
                            <ReferenceLine
                              yAxisId="left"
                              y={100}
                              stroke={chartColors.text}
                              strokeDasharray="3 3"
                              label={{ value: "Base 100", position: "right", fill: chartColors.text, fontSize: 10 }}
                            />
                          )}

                          {visibleSeries.copper && (
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="copper"
                              stroke={chartColors.copper}
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 0, fill: chartColors.copper }}
                              animationDuration={1000}
                            />
                          )}
                          {visibleSeries.zinc && (
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="zinc"
                              stroke={chartColors.zinc}
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 0, fill: chartColors.zinc }}
                              animationDuration={1000}
                            />
                          )}
                          {visibleSeries.oil && (
                            <Line
                              yAxisId={displayMode === "absolute" ? "right" : "left"}
                              type="monotone"
                              dataKey="oil"
                              stroke={chartColors.oil}
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 0, fill: chartColors.oil }}
                              animationDuration={1000}
                            />
                          )}

                          {/* Brush for Zoom */}
                          <Brush
                            dataKey="date"
                            height={30}
                            stroke={chartColors.brushStroke}
                            fill={chartColors.brushFill}
                            tickFormatter={formatDate}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      ) : <ChartSkeleton />}
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

      <ChangeLogModal
        isOpen={showChangeLog}
        changeLog={changeLog}
        onClose={() => setShowChangeLog(false)}
      />
    </div>
  )
}
