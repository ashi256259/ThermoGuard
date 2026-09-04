import { initDb, persistHotspot, loadAllHotspots, isDbConnected } from './database_sync.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await initDb();
  console.log("DB Connected:", isDbConnected());

  const testId = "TEST_EVENT_" + Date.now();
  
  const testHotspot = {
    event: {
      id: testId,
      latitude: 0,
      longitude: 0,
      timestamp: new Date().toISOString(),
      brightness: 300,
      frp: 50,
      confidence: "h",
      satellite: "TEST",
      source: "TEST_SOURCE",
      cluster_id: testId + "_CLUSTER",
      daynight: "D"
    },
    geo_context: {
      nearest_industrial_facility: "Test Facility",
      facility_type: "Test",
      distance_to_industry: 100,
      land_cover: "Test",
      spatial_flags: {}
    },
    temporal_profile: {
      cluster_id: testId + "_CLUSTER",
      first_seen: new Date().toISOString(),
      observation_count: 1,
      frequency_per_week: 1,
      recurrence_ratio: 1,
      persistence_days: 1,
      is_persistent: false
    },
    classification: {
      predicted_class: "Other",
      confidence: 100,
      risk_score: "LOW",
      risk_value: 50,
      persistence_score: 10,
      model_version: "vTest",
      evidence: []
    }
  };

  try {
    await persistHotspot(testHotspot);
    const hotspots = await loadAllHotspots();
    const found = hotspots.find((h: any) => h.event.id === testId);
    
    if (found) {
      console.log("Persistence: PASS");
    } else {
      console.log("Persistence: FAIL - Event not found after persist");
    }

    // Clean up
    const dbUrl = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString: dbUrl, ssl: dbUrl?.includes('localhost') ? false : { rejectUnauthorized: false } });
    await pool.query(`DELETE FROM thermal_events WHERE id = $1`, [testId]);
    await pool.end();
  } catch (e: any) {
    console.log("Persistence: FAIL -", e.message);
  }
}
run();
