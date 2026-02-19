
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL must be set");
    process.exit(1);
}

const connectionString = process.env.DATABASE_URL?.replace("localhost", "127.0.0.1");
const pool = new Pool({ connectionString });

async function checkTables() {
    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log("Tables in public schema:");
        const tables = result.rows.map(row => row.table_name);
        tables.forEach(t => console.log(`- ${t}`));

        const sessionsExists = tables.includes('sessions');
        console.log(`\nSessions table exists: ${sessionsExists}`);

    } catch (error) {
        console.error("Error checking tables:", error);
    } finally {
        await pool.end();
    }
}

checkTables();
