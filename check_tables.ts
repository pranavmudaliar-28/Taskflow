
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function checkTables() {
    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log("Tables in database:");
        result.rows.forEach(row => console.log(row.table_name));

        // Check specifically for sessions
        const sessionsExists = result.rows.some(row => row.table_name === 'sessions');
        console.log(`\nSessions table exists: ${sessionsExists}`);

    } catch (error) {
        console.error("Error checking tables:", error);
    } finally {
        await pool.end();
    }
}

checkTables();
