"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Download, RefreshCw, Database, ZoomIn, ZoomOut } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
} from "recharts"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchFreshData, loadFromDatabase, clearError } from "@/lib/redux/slices/commoditySlice"
import { setShowChart, setSuccess, clearMessages } from "@/lib/redux/slices/uiSlice"

// Date range filter options
const DATE_FILTERS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 0 },
] as const

type DateFilterType = typeof DATE_FILTERS[number]["label"]

export default function LMEDataFetcherRedux() {
  const dispatch = useAppDispatch()

  // Local state
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilterType>("All")

  // Redux state
  const { chartData, loading, error, lastFetchTime, dataSource } = useAppSelector((state) => state.commodity)
  const { showChart, success } = useAppSelector((state) => state.ui)

  // Filter chart data based on selected date range
  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    if (dateFilter === "All") return chartData

    const filterConfig = DATE_FILTERS.find(f => f.label === dateFilter)
    if (!filterConfig || filterConfig.months === 0) return chartData

    const now = new Date()
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - filterConfig.months, now.getDate())
    const cutoffStr = cutoffDate.toISOString().split("T")[0]

    return chartData.filter(item => item.date >= cutoffStr)
  }, [chartData, dateFilter])



  // Load from database on mount
  useEffect(() => {
    dispatch(loadFromDatabase())
    dispatch(setShowChart(true))
    dispatch(setSuccess("Loading data from database..."))
  }, [dispatch])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError())
      }, 5000)
      return () => clearTimeout(timer)
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
    dispatch(clearMessages())
    dispatch(clearError())

    const result = await dispatch(fetchFreshData())

    if (fetchFreshData.fulfilled.match(result)) {
      dispatch(setShowChart(true))
      dispatch(setSuccess(`Successfully fetched and saved ${result.payload.length} data points!`))
    }
  }

  function handleDownloadCSV() {
    if (filteredChartData.length === 0) {
      dispatch(setSuccess("No data to download. Please fetch data first!"))
      return
    }

    try {
      let csvContent = "Date,Copper (LME),Zinc (LME),Oil (WTI)\n"

      filteredChartData.forEach(row => {
        csvContent += `${row.date},${row.copper || ""},${row.zinc || ""},${row.oil || ""}\n`
      })

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Commodity_Prices_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      dispatch(setSuccess(`Successfully downloaded CSV with ${filteredChartData.length} data points!`))
    } catch (err: any) {
      dispatch(setSuccess(`Download error: ${err.message}`))
    }
  }



  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <Card className="border shadow-sm bg-white">
        <CardHeader className="border-b bg-slate-50/50 pb-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">Commodity Market Data</CardTitle>
              <CardDescription className="text-slate-500 mt-1">
                Real-time tracking for LME Copper, Zinc, and WTI Crude Oil
              </CardDescription>
            </div>

            {dataSource && lastFetchTime && (
              <div className="flex flex-col items-end">
                 <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <Database className="w-3 h-3 mr-1.5" />
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
              {loading && dataSource === 'fresh' ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  <span>Fetching Data... {loadingProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  <span>Fetch Fresh Data</span>
                </div>
              )}
            </Button>

            <Button
              onClick={handleDownloadCSV}
              disabled={loading || filteredChartData.length === 0}
              size="lg"
              variant="outline"
              className="flex-1 h-12 border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <div className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                <span>Export CSV</span>
              </div>
            </Button>
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

          {/* Messages */}
          {success && (
            <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="font-medium text-green-900">Successful</AlertTitle>
              <AlertDescription className="text-green-700 mt-1">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="font-medium">Error</AlertTitle>
              <AlertDescription className="mt-1">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Chart Section */}
          {showChart && filteredChartData.length > 0 && (
            <div className="mt-8 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
              {/* Chart Header with Filters */}
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-slate-800">Price Trends</h3>
                  <span className="text-sm text-slate-400">
                    {filteredChartData.length} data points
                  </span>
                </div>

                {/* Date Filter Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 mr-2">Range:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                    {DATE_FILTERS.map((filter) => (
                      <button
                        key={filter.label}
                        onClick={() => setDateFilter(filter.label)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                          dateFilter === filter.label
                            ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#C87533" }}></div>
                  <span className="text-sm text-slate-600">Copper</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6C8A9B" }}></div>
                  <span className="text-sm text-slate-600">Zinc</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#2B2B2B" }}></div>
                  <span className="text-sm text-slate-600">Oil</span>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                      dy={10}
                      minTickGap={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '12px'
                      }}
                      itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                      labelStyle={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="copper"
                      stroke="#C87533"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1000}
                    />
                    <Line
                      type="monotone"
                      dataKey="zinc"
                      stroke="#6C8A9B"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1000}
                    />
                    <Line
                      type="monotone"
                      dataKey="oil"
                      stroke="#2B2B2B"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1000}
                    />
                    {/* Brush for Zoom/Pan */}
                    <Brush
                      dataKey="date"
                      height={30}
                      stroke="#94a3b8"
                      fill="#f8fafc"
                      tickFormatter={(value) => value}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Zoom Instructions */}
              <p className="text-xs text-slate-400 mt-4 text-center flex items-center justify-center gap-1">
                <ZoomIn className="h-3 w-3" />
                Drag the slider below the chart to zoom in on a specific date range
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
