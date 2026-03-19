// server/services/cocoaFileWatcher.js
// Watches the OneDrive-synced Excel file for changes.
// When OneDrive syncs an update from Dinesh → triggers syncCocoaBags() automatically.

import chokidar from 'chokidar';
import { syncCocoaBags, COCOA_BAGS_FILE } from './cocoaBagsSync.js';
import { syncLondonOriginFile, COCOA_LONDON_ORIGIN_DIR } from './cocoaLondonOriginSync.js';
import { syncIvoryArrivals, COCOA_IVORY_ARRIVALS_FILE } from './cocoaArrivalsSync.js';
import { processRatioImage, COCOA_RATIOS_WATCH_DIR } from './cocoaRatiosOcrSync.js';

let debounceTimer = null;
const ocrQueue = [];
let isProcessingOcr = false;

async function processOcrQueue() {
    if (isProcessingOcr || ocrQueue.length === 0) return;
    isProcessingOcr = true;
    while (ocrQueue.length > 0) {
        const file = ocrQueue.shift();
        try {
            console.log(`[CocoaWatcher] Queue processing image: ${file}`);
            const result = await processRatioImage(file);
            console.log('[CocoaWatcher] Ratio Image OCR complete:', result);
        } catch (err) {
            console.error('[CocoaWatcher] OCR Ratio Queue error:', err);
        }
    }
    isProcessingOcr = false;
    console.log('[CocoaWatcher] Finished processing bulk image queue!');
}

export function startCocoaFileWatcher() {
    const filesToWatch = [
        COCOA_BAGS_FILE,
        COCOA_LONDON_ORIGIN_DIR,
        COCOA_IVORY_ARRIVALS_FILE,
        COCOA_RATIOS_WATCH_DIR
    ];
    console.log('[CocoaWatcher] Watching files for changes:', filesToWatch);

    const watcher = chokidar.watch(filesToWatch, {
        persistent: true,
        ignoreInitial: true,   // don't trigger on startup
        usePolling: true,      // CRITICAL for Windows OneDrive to prevent node crashes (-1073741510)
        interval: 1000,
        awaitWriteFinish: {
            stabilityThreshold: 3000,  // wait 3s after last write before triggering
            pollInterval: 500,
        },
    });

    watcher.on('all', (event, filePath) => {
        if (event !== 'add' && event !== 'change') return;

        if (filePath.includes('Product Ratios Images')) {
            if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
                ocrQueue.push(filePath);
                processOcrQueue();
            }
            return;
        }

        // Debounce: OneDrive sometimes writes the file in multiple chunks
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            console.log(`[CocoaWatcher] File ${event}: ${filePath}`);
            console.log('[CocoaWatcher] Running sync...');
            try {
                if (filePath.includes('aggregate_report') || filePath.includes('Valid_Stock')) {
                    const result = await syncLondonOriginFile(filePath);
                    console.log('[CocoaWatcher] London Sync complete:', result);
                } else if (filePath === COCOA_IVORY_ARRIVALS_FILE) {
                    const result = await syncIvoryArrivals();
                    console.log('[CocoaWatcher] Ivory Arrivals Sync complete:', result);
                } else {
                    const result = await syncCocoaBags();
                    console.log('[CocoaWatcher] US Sync complete:', result);
                }
            } catch (err) {
                console.error('[CocoaWatcher] Sync error:', err.message);
            }
        }, 5000); // wait 5 seconds after last change event
    });

    watcher.on('error', (err) => {
        console.error('[CocoaWatcher] Watcher error:', err.message);
    });

    return watcher;
}
