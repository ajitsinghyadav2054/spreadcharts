import { updateHistoricOi } from './server/services/historicOiUpdater.js';

async function run() {
    console.log("Starting manual update run...");
    await updateHistoricOi();
    process.exit(0);
}
run();
