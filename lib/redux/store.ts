import { configureStore } from '@reduxjs/toolkit'
import commodityReducer from './slices/commoditySlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    commodity: commodityReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
