"use client"

import { ClipboardDocumentIcon, XCircleIcon } from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"

interface ChangeLogModalProps {
  isOpen: boolean
  changeLog: string[]
  onClose: () => void
}

export function ChangeLogModal({ isOpen, changeLog, onClose }: ChangeLogModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardDocumentIcon className="w-5 h-5 text-blue-600" />
            Data Update Log
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
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
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
