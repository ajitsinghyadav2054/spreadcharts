// ============================================================
// Utility formatters for dates, prices, and numbers
// ============================================================

/**
 * Format UNIX timestamp to a readable date string
 * @param {number} timestamp - UNIX timestamp in seconds
 * @returns {string} e.g. "Jan 15, 2025"
 */
export function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Format price with appropriate decimal places
 * For small values (spreads), use 4 decimals
 * For larger values (futures), use 2 decimals
 */
export function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    const abs = Math.abs(price);
    if (abs < 1) return price.toFixed(4);
    if (abs < 100) return price.toFixed(2);
    return price.toFixed(2);
}

/**
 * Format volume with K/M suffixes
 */
export function formatVolume(volume) {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
}

/**
 * Calculate percentage change between two values
 */
export function percentChange(oldVal, newVal) {
    if (oldVal === 0) return 0;
    return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
}
