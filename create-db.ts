
import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL?.replace("/taskflow", "/postgres");

if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
}

const client = new Client({ connectionString });

async function createDatabase() {
    try {
        await client.connect();
        console.log("✅ Connected to 'postgres' database.");

        // Check if taskflow database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'taskflow'");
        if (res.rowCount === 0) {
            console.log("Creating database 'taskflow'...");
            await client.query("CREATE DATABASE taskflow");
            console.log("✅ Database 'taskflow' created successfully.");
        } else {
            console.log("ℹ️ Database 'taskflow' already exists.");
        }

    } catch (err: any) {
        console.error("\n❌ Database Creation Failed:");
        console.error(`Error: ${err.message}`);
    } finally {
        await client.end();
    }
}

createDatabase();
