import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  showChart: boolean
  success: string | null
  downloadedFile: string | null
}

const initialState: UIState = {
  showChart: false,
  success: null,
  downloadedFile: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setShowChart: (state, action: PayloadAction<boolean>) => {
      state.showChart = action.payload
    },
    setSuccess: (state, action: PayloadAction<string | null>) => {
      state.success = action.payload
    },
    setDownloadedFile: (state, action: PayloadAction<string | null>) => {
      state.downloadedFile = action.payload
    },
    clearMessages: (state) => {
      state.success = null
    },
  },
})

export const { setShowChart, setSuccess, setDownloadedFile, clearMessages } = uiSlice.actions
export default uiSlice.reducer
