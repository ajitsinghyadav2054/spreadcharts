// backfill_cocoa_bags.js
// One-time script to load all historical data (2020→today) from the Excel file.
// Safe to re-run — skips dates already in DB.

import { syncCocoaBags } from './server/services/cocoaBagsSync.js';

console.log('[Backfill] Starting Cocoa Bags historical load...');
const result = await syncCocoaBags();
console.log('[Backfill] Complete!', result);
process.exit(0);
