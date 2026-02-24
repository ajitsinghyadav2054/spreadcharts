const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const cotton = await client.query('SELECT COUNT(*) FROM cotton_no_2');
        console.log(`Cotton: ${cotton.rows[0].count}`);

        const sugar = await client.query('SELECT COUNT(*) FROM sugar_no_11');
        console.log(`Sugar: ${sugar.rows[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
main();
