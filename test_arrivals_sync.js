import { syncIvoryArrivals } from './server/services/cocoaArrivalsSync.js';

async function test() {
    try {
        console.log("Calling syncIvoryArrivals...");
        const res = await syncIvoryArrivals();
        console.log("Result:", res);
    } catch (e) {
        console.error("Caught error:", e);
    }
    process.exit(0);
}

test();
