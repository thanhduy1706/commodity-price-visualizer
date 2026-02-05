"use client"

import {
  ArrowPathIcon,
  DocumentTextIcon,
  PhotoIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"

interface ActionButtonsProps {
  loading: boolean
  loadingProgress: number
  hasData: boolean
  onFetchFresh: () => void
  onDownloadExcel: () => void
  onExportPNG: () => void
  onCopyImage: () => void
}

export function ActionButtons({
  loading,
  loadingProgress,
  hasData,
  onFetchFresh,
  onDownloadExcel,
  onExportPNG,
  onCopyImage
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 shrink-0">
      <Button
        onClick={onFetchFresh}
        disabled={loading}
        size="lg"
        className="flex-1 h-12 sm:h-14 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 border border-white/10 transition-all duration-500 ease-out transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] gsap-action-btn group overflow-hidden relative rounded-xl"
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
            <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors duration-300">
              <ArrowPathIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-700 ease-out" />
            </div>
            <div className="flex flex-col items-start leading-none text-left">
              <span>Update Market Data</span>
            </div>
          </div>
        )}
      </Button>

      {/* Export Actions Group */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 transition-shadow hover:shadow-md duration-300">
        <Button
          onClick={onDownloadExcel}
          disabled={loading || !hasData}
          variant="ghost"
          size="lg"
          className="h-12 px-4 text-slate-600 hover:text-blue-700 hover:bg-white dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg transition-all duration-300 ease-out active:scale-95 gsap-action-btn"
          title="Export Excel"
        >
          <div className="flex flex-col items-center gap-1">
            <DocumentTextIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-[10px] font-medium hidden sm:block">Excel</span>
          </div>
        </Button>
        <div className="w-px bg-slate-200 dark:bg-slate-700 my-2 mx-0.5" />
        <Button
          onClick={onExportPNG}
          disabled={loading || !hasData}
          variant="ghost"
          size="lg"
          className="h-12 px-4 text-slate-600 hover:text-purple-700 hover:bg-white dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg transition-all duration-300 ease-out active:scale-95 gsap-action-btn"
          title="Export PNG"
        >
          <div className="flex flex-col items-center gap-1">
            <PhotoIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-[10px] font-medium hidden sm:block">PNG</span>
          </div>
        </Button>
        <div className="w-px bg-slate-200 dark:bg-slate-700 my-2 mx-0.5" />
        <Button
          onClick={onCopyImage}
          disabled={loading || !hasData}
          variant="ghost"
          size="lg"
          className="h-12 px-4 text-slate-600 hover:text-green-700 hover:bg-white dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg transition-all duration-300 ease-out active:scale-95 gsap-action-btn"
          title="Copy to Clipboard"
        >
          <div className="flex flex-col items-center gap-1">
            <ClipboardDocumentIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-[10px] font-medium hidden sm:block">Copy</span>
          </div>
        </Button>
      </div>
    </div>
  )
}
