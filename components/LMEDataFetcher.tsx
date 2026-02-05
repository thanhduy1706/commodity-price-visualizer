"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Zap, BarChart3 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface ChartDataPoint {
  date: string
  copper?: number
  zinc?: number
  oil?: number
}

export default function LMEDataFetcher() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [showChart, setShowChart] = useState(false)
  const [cacheAvailable, setCacheAvailable] = useState(false)
  const [lastCacheTime, setLastCacheTime] = useState<string | null>(null)

  useEffect(() => {
    loadCachedDataOnMount()
  }, [])

  function loadCachedDataOnMount() {
    try {
      const cached = localStorage.getItem("commodityChartData")
      const cacheTime = localStorage.getItem("commodityChartCacheTime")

      if (cached && cacheTime) {
        console.log("[Cache] Found cached data, loading...")
        const data = JSON.parse(cached)
        setChartData(data)
        setShowChart(true)
        setCacheAvailable(true)
        setLastCacheTime(cacheTime)

        const cacheDate = new Date(cacheTime).toLocaleString()
        setSuccess(
          `Showing cached data from ${cacheDate} (${data.length} points)`
        )
      } else {
        console.log("[Cache] No cached data found")
        setSuccess(
          "No cached data. Click 'Fetch Fresh Data' to load commodities."
        )
      }
    } catch (err) {
      console.error("[Cache] Error loading cache:", err)
      setError("Error loading cached data. Click 'Fetch Fresh Data' to reload.")
    }
  }

  function saveToCache(data: ChartDataPoint[]) {
    try {
      localStorage.setItem("commodityChartData", JSON.stringify(data))
      localStorage.setItem("commodityChartCacheTime", new Date().toISOString())
      setCacheAvailable(true)
      setLastCacheTime(new Date().toISOString())
      console.log("[Cache] Saved to localStorage")
    } catch (err) {
      console.error("[Cache] Error saving to cache:", err)
    }
  }

  async function handleFetchAndDisplayChart() {
    setLoading(true)
    setError("")
    setSuccess("")
    setShowChart(false)

    try {
      console.log("[Chart] Fetching all commodity data...")

      const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

      // Fetch all three sources in parallel
      const [copperRes, zincRes, oilRes] = await Promise.all([
        fetch(`${PYTHON_API}/api/fetch-data-json?source=copper`),
        fetch(`${PYTHON_API}/api/fetch-data-json?source=zinc`),
        fetch(`${PYTHON_API}/api/fetch-data-json?source=oil`),
      ])

      if (!copperRes.ok || !zincRes.ok || !oilRes.ok) {
        throw new Error("Failed to fetch one or more data sources")
      }

      const copperData = await copperRes.json()
      const zincData = await zincRes.json()
      const oilData = await oilRes.json()

      console.log("[Chart] Copper data points:", copperData.data?.length)
      console.log("[Chart] Zinc data points:", zincData.data?.length)
      console.log("[Chart] Oil data points:", oilData.data?.length)

      // Combine data by date
      const dataMap = new Map<string, ChartDataPoint>()

      // Add copper data (from 2023-01-01)
      copperData.data?.forEach((item: any) => {
        if (item.date && item.value) {
          dataMap.set(item.date, {
            date: item.date,
            copper: parseFloat(item.value),
          })
        }
      })

      // Add zinc data (from 2023-01-01)
      zincData.data?.forEach((item: any) => {
        if (item.date && item.value) {
          const existing: ChartDataPoint = dataMap.get(item.date) || {
            date: item.date,
          }
          existing.zinc = parseFloat(item.value)
          dataMap.set(item.date, existing)
        }
      })

      // Add oil data (last 7 days, but we'll include what we have)
      oilData.data?.forEach((item: any) => {
        if (item.date && item.value) {
          const existing: ChartDataPoint = dataMap.get(item.date) || {
            date: item.date,
          }
          existing.oil = parseFloat(item.value)
          dataMap.set(item.date, existing)
        }
      })

      // Convert to array and sort by date
      const combinedData = Array.from(dataMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Filter to only show data from 2023-01-01 onwards
      const filteredData = combinedData.filter(
        (item) => new Date(item.date) >= new Date("2023-01-01")
      )

      console.log("[Chart] Combined data points:", filteredData.length)

      setChartData(filteredData)
      setShowChart(true)
      saveToCache(filteredData)
      setSuccess(
        `Successfully loaded ${filteredData.length} data points! (Saved to cache)`
      )
    } catch (err: any) {
      console.error("[Chart] Error:", err)

      if (
        err.message?.includes("fetch") ||
        err.message?.includes("Failed to fetch")
      ) {
        setError(
          "Cannot connect to Python backend!\n\n" +
            "Please start the Python backend:\n" +
            "1. Open terminal\n" +
            "2. cd backend\n" +
            "3. python main.py"
        )
      } else {
        setError(`Error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadExcel() {
    if (chartData.length === 0) {
      setError("No data to download. Please fetch data first!")
      return
    }

    try {
      // Create CSV content
      let csvContent = "Date,Copper (LME),Zinc (LME),Oil (WTI)\n"

      chartData.forEach((row) => {
        csvContent += `${row.date},${row.copper || ""},${row.zinc || ""},${
          row.oil || ""
        }\n`
      })

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Commodity_Prices_${
        new Date().toISOString().split("T")[0]
      }.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess(
        `Successfully downloaded CSV with ${chartData.length} data points!`
      )
    } catch (err: any) {
      setError(`Download error: ${err.message}`)
    }
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <Card className="shadow-lg">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl">Commodity Price Chart</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Action Button */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                🟠 Copper, ⚪ Zinc, and 🛢️ Oil prices
              </p>
            </div>

            <Button
              onClick={handleFetchAndDisplayChart}
              disabled={loading}
              size="lg"
              className="w-full h-16 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6" />
                  <span className="ml-2">
                    Fetching All Data... (~90 seconds)
                  </span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-6 w-6" />
                  <span className="ml-2">
                    {cacheAvailable
                      ? "Refresh Data (Get Latest)"
                      : "Fetch Fresh Data"}
                  </span>
                </>
              )}
            </Button>

            {cacheAvailable && lastCacheTime && (
              <div className="text-center text-sm text-muted-foreground bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="font-medium text-purple-900">
                  📊 Showing cached data
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Last updated: {new Date(lastCacheTime).toLocaleString()}
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-900 font-medium">
                  ⚙️ Processing...
                </p>
              </div>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <Alert
              variant="default"
              className="border-green-200 bg-green-50"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-900">Success!</AlertTitle>
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Chart Display */}
          {showChart && chartData.length > 0 && (
            <div className="pt-6 border-t space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Commodity Price Trends</h3>
                <p className="text-sm text-muted-foreground">
                  Historical data from January 2023 to present
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg border-2 border-gray-200 shadow-lg">
                <ResponsiveContainer
                  width="100%"
                  height={500}
                >
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorCopper"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorZinc"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6b7280"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6b7280"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorOil"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#000000"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#000000"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#9ca3af"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      stroke="#9ca3af"
                      label={{
                        value: "Price (USD)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#6b7280" },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "12px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                      labelStyle={{ fontWeight: "bold", marginBottom: "8px" }}
                      formatter={(value: any) => {
                        if (value === undefined || value === null)
                          return ["N/A", ""]
                        return [`$${parseFloat(value).toFixed(2)}`, ""]
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "20px",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="copper"
                      stroke="#f97316"
                      strokeWidth={3}
                      name="🟠 Copper (LME)"
                      dot={false}
                      connectNulls
                      activeDot={{ r: 6, fill: "#f97316" }}
                      animationDuration={1500}
                    />
                    <Line
                      type="monotone"
                      dataKey="zinc"
                      stroke="#6b7280"
                      strokeWidth={3}
                      name="⚪ Zinc (LME)"
                      dot={false}
                      connectNulls
                      activeDot={{ r: 6, fill: "#6b7280" }}
                      animationDuration={1500}
                    />
                    <Line
                      type="monotone"
                      dataKey="oil"
                      stroke="#000000"
                      strokeWidth={3}
                      name="🛢️ Oil (WTI)"
                      dot={false}
                      connectNulls
                      activeDot={{ r: 6, fill: "#000000" }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-orange-900">
                    🟠 Copper
                  </p>
                  <p className="text-xs text-orange-700">LME Official Prices</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">⚪ Zinc</p>
                  <p className="text-xs text-gray-700">LME Official Prices</p>
                </div>
                <div className="bg-gray-900 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-white">🛢️ Oil</p>
                  <p className="text-xs text-gray-300">
                    WTI Crude (Last 7 days)
                  </p>
                </div>
              </div>

              {/* Download Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleDownloadExcel}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Download as CSV ({chartData.length} data points)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
