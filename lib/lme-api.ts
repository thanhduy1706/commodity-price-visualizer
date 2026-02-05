// LME API Client Library

export interface LMEDataset {
  RowTitle: string
  RowId: string
  Label: string
  Data: string[]
  Hover?: string[]
}

export interface LMEResponse {
  HistoricalDataLookbackEnabled: boolean
  HistoricalDataLookbackRange: number
  HistoricalDataLookbackUnit: number
  DateOfData: string
  LookbackDate: string
  Labels: string[]
  Datasets: LMEDataset[]
}

export interface FetchLMEDataParams {
  datasourceId: string
  startDate: string
  endDate: string
  cookies?: string
}

// Datasource IDs
export const DATASOURCE_IDS = {
  OFFICIAL_PRICES: "39fabad0-95ca-491b-a733-bcef31818b16",
  CLOSING_PRICES: "2d147ed0-19a4-4535-8635-26f72660ef7e",
} as const

/**
 * Parse cookie string into headers object
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieString) return cookies

  cookieString.split(";").forEach((cookie) => {
    const [key, value] = cookie.trim().split("=")
    if (key && value) {
      cookies[key] = value
    }
  })

  return cookies
}

/**
 * Fetch LME data from the API
 */
export async function fetchLMEData({
  datasourceId,
  startDate,
  endDate,
  cookies,
}: FetchLMEDataParams): Promise<LMEResponse> {
  const url = new URL("https://www.lme.com/api/trading-data/chart-data")
  url.searchParams.append("datasourceId", datasourceId)
  url.searchParams.append("startDate", startDate)
  url.searchParams.append("endDate", endDate)

  const headers: HeadersInit = {
    accept: "*/*",
    "accept-language": "en-GB,en;q=0.9,vi;q=0.8,vi-VN;q=0.7,en-US;q=0.6",
    "cache-control": "no-cache",
    pragma: "no-cache",
    priority: "u=1, i",
    referer: "https://www.lme.com/metals/non-ferrous/lme-copper",
    "sec-ch-ua":
      '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-arch": '"x86"',
    "sec-ch-ua-bitness": '"64"',
    "sec-ch-ua-full-version-list":
      '"Chromium";v="146.0.7655.3", "Not-A.Brand";v="24.0.0.0", "Google Chrome";v="146.0.7655.3"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"19.0.0"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  }

  // Add cookies if provided - MUST come after other headers
  if (cookies) {
    headers["cookie"] = cookies.trim()
  }

  console.log("[LME API] Fetching:", url.toString())
  console.log("[LME API] Cookies present:", !!cookies)
  console.log("[LME API] Cookie length:", cookies?.length || 0)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  })

  console.log("[LME API] Response status:", response.status)

  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      const bodyText = await response.text()
      console.error(
        "[LME API] Auth failed. Response:",
        bodyText.substring(0, 200)
      )
      throw new Error("Authentication failed. Please provide valid cookies.")
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data as LMEResponse
}

/**
 * Fetch both official and closing prices
 */
export async function fetchAllLMEData(
  startDate: string,
  endDate: string,
  cookies?: string
): Promise<{
  officialPrices: LMEResponse
  closingPrices: LMEResponse
}> {
  const [officialPrices, closingPrices] = await Promise.all([
    fetchLMEData({
      datasourceId: DATASOURCE_IDS.OFFICIAL_PRICES,
      startDate,
      endDate,
      cookies,
    }),
    fetchLMEData({
      datasourceId: DATASOURCE_IDS.CLOSING_PRICES,
      startDate,
      endDate,
      cookies,
    }),
  ])

  return { officialPrices, closingPrices }
}
