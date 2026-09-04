import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.log("ThermoGuard: No DATABASE_URL provided. Running in purely in-memory DEMO mode.");
    return false;
  }

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Render/CloudSQL might require ssl
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    // Test connection
    const client = await pool.connect();
    console.log("ThermoGuard: Connected to PostgreSQL/PostGIS database successfully.");
    
    // Initialize schema
    try {
      const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schema);
        console.log("ThermoGuard: Database schema verified/initialized successfully.");
      } else {
        console.warn("ThermoGuard: database/schema.sql not found, skipping schema initialization.");
      }
    } catch (schemaErr: any) {
      console.warn("ThermoGuard: Schema initialization note (might already exist):", schemaErr.message);
    } finally {
      client.release();
    }
    
    return true;
  } catch (err: any) {
    console.error("ThermoGuard: PostgreSQL connection failed:", err.message);
    pool = null;
    return false;
  }
}

export function isDbConnected() {
  return pool !== null;
}

export async function persistHotspot(h: any) {
  if (!pool) return;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let conf = 50.0;
    if (typeof h.event.confidence === 'number') {
      conf = h.event.confidence;
    } else if (typeof h.event.confidence === 'string') {
      const lowerConf = h.event.confidence.toLowerCase();
      if (lowerConf === 'l') conf = 33.3;
      else if (lowerConf === 'n') conf = 66.6;
      else if (lowerConf === 'h') conf = 100.0;
      else {
        const parsed = parseFloat(h.event.confidence);
        if (!isNaN(parsed)) conf = parsed;
      }
    }

    const clusterId = h.event.cluster_id || h.temporal_profile?.cluster_id || h.event.id;
    
    // 1. Insert thermal_events
    await client.query(`
      INSERT INTO thermal_events (
        id, latitude, longitude, timestamp, brightness, frp, confidence, satellite, source, cluster_id, daynight, geom
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_SetSRID(ST_MakePoint($3, $2), 4326)
      ) ON CONFLICT (id) DO NOTHING
    `, [
      h.event.id, h.event.latitude, h.event.longitude, h.event.timestamp, h.event.brightness,
      h.event.frp, conf, h.event.satellite, h.event.source, clusterId, h.event.daynight || 'D'
    ]);

    // 2. Insert geo_context
    await client.query(`
      INSERT INTO geo_context (
        id, event_id, nearest_industrial_facility, facility_type, distance_to_industry, land_cover,
        nearby_infrastructure, distance_to_infrastructure, nearby_road, distance_to_road, contextual_attributes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) ON CONFLICT (id) DO NOTHING
    `, [
      h.event.id + "_geo", h.event.id, h.geo_context.nearest_industrial_facility, h.geo_context.facility_type,
      h.geo_context.distance_to_industry, h.geo_context.land_cover, h.geo_context.nearby_infrastructure || null,
      h.geo_context.distance_to_infrastructure || null, h.geo_context.nearby_road || null,
      h.geo_context.distance_to_road || null, JSON.stringify(h.geo_context.spatial_flags || {})
    ]);

    // 3. Insert temporal_profiles
    await client.query(`
      INSERT INTO temporal_profiles (
        id, cluster_id, first_seen, last_seen, observation_count, frequency_per_week, recurrence_ratio,
        persistence_days, seasonal_pattern, is_persistent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) ON CONFLICT (id) DO UPDATE SET
        last_seen = EXCLUDED.last_seen,
        observation_count = EXCLUDED.observation_count,
        frequency_per_week = EXCLUDED.frequency_per_week,
        recurrence_ratio = EXCLUDED.recurrence_ratio,
        persistence_days = EXCLUDED.persistence_days,
        is_persistent = EXCLUDED.is_persistent
    `, [
      clusterId + "_temp", clusterId, h.temporal_profile.first_seen,
      h.event.timestamp, h.temporal_profile.observation_count, h.temporal_profile.frequency_per_week,
      h.temporal_profile.recurrence_ratio, h.temporal_profile.persistence_days,
      h.temporal_profile.seasonal_pattern || null, h.temporal_profile.is_persistent
    ]);

    // 4. Insert classifications
    await client.query(`
      INSERT INTO classifications (
        id, event_id, predicted_class, confidence, risk_score, risk_value, persistence_score,
        model_version, evidence, feature_vector
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) ON CONFLICT (id) DO NOTHING
    `, [
      h.event.id + "_class", h.event.id, h.classification.predicted_class, h.classification.confidence,
      h.classification.risk_score, h.classification.risk_value, h.classification.persistence_score,
      h.classification.model_version, JSON.stringify(h.classification.evidence), JSON.stringify({
          feature_vector: h.classification.feature_vector || {},
          class_probabilities: h.classification.class_probabilities || {},
          inference_timestamp: h.classification.inference_timestamp || null,
          structured_evidence: h.classification.structured_evidence || null,
          risk_reasons: h.classification.risk_reasons || [],
          explanation: h.classification.explanation || "",
          risk_breakdown: h.classification.risk_breakdown || {}
      })
    ]);

    // 5. Insert alerts
    if (h.alert) {
      await client.query(`
        INSERT INTO alerts (
          id, event_id, title, description, severity, status, facility_name, action_recommended, created_at, acknowledged_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          acknowledged_at = EXCLUDED.acknowledged_at
      `, [
        h.alert.id, h.event.id, h.alert.title, h.alert.description, h.alert.severity, h.alert.status,
        h.alert.facility_name, h.alert.action_recommended, h.alert.created_at, h.alert.acknowledged_at || null
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("ThermoGuard: Error persisting hotspot:", err);
  } finally {
    client.release();
  }
}

export async function loadAllHotspots() {
  if (!pool) return [];
  
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.latitude, t.longitude, t.timestamp, t.brightness, t.frp, t.confidence, t.satellite, t.source, t.cluster_id, t.daynight,
        g.nearest_industrial_facility, g.facility_type, g.distance_to_industry, g.land_cover, g.nearby_infrastructure, g.distance_to_infrastructure, g.nearby_road, g.distance_to_road, g.contextual_attributes,
        tp.first_seen, tp.observation_count, tp.frequency_per_week, tp.recurrence_ratio, tp.persistence_days, tp.seasonal_pattern, tp.is_persistent,
        c.predicted_class, c.confidence AS class_confidence, c.risk_score, c.risk_value, c.persistence_score, c.model_version, c.evidence, c.feature_vector,
        a.id AS alert_id, a.title AS alert_title, a.description AS alert_description, a.severity AS alert_severity, a.status AS alert_status, a.facility_name AS alert_facility_name, a.action_recommended AS alert_action, a.created_at AS alert_created, a.acknowledged_at AS alert_ack
      FROM thermal_events t
      LEFT JOIN geo_context g ON t.id = g.event_id
      LEFT JOIN temporal_profiles tp ON t.cluster_id = tp.cluster_id
      LEFT JOIN classifications c ON t.id = c.event_id
      LEFT JOIN alerts a ON t.id = a.event_id
      ORDER BY t.timestamp DESC
      LIMIT 1000
    `);
    
    return result.rows.map(row => ({
      event: {
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        timestamp: row.timestamp,
        brightness: row.brightness,
        frp: row.frp,
        confidence: row.confidence,
        satellite: row.satellite,
        source: row.source,
        cluster_id: row.cluster_id,
        daynight: row.daynight
      },
      geo_context: {
        nearest_industrial_facility: row.nearest_industrial_facility,
        facility_type: row.facility_type,
        distance_to_industry: row.distance_to_industry,
        land_cover: row.land_cover,
        nearby_infrastructure: row.nearby_infrastructure,
        distance_to_infrastructure: row.distance_to_infrastructure,
        nearby_road: row.nearby_road,
        distance_to_road: row.distance_to_road,
        spatial_flags: row.contextual_attributes || {}
      },
      temporal_profile: {
        cluster_id: row.cluster_id,
        first_seen: row.first_seen,
        observation_count: row.observation_count,
        frequency_per_week: row.frequency_per_week,
        recurrence_ratio: row.recurrence_ratio,
        persistence_days: row.persistence_days,
        seasonal_pattern: row.seasonal_pattern,
        is_persistent: row.is_persistent
      },
      classification: {
        predicted_class: row.predicted_class,
        confidence: row.class_confidence,
        risk_score: row.risk_score,
        risk_value: row.risk_value,
        persistence_score: row.persistence_score,
        model_version: row.model_version,
        evidence: row.evidence || []
      },
      alert: row.alert_id ? {
        id: row.alert_id,
        status: row.alert_status,
        severity: row.alert_severity,
        title: row.alert_title,
        description: row.alert_description,
        facility_name: row.alert_facility_name,
        action_recommended: row.alert_action,
        created_at: row.alert_created,
        acknowledged_at: row.alert_ack
      } : null
    }));
  } catch (err) {
    console.error("ThermoGuard: Error loading hotspots from DB:", err);
    return [];
  }
}
