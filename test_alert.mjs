// test_alert.mjs
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

import { runCftcAlertCheck } from './server/services/cftcAlertService.js';

async function test() {
    console.log('Testing alert check manually...');
    try {
        await runCftcAlertCheck();
        console.log('Test complete!');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
