import type { Metadata } from "next"
import "./globals.css"
import { ReduxProvider } from "@/lib/redux/ReduxProvider"

export const metadata: Metadata = {
  title: "commodity-price-visualizer",
  description: "Real-time commodity price data with interactive charts",
}

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <ReduxProvider>
          {children}
          <Toaster />
        </ReduxProvider>
      </body>
    </html>
  )
}
