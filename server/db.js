import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const { Pool, types } = pg;

// Force Postgres DATE (OID 1082) to be returned as a raw string (YYYY-MM-DD)
// rather than being parsed as a local JS Date object by the driver.
// This prevents the one-day shift caused by timezone offsets during JSON serialization.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
