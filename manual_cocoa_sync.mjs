import { syncCocoaBags } from './server/services/cocoaBagsSync.js';
import { syncCocoaLondon } from './server/services/cocoaLondonSync.js';

console.log('=== Manual Cocoa Data Sync ===');
console.log('Syncing US Bags...');
const usResult = await syncCocoaBags();
console.log('US Bags result:', usResult);

console.log('\nSyncing London Bags...');
const londonResult = await syncCocoaLondon();
console.log('London Bags result:', londonResult);

console.log('\n=== Sync Complete ===');
process.exit(0);
