import { appendCandle } from '../features/chartData/chartDataSlice';
import { setConnected, setError } from '../features/ws/wsSlice';

// ============================================================
// Mock WebSocket Service
//
// Since no real WS endpoint is available yet, this simulates
// real-time price updates using setInterval.
//
// Every 2 seconds it generates a new candle tick based on a
// random walk from the last candle's close price.
//
// When a real WS URL is available, replace the mock logic
// with a native WebSocket connection — the API stays the same:
//   connect(), disconnect(), subscribe(instrument)
// ============================================================

let intervalId = null;
let storeRef = null;
let currentInstrument = null;

/**
 * Generate a random candle tick based on the last close price.
 * Uses a "random walk" — the price moves up or down by a small random amount.
 */
function generateTick(lastCandle) {
    // Smart volatility: scale to the price regime
    // - Spreads near zero (CLN27-Q27 at ~0.03): small absolute moves
    // - Futures (CTN26 at ~67): ~0.5% of price
    const absPrice = Math.abs(lastCandle.close);
    let volatility;
    if (absPrice < 1) {
        // Spread data: move 1-3% of the typical spread range (~2 points)
        volatility = 0.02 + Math.random() * 0.02;
    } else if (absPrice < 10) {
        volatility = absPrice * 0.008;
    } else {
        // Futures/commodities: 0.3-0.5% daily moves
        volatility = absPrice * 0.005;
    }

    const direction = Math.random() - 0.48; // slight upward bias
    const change = direction * volatility;
    const newClose = parseFloat((lastCandle.close + change).toFixed(4));

    // Wicks: 20-60% of volatility
    const wickUp = volatility * (0.2 + Math.random() * 0.4);
    const wickDown = volatility * (0.2 + Math.random() * 0.4);
    const newHigh = parseFloat((Math.max(lastCandle.close, newClose) + wickUp).toFixed(4));
    const newLow = parseFloat((Math.min(lastCandle.close, newClose) - wickDown).toFixed(4));

    // Volume: slight random variation, clamped to prevent blowup
    const baseVolume = lastCandle.volume || 1000;
    const newVolume = Math.min(
        Math.max(Math.floor(baseVolume * (0.85 + Math.random() * 0.3)), 200),
        50000 // hard cap
    );

    return {
        product: lastCandle.product,
        time: lastCandle.time + 86400, // next day
        open: lastCandle.close,
        high: newHigh,
        low: newLow,
        close: newClose,
        volume: newVolume,
    };
}

// Map instrumentId -> intervalId
let activeintervals = {};

/**
 * Connect the mock WebSocket.
 * @param {object} store - The Redux store instance
 */
export function connect(store) {
    storeRef = store;
    store.dispatch(setConnected(true));
    console.log('[WS Mock] Connected');
}

/**
 * Subscribe to real-time updates for one or more instruments.
 * @param {string|string[]} instrumentOrList - Single ID or array of IDs
 */
export function subscribe(instrumentOrList) {
    // Unsubscribe from everything before subscribing to new set
    unsubscribeAll();

    const list = Array.isArray(instrumentOrList) ? instrumentOrList : [instrumentOrList];

    list.forEach(instrumentId => {
        if (!instrumentId) return;

        console.log(`[WS Mock] Subscribed to ${instrumentId}`);

        activeintervals[instrumentId] = window.setInterval(() => {
            if (!storeRef) return;

            const state = storeRef.getState();
            const data = state.chartData.instruments[instrumentId]?.data;
            if (!data || data.length === 0) return;

            const lastCandle = data[data.length - 1];
            const newCandle = generateTick(lastCandle);

            storeRef.dispatch(appendCandle({
                instrumentId,
                candle: newCandle,
            }));
        }, 2000);
    });
}

/**
 * Unsubscribe from all updates.
 */
export function unsubscribeAll() {
    Object.keys(activeintervals).forEach(id => {
        clearInterval(activeintervals[id]);
        console.log(`[WS Mock] Unsubscribed from ${id}`);
    });
    activeintervals = {};
}

/**
 * Exported alias for compatibility if needed, but we use unsubscribeAll internally
 */
export function unsubscribe() {
    unsubscribeAll();
}

/**
 * Disconnect the mock WebSocket.
 */
export function disconnect() {
    unsubscribe();
    if (storeRef) {
        storeRef.dispatch(setConnected(false));
        console.log('[WS Mock] Disconnected');
        storeRef = null;
    }
}
