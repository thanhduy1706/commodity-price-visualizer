"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  PresentationChartLineIcon
} from "@heroicons/react/24/outline"
import { DATE_FILTERS, type DateFilterType, type DisplayMode } from "@/lib/chart/constants"

interface ChartToolbarProps {
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
  showAnalytics: boolean
  setShowAnalytics: (show: boolean) => void
  dateFilter: DateFilterType
  setDateFilter: (filter: DateFilterType) => void
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
}

export function ChartToolbar({
  displayMode,
  setDisplayMode,
  showAnalytics,
  setShowAnalytics,
  dateFilter,
  setDateFilter,
  dateRange,
  setDateRange
}: ChartToolbarProps) {
  const [calendarMonths, setCalendarMonths] = useState(2)

  // Handle window resize for calendar
  useEffect(() => {
    const handleResize = () => {
      setCalendarMonths(window.innerWidth < 640 ? 1 : 2)
    }
    if (typeof window !== "undefined") {
      handleResize()
      window.addEventListener("resize", handleResize)
    }
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div className="mb-4 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 w-full backdrop-blur-sm shrink-0">
      {/* Left Group: View Options */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
        {/* Display Mode Segmented Control */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-start">
          <button
            onClick={() => setDisplayMode("absolute")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ease-out cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
              displayMode === "absolute"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-inner scale-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105"
            }`}
          >
            <ArrowTrendingUpIcon className={`h-4 w-4 transition-colors duration-300 ${displayMode === "absolute" ? "text-blue-600 dark:text-blue-400" : ""}`} />
            <span>Absolute</span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
          <button
            onClick={() => setDisplayMode("indexed")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ease-out cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
              displayMode === "indexed"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-inner scale-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105"
            }`}
          >
            <ChartBarIcon className={`h-4 w-4 transition-colors duration-300 ${displayMode === "indexed" ? "text-purple-600 dark:text-purple-400" : ""}`} />
            <span>Indexed (100)</span>
          </button>
        </div>

        {/* Analytics Switch */}
        <Button
          variant={showAnalytics ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={cn(
            "h-[42px] px-4 rounded-xl border transition-all duration-300 ease-out active:scale-95 text-xs font-semibold",
            showAnalytics
              ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 shadow-sm"
              : "border-transparent bg-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-700"
          )}
        >
          <PresentationChartLineIcon className={cn("h-4 w-4 mr-2 transition-colors duration-300", showAnalytics && "text-amber-500")} />
          Analytics
        </Button>
      </div>

      {/* Right Group: Date Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-shadow hover:shadow-md duration-300">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"ghost"}
              size="sm"
              className={cn(
                "justify-start text-left font-normal h-9 rounded-lg px-3 text-xs w-full sm:w-[220px] transition-all duration-300 ease-out active:scale-95",
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
              className={`flex-1 sm:flex-none px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                dateFilter === filter.label
                  ? "bg-slate-800 text-white shadow-md transform scale-105"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:scale-105"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
