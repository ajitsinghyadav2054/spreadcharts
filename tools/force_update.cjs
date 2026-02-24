const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        // Hardcode one update
        const query = `
      UPDATE cocoa 
      SET open_interest_all = 372290
      WHERE as_of_date_in_form_yymmdd = 150825
      AND market_and_exchange_names ILIKE '%COCOA%'
      RETURNING *
    `;
        const res = await client.query(query);
        console.log("Updated rows:", res.rows.length);
        if (res.rows.length > 0) {
            console.log("Updated row:", res.rows[0]);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
