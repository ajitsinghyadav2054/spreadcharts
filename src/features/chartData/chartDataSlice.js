import { createSlice } from '@reduxjs/toolkit';
import { INSTRUMENT_DATA_MAP, TICKER_DATA_MAP } from '../../data/data';

// ============================================================
// chartDataSlice — manages all instrument data
//
// State shape:
// {
//   instruments: {
//     'SOYBEAN OIL-Producer_Long_All': { data: [...], interval: '1D', loading: false },
//     'KCN26': { data: [...OHLC candles], interval: '1D', loading: false },
//     ...
//   },
//   activeInstrument: null
// }
// ============================================================

// Initialize state from both COT data and Ticker OHLC data
const initialInstruments = {};

// COT metrics (value-based line data)
Object.keys(INSTRUMENT_DATA_MAP).forEach(product => {
    const metrics = INSTRUMENT_DATA_MAP[product];
    Object.keys(metrics).forEach(metricId => {
        const key = `${product}-${metricId}`;
        initialInstruments[key] = {
            data: metrics[metricId],
            interval: '1D',
            loading: false
        };
    });
});

// Futures tickers (OHLC candlestick data)
Object.keys(TICKER_DATA_MAP).forEach(ticker => {
    initialInstruments[ticker] = {
        data: TICKER_DATA_MAP[ticker],
        interval: '1D',
        loading: false
    };
});

const initialState = {
    instruments: initialInstruments,
    activeInstrument: null,
};

const chartDataSlice = createSlice({
    name: 'chartData',
    initialState,
    reducers: {
        // Replace all data for an instrument (e.g., when loading from API)
        setInstrumentData(state, action) {
            const { instrumentId, data } = action.payload;
            if (state.instruments[instrumentId]) {
                state.instruments[instrumentId].data = data;
            } else {
                state.instruments[instrumentId] = { data, interval: '1D', loading: false };
            }
        },

        // Append a single candle (used by WebSocket for real-time updates)
        // If the candle has the same timestamp as the last candle, update it in-place
        // Otherwise, push a new candle
        appendCandle(state, action) {
            const { instrumentId, candle } = action.payload;
            const instrument = state.instruments[instrumentId];
            if (!instrument) return;

            const lastCandle = instrument.data[instrument.data.length - 1];
            if (lastCandle && lastCandle.time === candle.time) {
                // Update existing candle (same time period — price changed)
                instrument.data[instrument.data.length - 1] = { ...lastCandle, ...candle };
            } else {
                // New time period — push new candle
                instrument.data.push(candle);
            }
        },

        // Switch active instrument
        setActiveInstrument(state, action) {
            state.activeInstrument = action.payload;
        },

        // Change time interval for an instrument
        setInterval(state, action) {
            const { instrumentId, interval } = action.payload;
            if (state.instruments[instrumentId]) {
                state.instruments[instrumentId].interval = interval;
            }
        },

        // Set loading state
        setLoading(state, action) {
            const { instrumentId, loading } = action.payload;
            if (state.instruments[instrumentId]) {
                state.instruments[instrumentId].loading = loading;
            }
        },
    },
});

export const {
    setInstrumentData,
    appendCandle,
    setActiveInstrument,
    setInterval,
    setLoading,
} = chartDataSlice.actions;

// Selectors — components use these to read data
export const selectActiveInstrument = (state) => state.chartData.activeInstrument;
export const selectInstrumentData = (instrumentId) => (state) =>
    state.chartData.instruments[instrumentId]?.data || [];
export const selectActiveInstrumentData = (state) => {
    const id = state.chartData.activeInstrument;
    return state.chartData.instruments[id]?.data || [];
};
export const selectInstrumentInterval = (instrumentId) => (state) =>
    state.chartData.instruments[instrumentId]?.interval || '1D';
export const selectAllInstrumentIds = (state) =>
    Object.keys(state.chartData.instruments);

export default chartDataSlice.reducer;
