"use client"

import { useTheme } from "next-themes"
import { SunIcon, MoonIcon, CircleStackIcon } from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardHeaderProps {
  dataSource: string | null
  lastFetchTime: string | null
}

export function DashboardHeader({ dataSource, lastFetchTime }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()

  const getDataSourceLabel = () => {
    switch (dataSource) {
      case 'fresh': return 'Live API'
      case 'database': return 'Database'
      default: return 'Cache'
    }
  }

  return (
    <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 p-3 sm:pb-4 shrink-0">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4">
        <div className="flex items-center">
          <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 gsap-header-item">
            Commodity Market
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 ml-3 shrink-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
          >
            <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        {dataSource && lastFetchTime && (
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 gsap-header-item">
            <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              <CircleStackIcon className="w-3 h-3 mr-1.5" />
              {getDataSourceLabel()}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0 md:mt-1.5">
              {new Date(lastFetchTime).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </CardHeader>
  )
}
