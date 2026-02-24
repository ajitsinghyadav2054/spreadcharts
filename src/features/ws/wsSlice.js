import { createSlice } from '@reduxjs/toolkit';

// ============================================================
// wsSlice — tracks WebSocket connection state
//
// Simple slice: just connected/disconnected + error tracking.
// The actual WebSocket logic lives in services/websocket.js,
// this slice only reflects the current connection status so
// the UI can show a green/red connection indicator.
// ============================================================

const initialState = {
    connected: false,
    lastMessage: null,
    error: null,
};

const wsSlice = createSlice({
    name: 'ws',
    initialState,
    reducers: {
        setConnected(state, action) {
            state.connected = action.payload;
            if (action.payload) state.error = null;
        },
        setLastMessage(state, action) {
            state.lastMessage = action.payload;
        },
        setError(state, action) {
            state.error = action.payload;
            state.connected = false;
        },
    },
});

export const { setConnected, setLastMessage, setError } = wsSlice.actions;

export const selectWsConnected = (state) => state.ws.connected;
export const selectWsError = (state) => state.ws.error;

export default wsSlice.reducer;
