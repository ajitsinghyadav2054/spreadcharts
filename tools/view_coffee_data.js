const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to Neon DB.');

        const query = `
      SELECT report_date_as_yyyy_mm_dd, market_and_exchange_names, prod_merc_positions_long_all, prod_merc_positions_short_all 
      FROM cftc_data 
      WHERE market_and_exchange_names ILIKE '%COFFEE%' 
      ORDER BY report_date_as_yyyy_mm_dd DESC
    `;

        const res = await client.query(query);

        if (res.rows.length === 0) {
            console.log('No data found for COFFEE.');
        } else {
            console.log(`Found ${res.rows.length} rows for COFFEE:`);
            console.table(res.rows);
        }

    } catch (err) {
        console.error('Error fetching data:', err);
    } finally {
        await client.end();
    }
}

main();
