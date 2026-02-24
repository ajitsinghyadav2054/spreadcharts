// ============================================================
// Expression Engine — Continuous Contango Calculator
//
// Contango: when future-month prices > near-month prices
// Formula: contango = front_month_price - next_month_price
//
// This is used to visualize the spread structure of a
// commodity across contract months.
// ============================================================

/**
 * Calculate contango values from two datasets.
 * @param {Array} frontMonthData - OHLC data for the front month contract
 * @param {Array} nextMonthData - OHLC data for the next month contract
 * @returns {Array} Array of { time, value } for line series rendering
 */
export function calculateContango(frontMonthData, nextMonthData) {
    const result = [];
    const nextMonthMap = new Map();

    // Index next month data by time for O(1) lookup
    nextMonthData.forEach((candle) => {
        nextMonthMap.set(candle.time, candle.close);
    });

    // Calculate spread for each front month candle
    frontMonthData.forEach((candle) => {
        const nextClose = nextMonthMap.get(candle.time);
        if (nextClose !== undefined) {
            result.push({
                time: candle.time,
                value: parseFloat((candle.close - nextClose).toFixed(4)),
            });
        }
    });

    return result;
}

/**
 * Normalize data for percentage comparison overlay.
 * Converts absolute prices to percentage change from the first data point.
 * @param {Array} data - OHLC data array
 * @returns {Array} Array of { time, value } with percentage values
 */
export function normalizeToPercentage(data) {
    if (!data || data.length === 0) return [];
    const basePrice = data[0].close;
    if (basePrice === 0) return [];

    return data.map((candle) => ({
        time: candle.time,
        value: parseFloat((((candle.close - basePrice) / Math.abs(basePrice)) * 100).toFixed(2)),
    }));
}
