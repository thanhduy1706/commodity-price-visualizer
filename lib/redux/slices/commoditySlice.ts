import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types
export interface ChartDataPoint {
  date: string
  copper?: number
  zinc?: number
  oil?: number
}

interface CommodityState {
  chartData: ChartDataPoint[]
  loading: boolean
  error: string | null
  lastFetchTime: string | null
  dataSource: 'cache' | 'database' | 'fresh' | null
}

const initialState: CommodityState = {
  chartData: [],
  loading: false,
  error: null,
  lastFetchTime: null,
  dataSource: null,
}

// Async thunks
export const fetchFreshData = createAsyncThunk(
  'commodity/fetchFresh',
  async (_, { rejectWithValue }) => {
    try {
      const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

      // Fetch all three sources in parallel
      const [copperRes, zincRes, oilRes] = await Promise.all([
        fetch(`${PYTHON_API}/api/fetch-data-json?source=copper`),
        fetch(`${PYTHON_API}/api/fetch-data-json?source=zinc`),
        fetch(`${PYTHON_API}/api/fetch-data-json?source=oil`)
      ])

      if (!copperRes.ok || !zincRes.ok || !oilRes.ok) {
        throw new Error("Failed to fetch one or more data sources")
      }

      const copperData = await copperRes.json()
      const zincData = await zincRes.json()
      const oilData = await oilRes.json()

      // Combine data by date
      const dataMap = new Map<string, ChartDataPoint>()

      copperData.data?.forEach((item: any) => {
        if (item.date && item.value) {
          dataMap.set(item.date, { date: item.date, copper: parseFloat(item.value) })
        }
      })

      zincData.data?.forEach((item: any) => {
        if (item.date && item.value) {
          const existing: ChartDataPoint = dataMap.get(item.date) || { date: item.date }
          existing.zinc = parseFloat(item.value)
          dataMap.set(item.date, existing)
        }
      })

      oilData.data?.forEach((item: any) => {
        if (item.date && item.value) {
          const existing: ChartDataPoint = dataMap.get(item.date) || { date: item.date }
          existing.oil = parseFloat(item.value)
          dataMap.set(item.date, existing)
        }
      })

      // Convert to array and sort
      const combinedData = Array.from(dataMap.values())
        .filter(item => new Date(item.date) >= new Date("2023-01-01"))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return combinedData
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const loadFromDatabase = createAsyncThunk(
  'commodity/loadFromDB',
  async (_: void, { rejectWithValue }) => {
    try {
      const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const startDate = '2023-01-01'
      const response = await fetch(`${PYTHON_API}/api/db/chart-data?start_date=${startDate}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data as ChartDataPoint[]
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Slice
const commoditySlice = createSlice({
  name: 'commodity',
  initialState,
  reducers: {
    setChartData: (state, action: PayloadAction<ChartDataPoint[]>) => {
      state.chartData = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    setDataSource: (state, action: PayloadAction<'cache' | 'database' | 'fresh'>) => {
      state.dataSource = action.payload
    },
  },
  extraReducers: (builder) => {
    // Fetch fresh data
    builder
      .addCase(fetchFreshData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFreshData.fulfilled, (state, action) => {
        state.loading = false
        state.chartData = action.payload
        state.lastFetchTime = new Date().toISOString()
        state.dataSource = 'fresh'
        state.error = null
      })
      .addCase(fetchFreshData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Load from database
    builder
      .addCase(loadFromDatabase.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadFromDatabase.fulfilled, (state, action) => {
        state.loading = false
        state.chartData = action.payload
        state.lastFetchTime = new Date().toISOString()
        state.dataSource = 'database'
        state.error = null
      })
      .addCase(loadFromDatabase.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { setChartData, clearError, setDataSource } = commoditySlice.actions
export default commoditySlice.reducer
