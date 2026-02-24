const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log("Indexes:");
        const res = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'cocoa'");
        console.log(res.rows);

        console.log("\nConstraints:");
        const res2 = await client.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'cocoa'::regclass");
        console.log(res2.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
