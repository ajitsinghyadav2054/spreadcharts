import { updateHistoricOi } from './server/services/historicOiUpdater.js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

updateHistoricOi()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
