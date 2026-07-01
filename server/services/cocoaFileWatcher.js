// server/services/cocoaFileWatcher.js
// Watches the OneDrive-synced Excel files for changes.
// When OneDrive syncs an update → triggers the correct sync function automatically.

import chokidar from 'chokidar';
import path from 'path';
import { syncCocoaBags, COCOA_BAGS_FILE } from './cocoaBagsSync.js';
import { syncCocoaLondon, COCOA_LONDON_FILE } from './cocoaLondonSync.js';
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
        COCOA_BAGS_FILE,           // US Bags Excel (Cocoa_Bags_Aggregate_final.xlsx)
        COCOA_LONDON_FILE,         // London Bags Excel (aggregate_report.xlsx)
        COCOA_LONDON_ORIGIN_DIR,   // London Product/Region origin folder (Valid Stock by Origin)
        COCOA_IVORY_ARRIVALS_FILE, // Ivory Arrivals Excel
        COCOA_RATIOS_WATCH_DIR     // Ratio images folder
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

        // 1. Ratio images — handled immediately, no debounce
        if (filePath.includes('Product Ratios Images')) {
            if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
                ocrQueue.push(filePath);
                processOcrQueue();
            }
            return;
        }

        // Debounce the rest: OneDrive sometimes writes in multiple chunks
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            console.log(`[CocoaWatcher] File ${event}: ${filePath}`);
            console.log('[CocoaWatcher] Running sync...');
            try {
                const normalPath = path.normalize(filePath);
                const normalLondonBagsFile = path.normalize(COCOA_LONDON_FILE);
                const normalUSBagsFile = path.normalize(COCOA_BAGS_FILE);
                const normalIvoryFile = path.normalize(COCOA_IVORY_ARRIVALS_FILE);
                const normalOriginDir = path.normalize(COCOA_LONDON_ORIGIN_DIR);

                // 2. London Bags (aggregate_report.xlsx → cocoa_london_bags)
                if (normalPath === normalLondonBagsFile) {
                    const result = await syncCocoaLondon();
                    console.log('[CocoaWatcher] London Bags Sync complete:', result);

                    // 3. London Product/Region Origin (Valid Stock files)
                } else if (normalPath.startsWith(normalOriginDir) || filePath.includes('Valid_Stock') || filePath.includes('Valid Stock')) {
                    const result = await syncLondonOriginFile(filePath);
                    console.log('[CocoaWatcher] London Origin Sync complete:', result);

                    // 4. Ivory Arrivals
                } else if (normalPath === normalIvoryFile) {
                    const result = await syncIvoryArrivals();
                    console.log('[CocoaWatcher] Ivory Arrivals Sync complete:', result);

                    // 5. US Bags (Cocoa_Bags_Aggregate_final.xlsx → cocoa_us_bags)
                } else if (normalPath === normalUSBagsFile) {
                    const result = await syncCocoaBags();
                    console.log('[CocoaWatcher] US Bags Sync complete:', result);

                } else {
                    console.log('[CocoaWatcher] Unknown file changed, skipping:', filePath);
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
