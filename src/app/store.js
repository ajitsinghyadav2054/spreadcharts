import { configureStore } from '@reduxjs/toolkit';
import chartDataReducer from '../features/chartData/chartDataSlice';
import uiReducer from '../features/ui/uiSlice';
import wsReducer from '../features/ws/wsSlice';

// ============================================================
// Redux Store — single source of truth for the entire app
//
// Three slices:
//   chartData — OHLC candle data, active instrument, intervals
//   ui        — tabs, sidebar, modals, drawing mode
//   ws        — WebSocket connection state
//
// Redux Toolkit uses Immer internally, so all reducers can
// "mutate" state directly (it's actually producing immutable updates).
// ============================================================

import authReducer from '../features/auth/authSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        chartData: chartDataReducer,
        ui: uiReducer,
        ws: wsReducer,
    },
});

export default store;
