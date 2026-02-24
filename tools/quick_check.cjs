const { Client } = require('pg');

const client = new Client({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function main() {
    await client.connect();
    const res = await client.query('SELECT COUNT(*) FROM coffee_c');
    console.log(`Coffee Rows: ${res.rows[0].count}`);
    await client.end();
}
main();
