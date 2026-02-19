
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Log the connection string (masking password) for debugging
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
}

const maskedUrl = connectionString.replace(/:([^:@]+)@/, ":****@");
console.log(`Testing connection to: ${maskedUrl}`);

const pool = new Pool({ connectionString });

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log("✅ Successfully connected to the database!");

        // Check if taskflow database exists (we are already connected to it if successful, but let's verify current DB)
        const res = await client.query('SELECT current_database()');
        console.log(`Connected to database: ${res.rows[0].current_database}`);

        // Check tables
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`Found ${tables.length} tables: ${tables.join(', ') || 'None'}`);

        if (tables.includes('users') && tables.includes('sessions')) {
            console.log("✅ 'users' and 'sessions' tables exist.");
        } else {
            console.log("⚠️ 'users' or 'sessions' table missing. Sync needed.");
        }

        client.release();
    } catch (err: any) {
        console.error("\n❌ Connection Failed:");
        console.error(`Error Code: ${err.code}`);

        if (err.code === '28P01') {
            console.error("Reason: INVALID PASSWORD. Please check the password in DATABASE_URL.");
        } else if (err.code === '28000') {
            console.error("Reason: INVALID AUTHORIZATION (User does not exist).");
            console.error("Suggestion: Try changing the username to 'postgres' in .env");
        } else if (err.code === '3D000') {
            console.error("Reason: DATABASE DOES NOT EXIST.");
            console.error("Suggestion: Create the database 'taskflow' using pgAdmin or psql.");
        } else if (err.code === 'ECONNREFUSED') {
            console.error("Reason: CONNECTION REFUSED. Is PostgreSQL running on port 5432?");
        } else {
            console.error(`Reason: ${err.message}`);
        }
    } finally {
        await pool.end();
    }
}

testConnection();
