import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("DB connection: FAIL - DATABASE_URL not set");
    return;
  }
  
  const pool = new Pool({ connectionString: dbUrl, ssl: dbUrl?.includes('localhost') ? false : { rejectUnauthorized: false } });
  try {
    const client = await pool.connect();
    console.log("DB connection: PASS");
    
    // Check PostGIS
    try {
      const pgis = await client.query("SELECT postgis_full_version();");
      console.log("PostGIS: PASS");
    } catch (e: any) {
      console.log("PostGIS: FAIL", e.message);
    }
    
    // Check tables
    const tables = ['thermal_events', 'industrial_facilities', 'geo_context', 'temporal_profiles', 'classifications', 'alerts'];
    let allTablesExist = true;
    for (const t of tables) {
      const res = await client.query(`SELECT to_regclass('${t}')`);
      if (!res.rows[0].to_regclass) {
        allTablesExist = false;
        console.log(`Table missing: ${t}`);
      }
    }
    console.log("Schema: " + (allTablesExist ? "PASS" : "FAIL"));
    
    client.release();
  } catch (e: any) {
    console.log("DB connection: FAIL", e.message);
    return;
  }
  
  await pool.end();
}
run();
