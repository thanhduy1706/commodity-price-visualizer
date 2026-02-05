"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  PresentationChartLineIcon
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
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(useGSAP)

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

type DateFilterType = typeof DATE_FILTERS[number]["label"] | "Custom"
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
const CustomTooltip = ({ active, payload, label, displayMode, visibleSeries }: any) => {
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
        {(visibleSeries.copper || visibleSeries.zinc) && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metals</p>
        )}

        {/* Copper */}
        {visibleSeries.copper && dataItem.rawCopper != null && (
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
        {visibleSeries.zinc && dataItem.rawZinc != null && (
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

        {visibleSeries.oil && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-700">Energy</p>
        )}

        {/* Oil */}
        {visibleSeries.oil && dataItem.rawOil != null && (
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
const CountUp = ({ value, decimals = 2 }: { value: number; decimals?: number }) => {
  const ref = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const obj = { val: 0 }
    gsap.to(obj, {
      val: value,
      duration: 1.5,
      ease: "power3.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.innerText = obj.val.toFixed(decimals)
        }
      }
    })
  }, [value])

  return <span ref={ref}>0.00</span>
}

// Correlation Badge Component
const CorrelationBadge = ({ label, value }: { label: string; value: number }) => {
  const color = value > 0.5 ? "text-green-600 dark:text-green-400" : value < -0.5 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
  const bg = value > 0.5 ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800" : value < -0.5 ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${bg} transition-transform hover:scale-105 duration-300`}>
      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</span>
      <span className={`text-sm font-bold ${color}`}>
        <CountUp value={value} />
      </span>
    </div>
  )
}

// Loading Skeleton with Shimmer
const ChartSkeleton = () => (
  <div className="relative h-full w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3">
      <ChartBarIcon className="h-16 w-16 animate-pulse opacity-50" />
      <span className="font-medium tracking-wide text-sm animate-pulse">Loading market data...</span>
    </div>
  </div>
)

export default function LMEDataFetcherRedux() {
  const dispatch = useAppDispatch()
  const chartRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)



  // Local state
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilterType>("Max")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [displayMode, setDisplayMode] = useState<DisplayMode>("absolute")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [calendarMonths, setCalendarMonths] = useState(2)

  // Handle Window Resize for Calendar
  useEffect(() => {
    const handleResize = () => {
      setCalendarMonths(window.innerWidth < 640 ? 1 : 2)
    }
    // Set initial
    if (typeof window !== "undefined") {
      handleResize()
      window.addEventListener("resize", handleResize)
    }
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("resize", handleResize)
    }
  }, [])

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
      { y: 20, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.1, duration: 0.5 }, "-=0.4"
    )

  }, { scope: containerRef })

  // Animate chart appearance when it shows
  useGSAP(() => {
    if (showChart && chartRef.current) {
      gsap.from(chartRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power2.out",
        delay: 0.2
      })
    }
  }, [showChart])

  // Animate analytics panel
  useGSAP(() => {
    if (showAnalytics) {
      gsap.fromTo(".gsap-analytics-panel",
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
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
    <div ref={containerRef} className="container max-w-9xl mx-auto py-2 sm:py-4 px-2 sm:px-4 h-[100dvh] sm:h-screen sm:max-h-screen flex flex-col">
      <Card className="border shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col flex-1 min-h-0">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 p-3 sm:pb-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 gsap-header-item">
                Commodity Market
              </CardTitle>
            </div>

            {dataSource && lastFetchTime && (
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 gsap-header-item">
                 <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    <CircleStackIcon className="w-3 h-3 mr-1.5" />
                    <span className="hidden sm:inline">Source: </span>{dataSource === 'fresh' ? 'Live API' : dataSource === 'database' ? 'Database' : 'Cache'}
                 </div>
                 <p className="text-[10px] sm:text-xs text-slate-400 mt-0 md:mt-1.5">
                    {new Date(lastFetchTime).toLocaleString()}
                 </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Action Area */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 shrink-0">
            <Button
              onClick={handleFetchFresh}
              disabled={loading}
              size="lg"
              className="flex-1 h-12 sm:h-14 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 border border-white/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] gsap-action-btn group overflow-hidden relative rounded-xl"
            >
              {/* Background shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <ArrowPathIcon className="animate-spin h-5 w-5 opacity-50" />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                     <span className="text-sm">Fetching Data...</span>
                     <span className="text-[10px] opacity-80 mt-0.5">Please wait ({loadingProgress}%)</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 relative z-10">
                  <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                     <ArrowPathIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-700" />
                  </div>
                  <div className="flex flex-col items-start leading-none text-left">
                     <span>Update Market Data</span>
                  </div>
                </div>
              )}
            </Button>

            {/* Export Actions Group */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
              <Button
                onClick={handleDownloadExcel}
                disabled={loading || filteredChartData.length === 0}
                variant="ghost"
                size="lg"
                className="h-12 px-4 text-slate-600 hover:text-blue-700 hover:bg-white dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg transition-all gsap-action-btn"
                title="Export Excel"
              >
                <div className="flex flex-col items-center gap-1">
                   <DocumentTextIcon className="h-5 w-5" />
                   <span className="text-[10px] font-medium hidden sm:block">Excel</span>
                </div>
              </Button>
              <div className="w-px bg-slate-200 dark:bg-slate-700 my-2 mx-0.5" />
              <Button
                onClick={handleExportPNG}
                disabled={loading || filteredChartData.length === 0}
                variant="ghost"
                size="lg"
                className="h-12 px-4 text-slate-600 hover:text-purple-700 hover:bg-white dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg transition-all gsap-action-btn"
                title="Export PNG"
              >
                <div className="flex flex-col items-center gap-1">
                   <PhotoIcon className="h-5 w-5" />
                   <span className="text-[10px] font-medium hidden sm:block">PNG</span>
                </div>
              </Button>
              <div className="w-px bg-slate-200 dark:bg-slate-700 my-2 mx-0.5" />
              <Button
                onClick={handleCopyImage}
                disabled={loading || filteredChartData.length === 0}
                variant="ghost"
                size="lg"
                className="h-12 px-4 text-slate-600 hover:text-green-700 hover:bg-white dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg transition-all gsap-action-btn"
                title="Copy to Clipboard"
              >
                <div className="flex flex-col items-center gap-1">
                   <ClipboardDocumentIcon className="h-5 w-5" />
                   <span className="text-[10px] font-medium hidden sm:block">Copy</span>
                </div>
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
            <div ref={chartRef} className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col lg:flex-row gap-6 lg:h-full h-auto">
                {/* Left Sidebar - Explanation Panel */}
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

                {/* Right Content - Chart & Controls */}
                <div className="flex-1 min-w-0 order-last flex flex-col min-h-0">
                  {/* Chart Controls Toolbar */}
                  <div className="mb-4 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 w-full backdrop-blur-sm shrink-0">

                    {/* Left Group: View Options */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">

                      {/* Display Mode Segmented Control */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-start">
                        <button
                          onClick={() => setDisplayMode("absolute")}
                          className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                            displayMode === "absolute"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-inner"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <ArrowTrendingUpIcon className={`h-4 w-4 ${displayMode === "absolute" ? "text-blue-600 dark:text-blue-400" : ""}`} />
                          <span>Absolute</span>
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
                        <button
                          onClick={() => setDisplayMode("indexed")}
                          className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                            displayMode === "indexed"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-inner"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <ChartBarIcon className={`h-4 w-4 ${displayMode === "indexed" ? "text-purple-600 dark:text-purple-400" : ""}`} />
                          <span>Indexed (100)</span>
                        </button>
                      </div>

                      {/* Analytics Switch */}
                      <Button
                        variant={showAnalytics ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={cn(
                          "h-[42px] px-4 rounded-xl border transition-all text-xs font-semibold",
                          showAnalytics
                            ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 shadow-sm"
                            : "border-transparent bg-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-500"
                        )}
                      >
                         <PresentationChartLineIcon className={cn("h-4 w-4 mr-2", showAnalytics && "text-amber-500")} />
                         Analytics
                      </Button>
                    </div>

                    {/* Right Group: Date Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={"ghost"}
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal h-9 rounded-lg px-3 text-xs w-full sm:w-[220px]",
                              !dateRange && "text-muted-foreground",
                              dateFilter === "Custom" && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <span className="font-semibold">
                                  {format(dateRange.from, "MMM d, yy")} - {format(dateRange.to, "MMM d, yy")}
                                </span>
                              ) : (
                                <span className="font-semibold">{format(dateRange.from, "MMM d, yy")}</span>
                              )
                            ) : (
                              <span className="text-slate-500">Select Date Range...</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => {
                              setDateRange(range)
                              if (range) setDateFilter("Custom")
                            }}
                            numberOfMonths={calendarMonths}
                          />
                        </PopoverContent>
                      </Popover>

                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                      <div className="flex flex-wrap sm:flex-nowrap gap-1">
                          {DATE_FILTERS.map((filter) => (
                            <button
                              key={filter.label}
                              onClick={() => {
                                setDateFilter(filter.label)
                                setDateRange(undefined)
                              }}
                              className={`flex-1 sm:flex-none px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                dateFilter === filter.label
                                  ? "bg-slate-800 text-white shadow-md transform scale-105"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
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
                  )}

                  {/* Legend - Interactive */}
                  <div className="flex flex-wrap gap-6 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Metals</span>
                      <button
                        onClick={() => toggleSeries('copper')}
                        className={`flex items-center gap-2 transition-opacity ${visibleSeries.copper ? 'opacity-100' : 'opacity-40 grayscale'}`}
                        title="Toggle Copper"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.copper }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Copper</span>
                      </button>
                      <button
                        onClick={() => toggleSeries('zinc')}
                        className={`flex items-center gap-2 transition-opacity ${visibleSeries.zinc ? 'opacity-100' : 'opacity-40 grayscale'}`}
                        title="Toggle Zinc"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.zinc }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Zinc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Energy</span>
                      <button
                        onClick={() => toggleSeries('oil')}
                        className={`flex items-center gap-2 transition-opacity ${visibleSeries.oil ? 'opacity-100' : 'opacity-40 grayscale'}`}
                        title="Toggle Oil"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.oil }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Oil (WTI)</span>
                      </button>
                    </div>
                  </div>

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
                            content={<CustomTooltip displayMode={displayMode} visibleSeries={visibleSeries} />}
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

                          {visibleSeries.copper && (
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
                          )}
                          {visibleSeries.zinc && (
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
                          )}
                          {visibleSeries.oil && (
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
                          )}

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

      {/* Change Log Modal */}
      {showChangeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                 <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ClipboardDocumentIcon className="w-5 h-5 text-blue-600" />
                    Data Update Log
                 </h3>
                 <button onClick={() => setShowChangeLog(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <XCircleIcon className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                 {changeLog.length > 0 ? (
                    changeLog.map((log, i) => (
                       <div key={i} className="flex gap-2 items-start">
                          <span className="text-blue-500 font-mono mt-1">•</span>
                          <span>{log}</span>
                       </div>
                    ))
                 ) : (
                    <div className="text-center py-8 text-slate-400 italic">
                       No significant data changes detected.
                    </div>
                 )}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
                 <Button onClick={() => setShowChangeLog(false)}>Close</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
