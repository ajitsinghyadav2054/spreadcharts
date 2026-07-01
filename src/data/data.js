// ============================================================
// COT Report Data — Real Coffee CFTC Data + Dummy Data for Others
// ============================================================

import { COT_METRICS } from './constants';

export { COT_METRICS };

// ---- Dummy time series generator (random walk from base) ----
function generateWeeklyData(baseValue, weeks, volatility = 0.05) {
    const data = [];
    const startDate = new Date('2025-01-06T00:00:00Z');
    let value = baseValue;
    for (let i = 0; i < weeks; i++) {
        const date = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const time = Math.floor(date.getTime() / 1000);
        value = Math.round(value * (1 + (Math.random() - 0.48) * volatility));
        data.push({ time, value });
    }
    return data;
}

// ---- OHLC candlestick data generator (for sub-charts) ----
function generateDailyOHLC(basePrice, days, volatility = 0.02) {
    const data = [];
    const startDate = new Date('2025-01-06T00:00:00Z');
    let price = basePrice;
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
        const time = Math.floor(date.getTime() / 1000);
        const change = price * volatility;
        const open = price;
        const close = price + (Math.random() - 0.48) * change * 2;
        const high = Math.max(open, close) + Math.random() * change;
        const low = Math.min(open, close) - Math.random() * change;
        data.push({
            time,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
        });
        price = close;
    }
    return data;
}

// ============================================================
// REAL COFFEE C DATA — 52 weeks from CFTC report
// ============================================================
import { COFFEE_DATA } from './coffee_real.js';

const WEEKS = 52;

// ---- Other Products (dummy data) ----
const PRODUCTS = {
    'WHEAT-SRW': { oi: 400000, prod: 120000, swap: 80000, mm: 90000 },
    'CORN': { oi: 1500000, prod: 450000, swap: 300000, mm: 350000 },
    'SOYBEANS': { oi: 800000, prod: 250000, swap: 180000, mm: 200000 },
    'SOYBEAN OIL': { oi: 500000, prod: 150000, swap: 100000, mm: 130000 },
    'CRUDE OIL': { oi: 2000000, prod: 600000, swap: 400000, mm: 500000 },
    'NATURAL GAS': { oi: 1200000, prod: 350000, swap: 250000, mm: 300000 },
    'GOLD': { oi: 550000, prod: 170000, swap: 120000, mm: 140000 },
    'SILVER': { oi: 160000, prod: 50000, swap: 35000, mm: 40000 },
};

// ---- Build the nested data map: Product -> Metric -> Data[] ----
const dataMap = {};

// Add COFFEE C with real-based data
dataMap['COFFEE C'] = COFFEE_DATA;

// Add other products with dummy data
Object.entries(PRODUCTS).forEach(([product, bases]) => {
    dataMap[product] = {
        'Open_Interest_All': generateWeeklyData(bases.oi, WEEKS),
        'Producer_Long_All': generateWeeklyData(bases.prod, WEEKS),
        'Producer_Short_All': generateWeeklyData(Math.round(bases.prod * 0.9), WEEKS),
        'Swap_Long_All': generateWeeklyData(bases.swap, WEEKS),
        'Swap_Short_All': generateWeeklyData(Math.round(bases.swap * 0.85), WEEKS),
        'Swap_Spread_All': generateWeeklyData(Math.round(bases.swap * 0.3), WEEKS),
        'Managed_Money_Long_All': generateWeeklyData(bases.mm, WEEKS),
        'Managed_Money_Short_All': generateWeeklyData(Math.round(bases.mm * 0.7), WEEKS),
        'Managed_Money_Spread_All': generateWeeklyData(Math.round(bases.mm * 0.2), WEEKS),
        'Other_Rept_Long_All': generateWeeklyData(Math.round(bases.prod * 0.4), WEEKS),
        'Other_Rept_Short_All': generateWeeklyData(Math.round(bases.prod * 0.35), WEEKS),
        'Other_Rept_Spread_All': generateWeeklyData(Math.round(bases.prod * 0.1), WEEKS),
        'Tot_Rept_Long_All': generateWeeklyData(Math.round(bases.oi * 0.8), WEEKS),
        'Tot_Rept_Short_All': generateWeeklyData(Math.round(bases.oi * 0.75), WEEKS),
        'NonRept_Long_All': generateWeeklyData(Math.round(bases.oi * 0.2), WEEKS),
        'NonRept_Short_All': generateWeeklyData(Math.round(bases.oi * 0.25), WEEKS),
    };
});

console.log('[Data] Data generated.', Object.keys(dataMap));
console.log('[Data] COFFEE C last values:', Object.entries(COFFEE_DATA).map(
    ([k, v]) => `${k}: ${v[v.length - 1].value}`
).join(', '));

// ---- Futures Ticker OHLC Data (for sub-charts) ----
const TICKERS = {
    'KC': { name: 'Coffee C', base: 250 },
    'CC': { name: 'Cocoa', base: 8000 },
    'CT': { name: 'Cotton No. 2', base: 70 },
    'SG': { name: 'Sugar No. 11', base: 22 },
    'C': { name: 'London Cocoa', base: 2500 },
    'RC': { name: 'Robusta Coffee', base: 4500 },
    'W': { name: 'White Sugar', base: 600 },
    'DC': { name: 'Milk Class III', base: 20 },
    'OJ': { name: 'Orange Juice', base: 300 },
    'CSC': { name: 'Cheese (Cash Settled)', base: 2 },
    'ZR': { name: 'Rough Rice', base: 18 },
    'LBR': { name: 'Lumber', base: 600 },
    'OTS': { name: 'Oats', base: 400 },
};

const TRADING_DAYS = 260;

const tickerDataMap = {};
// Disable dummy data generation for futures to ensure we only see API data
// Object.entries(TICKERS).forEach(([ticker, info]) => {
//     tickerDataMap[ticker] = generateDailyOHLC(info.base, TRADING_DAYS);
// });

const tickerList = Object.entries(TICKERS).map(([id, info]) => ({
    id,
    name: info.name,
    type: 'futures',
}));

// ---- Build COT instruments list ----
const instrumentsList = [];
Object.keys(dataMap).sort().forEach(product => {
    COT_METRICS.forEach(metric => {
        instrumentsList.push({
            id: `${product}-${metric.id}`,
            name: `${product} ${metric.name}`,
            type: 'cot',
            category: product,
        });
    });
});

// ---- Exports ----
export const INSTRUMENT_DATA_MAP = dataMap;
export const TICKER_DATA_MAP = tickerDataMap;
export const AVAILABLE_INSTRUMENTS = instrumentsList;
export const TICKER_LIST = tickerList;
export const COT_PRODUCTS = Object.keys(dataMap).sort();
