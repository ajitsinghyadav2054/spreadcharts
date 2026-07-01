/**
 * Aggregates daily OHLC data into weekly candles using UTC.
 * 
 * @param {Array} dailyData - Array of daily OHLC candles { time, open, high, low, close }
 * @param {boolean} weekStartsOnWednesday - If true, the week groups from Wednesday to Tuesday (default).
 * @returns {Array} Weekly OHLC candles.
 */
export function aggregateToWeekly(dailyData, weekStartsOnWednesday = true) {
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

        let daysToSubtract = 0;

        if (weekStartsOnWednesday) {
            // Group the week starting on Wednesday and ending on Tuesday.
            // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
            // We want Wed -> 0, Thu -> 1, Fri -> 2, Sat -> 3, Sun -> 4, Mon -> 5, Tue -> 6
            daysToSubtract = (utcDay + 4) % 7;
        } else {
            // Old Monday logic
            daysToSubtract = utcDay === 0 ? 6 : utcDay - 1;
        }

        // Create a new date at UTC midnight of the start of the timeframe
        let weekStartUtc = Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate() - daysToSubtract
        );

        // Remove the shift to Tuesday so the timestamp is stamped precisely on Wednesday,
        // which makes Lightweight Charts accurately reflect the candle's START day as Wednesday.
        if (!weekStartsOnWednesday) {
            // Old Monday logic: still stamp as Monday (or shifted) if needed.
            // But since weekStartsOnWednesday is true by default, it will stay on Wednesday.
            weekStartUtc += 1 * 86400 * 1000;
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
