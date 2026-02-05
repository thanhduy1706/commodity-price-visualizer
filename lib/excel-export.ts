// Excel Export Library using ExcelJS

import ExcelJS from "exceljs"
import { LMEResponse } from "./lme-api"

export interface ExcelExportData {
  officialPrices: LMEResponse
  closingPrices: LMEResponse
}

/**
 * Convert LME response data to tabular format
 */
function convertToTable(data: LMEResponse): Array<Record<string, any>> {
  const { Labels, Datasets } = data
  const rows: Array<Record<string, any>> = []

  for (let i = 0; i < Labels.length; i++) {
    const row: Record<string, any> = {
      Date: Labels[i],
    }

    Datasets.forEach((dataset) => {
      const columnName = `${dataset.RowTitle} - ${dataset.Label}`
      const value = dataset.Data[i]
      row[columnName] = value ? parseFloat(value) : null
    })

    rows.push(row)
  }

  return rows
}

/**
 * Generate Excel file from LME data
 */
export async function generateExcelFile(
  data: ExcelExportData,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // Set workbook properties
  workbook.creator = "LME Copper Data Fetcher"
  workbook.lastModifiedBy = "LME Copper Data Fetcher"
  workbook.created = new Date()
  workbook.modified = new Date()

  // Add Official Prices sheet
  const officialSheet = workbook.addWorksheet("Official Prices")
  const officialData = convertToTable(data.officialPrices)

  if (officialData.length > 0) {
    // Add headers
    const headers = Object.keys(officialData[0])
    officialSheet.addRow(headers)

    // Style headers
    officialSheet.getRow(1).font = { bold: true }
    officialSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F81BD" },
    }
    officialSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }

    // Add data rows
    officialData.forEach((row) => {
      const values = headers.map((header) => row[header])
      officialSheet.addRow(values)
    })

    // Auto-fit columns
    officialSheet.columns.forEach((column) => {
      if (column) {
        column.width = 15
      }
    })

    // Format number columns
    for (let i = 2; i <= officialSheet.rowCount; i++) {
      for (let j = 2; j <= officialSheet.columnCount; j++) {
        const cell = officialSheet.getCell(i, j)
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0.00"
        }
      }
    }
  }

  // Add Closing Prices sheet
  const closingSheet = workbook.addWorksheet("Closing Prices")
  const closingData = convertToTable(data.closingPrices)

  if (closingData.length > 0) {
    // Add headers
    const headers = Object.keys(closingData[0])
    closingSheet.addRow(headers)

    // Style headers
    closingSheet.getRow(1).font = { bold: true }
    closingSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F81BD" },
    }
    closingSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }

    // Add data rows
    closingData.forEach((row) => {
      const values = headers.map((header) => row[header])
      closingSheet.addRow(values)
    })

    // Auto-fit columns
    closingSheet.columns.forEach((column) => {
      if (column) {
        column.width = 15
      }
    })

    // Format number columns
    for (let i = 2; i <= closingSheet.rowCount; i++) {
      for (let j = 2; j <= closingSheet.columnCount; j++) {
        const cell = closingSheet.getCell(i, j)
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0.00"
        }
      }
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .substring(0, 15)
  return `LME_Copper_Data_${timestamp}.xlsx`
}
