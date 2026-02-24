/**
 * Aggregates daily OHLC data into weekly candles using UTC.
 * 
 * @param {Array} dailyData - Array of daily OHLC candles { time, open, high, low, close }
 * @param {boolean} weekStartsOnMonday - If true, Monday is the first day of the week (default).
 * @returns {Array} Weekly OHLC candles.
 */
export function aggregateToWeekly(dailyData, weekStartsOnMonday = true) {
    if (!dailyData || dailyData.length === 0) return [];

    // Sort by time first to be safe
    const sorted = [...dailyData].sort((a, b) => a.time - b.time);

    const weeklyMap = new Map();

    sorted.forEach((candle) => {
        // Lightweight Charts uses seconds for Unix timestamp
        const date = new Date(candle.time * 1000);

        // Perform UTC-based "start of week" calculation to avoid local timezone shifts
        // Get UTC day: 0 (Sun) to 6 (Sat)
        const utcDay = date.getUTCDay();

        // Find how many days to subtract to get to the start of the week
        let daysToSubtract = 0;
        if (weekStartsOnMonday) {
            // Monday is 1. If today is Sunday (0), we go back 6 days.
            daysToSubtract = utcDay === 0 ? 6 : utcDay - 1;
        } else {
            // Sunday is 0.
            daysToSubtract = utcDay;
        }

        // Create a new date at UTC midnight of that Monday/Sunday
        let weekStartUtc = Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate() - daysToSubtract
        );

        // ALIGNMENT FIX: Shift weekly OHLC candles to Tuesday (Monday + 1 day)
        // to match the COT data reporting day on the main chart.
        if (weekStartsOnMonday) {
            weekStartUtc += 86400 * 1000; // Add 24 hours
        }

        const key = Math.floor(weekStartUtc / 1000); // Unix timestamp (sec)

        if (!weeklyMap.has(key)) {
            weeklyMap.set(key, {
                time: key,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            });
        } else {
            const group = weeklyMap.get(key);
            group.high = Math.max(group.high, candle.high);
            group.low = Math.min(group.low, candle.low);
            group.close = candle.close;
        }
    });

    return Array.from(weeklyMap.values()).sort((a, b) => a.time - b.time);
}
