import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import {
  RawObservation,
  ClusterCentroid,
  TemporalProfileResult,
  haversineDistanceKm,
  parseUtcDate
} from './temporal_engine';

let pool: Pool | null = null;

// Local persistent cache file paths
const dataDir = path.join(process.cwd(), 'data');
const rawEventsFile = path.join(dataDir, 'persisted_thermal_events.json');
const tempProfilesFile = path.join(dataDir, 'persisted_temporal_profiles.json');
const verificationsFile = path.join(dataDir, 'persisted_verifications.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {
    // ignore
  }
}

// In-memory mirror for fast lookup and fallback
let localThermalEvents: RawObservation[] = [];
let localTemporalProfiles: Record<string, TemporalProfileResult> = {};
let localVerifications: Record<string, any> = {};

function loadLocalStores() {
  ensureDataDir();
  try {
    if (fs.existsSync(rawEventsFile)) {
      const raw = fs.readFileSync(rawEventsFile, 'utf8');
      localThermalEvents = JSON.parse(raw);
    }
  } catch (e) {
    localThermalEvents = [];
  }
  try {
    if (fs.existsSync(tempProfilesFile)) {
      const raw = fs.readFileSync(tempProfilesFile, 'utf8');
      localTemporalProfiles = JSON.parse(raw);
    }
  } catch (e) {
    localTemporalProfiles = {};
  }
  try {
    if (fs.existsSync(verificationsFile)) {
      const raw = fs.readFileSync(verificationsFile, 'utf8');
      localVerifications = JSON.parse(raw);
    }
  } catch (e) {
    localVerifications = {};
  }
}

function saveLocalThermalEvents() {
  ensureDataDir();
  try {
    fs.writeFileSync(rawEventsFile, JSON.stringify(localThermalEvents, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

function saveLocalTemporalProfiles() {
  ensureDataDir();
  try {
    fs.writeFileSync(tempProfilesFile, JSON.stringify(localTemporalProfiles, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

function saveLocalVerifications() {
  ensureDataDir();
  try {
    fs.writeFileSync(verificationsFile, JSON.stringify(localVerifications, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

// Initialize on module load
loadLocalStores();

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.log("ThermoGuard: No DATABASE_URL provided. Running in persistent file/memory mode.");
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

/**
 * Persists a raw thermal observation to thermal_events in PostgreSQL and local persistent cache.
 */
export async function persistRawObservation(raw: RawObservation): Promise<void> {
  const existingIdx = localThermalEvents.findIndex((e) => e.id === raw.id);
  if (existingIdx >= 0) {
    localThermalEvents[existingIdx] = { ...localThermalEvents[existingIdx], ...raw };
  } else {
    localThermalEvents.push(raw);
  }
  saveLocalThermalEvents();

  if (!pool) return;

  try {
    await pool.query(
      `
      INSERT INTO thermal_events (
        id, latitude, longitude, timestamp, brightness, frp, confidence, satellite, source, cluster_id, daynight, geom
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_SetSRID(ST_MakePoint($3, $2), 4326)
      ) ON CONFLICT (id) DO UPDATE SET
        brightness = EXCLUDED.brightness,
        frp = EXCLUDED.frp,
        confidence = EXCLUDED.confidence,
        cluster_id = EXCLUDED.cluster_id,
        satellite = EXCLUDED.satellite
      `,
      [
        raw.id,
        raw.latitude,
        raw.longitude,
        raw.timestamp,
        raw.brightness,
        raw.frp,
        raw.confidence,
        raw.satellite || 'VIIRS_NRT',
        raw.source || 'NASA_FIRMS_LIVE',
        raw.cluster_id || null,
        raw.daynight || 'D'
      ]
    );
  } catch (err: any) {
    console.error(`ThermoGuard: Error persisting raw observation ${raw.id} to DB:`, err.message);
  }
}

/**
 * Retrieves all spatial cluster centroids and their observation ranges from PostgreSQL or local store.
 */
export async function getExistingClusterCentroids(): Promise<ClusterCentroid[]> {
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT 
          cluster_id,
          AVG(latitude) as centroid_lat,
          AVG(longitude) as centroid_lon,
          MAX(timestamp) as latest_timestamp,
          MIN(timestamp) as earliest_timestamp,
          COUNT(*) as observation_count
        FROM thermal_events
        WHERE cluster_id IS NOT NULL AND cluster_id != ''
        GROUP BY cluster_id
      `);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map((r) => ({
          cluster_id: r.cluster_id,
          centroid_lat: parseFloat(r.centroid_lat),
          centroid_lon: parseFloat(r.centroid_lon),
          latest_timestamp: new Date(r.latest_timestamp).toISOString(),
          earliest_timestamp: new Date(r.earliest_timestamp).toISOString(),
          observation_count: parseInt(r.observation_count, 10)
        }));
      }
    } catch (err: any) {
      console.warn("ThermoGuard: DB getExistingClusterCentroids error, falling back to local store:", err.message);
    }
  }

  // Fallback / Standalone local store calculation
  const clusterMap: Record<string, { lats: number[]; lons: number[]; times: Date[]; count: number }> = {};
  for (const ev of localThermalEvents) {
    if (!ev.cluster_id) continue;
    if (!clusterMap[ev.cluster_id]) {
      clusterMap[ev.cluster_id] = { lats: [], lons: [], times: [], count: 0 };
    }
    clusterMap[ev.cluster_id].lats.push(ev.latitude);
    clusterMap[ev.cluster_id].lons.push(ev.longitude);
    clusterMap[ev.cluster_id].times.push(parseUtcDate(ev.timestamp));
    clusterMap[ev.cluster_id].count++;
  }

  return Object.entries(clusterMap).map(([cid, data]) => {
    data.times.sort((a, b) => a.getTime() - b.getTime());
    return {
      cluster_id: cid,
      centroid_lat: data.lats.reduce((a, b) => a + b, 0) / data.lats.length,
      centroid_lon: data.lons.reduce((a, b) => a + b, 0) / data.lats.length,
      earliest_timestamp: data.times[0].toISOString(),
      latest_timestamp: data.times[data.times.length - 1].toISOString(),
      observation_count: data.count
    };
  });
}

/**
 * Queries real historical observations belonging to a specific spatial cluster from DB.
 */
export async function queryHistoricalObservationsForCluster(
  clusterId: string,
  windowHours: number = 720.0,
  referenceTimeStr?: string
): Promise<RawObservation[]> {
  const refDate = referenceTimeStr ? parseUtcDate(referenceTimeStr) : new Date();
  const windowMs = windowHours * 3600 * 1000;
  const minTime = new Date(refDate.getTime() - windowMs);
  const maxTime = new Date(refDate.getTime() + windowMs);

  if (pool) {
    try {
      const res = await pool.query(
        `
        SELECT 
          id, latitude, longitude, timestamp, brightness, frp, confidence, satellite, source, cluster_id, daynight
        FROM thermal_events
        WHERE cluster_id = $1 AND timestamp >= $2 AND timestamp <= $3
        ORDER BY timestamp ASC
        `,
        [clusterId, minTime.toISOString(), maxTime.toISOString()]
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows.map((r) => ({
          id: r.id,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          timestamp: new Date(r.timestamp).toISOString(),
          brightness: parseFloat(r.brightness),
          frp: parseFloat(r.frp),
          confidence: parseFloat(r.confidence),
          satellite: r.satellite,
          source: r.source,
          cluster_id: r.cluster_id,
          daynight: r.daynight
        }));
      }
    } catch (err: any) {
      console.warn(`ThermoGuard: DB queryHistoricalObservationsForCluster(${clusterId}) error:`, err.message);
    }
  }

  // Local fallback: filter local thermal events
  return localThermalEvents
    .filter((ev) => {
      if (ev.cluster_id !== clusterId) return false;
      const t = parseUtcDate(ev.timestamp).getTime();
      return t >= minTime.getTime() && t <= maxTime.getTime();
    })
    .sort((a, b) => parseUtcDate(a.timestamp).getTime() - parseUtcDate(b.timestamp).getTime());
}

/**
 * Persists or updates a calculated TemporalProfile into PostgreSQL and local store.
 */
export async function persistTemporalProfileRecord(profile: TemporalProfileResult): Promise<void> {
  localTemporalProfiles[profile.cluster_id] = profile;
  saveLocalTemporalProfiles();

  if (!pool) return;

  try {
    const profileId = `${profile.cluster_id}_temp`;
    await pool.query(
      `
      INSERT INTO temporal_profiles (
        id, cluster_id, first_seen, last_seen, observation_count, frequency_per_week, recurrence_ratio,
        persistence_days, seasonal_pattern, is_persistent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) ON CONFLICT (id) DO UPDATE SET
        first_seen = EXCLUDED.first_seen,
        last_seen = EXCLUDED.last_seen,
        observation_count = EXCLUDED.observation_count,
        frequency_per_week = EXCLUDED.frequency_per_week,
        recurrence_ratio = EXCLUDED.recurrence_ratio,
        persistence_days = EXCLUDED.persistence_days,
        seasonal_pattern = EXCLUDED.seasonal_pattern,
        is_persistent = EXCLUDED.is_persistent,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        profileId,
        profile.cluster_id,
        profile.first_seen,
        profile.last_seen,
        profile.observation_count,
        profile.frequency_per_week,
        profile.recurrence_ratio,
        profile.persistence_days,
        profile.seasonal_pattern,
        profile.is_persistent
      ]
    );
  } catch (err: any) {
    console.error(`ThermoGuard: Error persisting temporal profile for ${profile.cluster_id}:`, err.message);
  }
}

/**
 * Retrieves a persisted temporal profile by cluster_id if already calculated.
 */
export async function getTemporalProfileForCluster(clusterId: string): Promise<TemporalProfileResult | null> {
  if (localTemporalProfiles[clusterId]) {
    return localTemporalProfiles[clusterId];
  }

  if (pool) {
    try {
      const res = await pool.query(
        `
        SELECT 
          cluster_id, first_seen, last_seen, observation_count, frequency_per_week, recurrence_ratio,
          persistence_days, seasonal_pattern, is_persistent
        FROM temporal_profiles
        WHERE cluster_id = $1
        LIMIT 1
        `,
        [clusterId]
      );
      if (res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        const isP = Boolean(r.is_persistent);
        return {
          cluster_id: r.cluster_id,
          status: "SUCCESS",
          behaviour: isP ? "Persistent" : r.observation_count > 1 ? "Transient" : "Insufficient Data",
          first_seen: new Date(r.first_seen).toISOString(),
          last_seen: new Date(r.last_seen).toISOString(),
          first_observed_at: new Date(r.first_seen).toISOString(),
          last_observed_at: new Date(r.last_seen).toISOString(),
          observation_count: parseInt(r.observation_count, 10),
          active_days: Math.max(1, parseInt(r.persistence_days, 10)),
          inactive_days: 0,
          active_day_ratio: 1.0,
          active_duration_days: parseFloat(r.persistence_days),
          active_duration_hours: parseFloat(r.persistence_days) * 24.0,
          persistence_days: parseInt(r.persistence_days, 10),
          persistence_score: isP ? 0.85 : 0.15,
          persistence_class: isP ? "PERSISTENT" : "TRANSIENT",
          is_persistent: isP,
          frequency_per_week: parseFloat(r.frequency_per_week),
          observations_per_day: parseFloat(r.frequency_per_week) / 7.0,
          recurrence_count: Math.round(parseFloat(r.persistence_days) * parseFloat(r.recurrence_ratio)),
          recurrence_ratio: parseFloat(r.recurrence_ratio),
          distinct_active_periods: 1,
          average_revisit_hours: null,
          median_revisit_hours: null,
          min_revisit_hours: null,
          max_revisit_hours: null,
          seasonality_score: 0.0,
          seasonal_concentration: 0.0,
          seasonal_pattern: r.seasonal_pattern || "INSUFFICIENT_DATA",
          seasonality_flag: false,
          peak_month: null,
          active_months: [],
          monthly_distribution: {},
          temporal_confidence: 0.5,
          ml_features: {
            observation_count: parseInt(r.observation_count, 10),
            active_days: Math.max(1, parseInt(r.persistence_days, 10)),
            active_duration: parseFloat(r.persistence_days),
            observation_frequency: parseFloat(r.frequency_per_week),
            recurrence_count: Math.round(parseFloat(r.persistence_days) * parseFloat(r.recurrence_ratio)),
            recurrence_ratio: parseFloat(r.recurrence_ratio),
            average_revisit_interval: 24.0,
            median_revisit_interval: 24.0,
            persistence_score: isP ? 0.85 : 0.15,
            seasonality_score: 0.0,
            seasonal_concentration: 0.0
          }
        };
      }
    } catch (err: any) {
      console.warn(`ThermoGuard: DB getTemporalProfileForCluster(${clusterId}) error:`, err.message);
    }
  }

  return null;
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

    // 4. Insert classifications with verification metadata if present
    const existingVerif = localVerifications[h.event.id] || {};
    const verifStatus = h.classification.verification_status || existingVerif.verification_status || 'UNVERIFIED';
    const verifClass = h.classification.verified_class || existingVerif.verified_class || null;
    const verifBy = h.classification.verified_by || existingVerif.verified_by || null;
    const verifAt = h.classification.verified_at || existingVerif.verified_at || null;
    const verifReason = h.classification.verification_reason || existingVerif.verification_reason || null;
    const verifAudit = h.classification.verification_audit_trail || existingVerif.audit_trail || [];

    await client.query(`
      INSERT INTO classifications (
        id, event_id, predicted_class, confidence, risk_score, risk_value, persistence_score,
        model_version, evidence, feature_vector,
        verified_class, verification_status, verified_by, verified_at, verification_reason, verification_audit
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      ) ON CONFLICT (id) DO UPDATE SET
        predicted_class = EXCLUDED.predicted_class,
        confidence = EXCLUDED.confidence,
        risk_score = EXCLUDED.risk_score,
        risk_value = EXCLUDED.risk_value,
        persistence_score = EXCLUDED.persistence_score,
        model_version = EXCLUDED.model_version,
        evidence = EXCLUDED.evidence,
        feature_vector = EXCLUDED.feature_vector,
        verified_class = COALESCE(EXCLUDED.verified_class, classifications.verified_class),
        verification_status = COALESCE(EXCLUDED.verification_status, classifications.verification_status),
        verified_by = COALESCE(EXCLUDED.verified_by, classifications.verified_by),
        verified_at = COALESCE(EXCLUDED.verified_at, classifications.verified_at),
        verification_reason = COALESCE(EXCLUDED.verification_reason, classifications.verification_reason),
        verification_audit = COALESCE(EXCLUDED.verification_audit, classifications.verification_audit)
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
      }),
      verifClass, verifStatus, verifBy, verifAt, verifReason, JSON.stringify(verifAudit)
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
        c.verified_class, c.verification_status, c.verified_by, c.verified_at, c.verification_reason, c.verification_audit,
        a.id AS alert_id, a.title AS alert_title, a.description AS alert_description, a.severity AS alert_severity, a.status AS alert_status, a.facility_name AS alert_facility_name, a.action_recommended AS alert_action, a.created_at AS alert_created, a.acknowledged_at AS alert_ack
      FROM thermal_events t
      LEFT JOIN geo_context g ON t.id = g.event_id
      LEFT JOIN temporal_profiles tp ON t.cluster_id = tp.cluster_id
      LEFT JOIN classifications c ON t.id = c.event_id
      LEFT JOIN alerts a ON t.id = a.event_id
      ORDER BY t.timestamp DESC
      LIMIT 1000
    `);
    
    return result.rows.map(row => {
      const fvData = typeof row.feature_vector === "string" 
        ? JSON.parse(row.feature_vector) 
        : (row.feature_vector || {});

      const localVerif = localVerifications[row.id] || null;

      return {
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
          evidence: row.evidence || [],
          class_probabilities: fvData.class_probabilities || {},
          feature_vector: fvData.feature_vector || {},
          inference_timestamp: fvData.inference_timestamp || null,
          structured_evidence: fvData.structured_evidence || null,
          risk_reasons: fvData.risk_reasons || [],
          explanation: fvData.explanation || "",
          risk_breakdown: fvData.risk_breakdown || {},
          // Priority 6: Human Verification
          verification_status: row.verification_status || localVerif?.verification_status || "UNVERIFIED",
          verified_class: row.verified_class || localVerif?.verified_class || null,
          verified_by: row.verified_by || localVerif?.verified_by || null,
          verified_at: row.verified_at || localVerif?.verified_at || null,
          verification_reason: row.verification_reason || localVerif?.verification_reason || null,
          verification_audit_trail: row.verification_audit || localVerif?.audit_trail || []
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
      };
    });
  } catch (err) {
    console.error("ThermoGuard: Error loading hotspots from DB:", err);
    return [];
  }
}

export async function saveVerificationRecord(eventId: string, verificationData: {
  verification_status: string;
  verified_class?: string | null;
  verified_by?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  verification_reason?: string | null;
  audit_trail?: any[];
}) {
  localVerifications[eventId] = {
    ...(localVerifications[eventId] || {}),
    ...verificationData
  };
  saveLocalVerifications();

  if (pool) {
    try {
      await pool.query(`
        UPDATE classifications
        SET 
          verified_class = $1,
          verification_status = $2,
          verified_by = $3,
          verified_at = $4,
          verification_reason = $5,
          verification_audit = $6
        WHERE event_id = $7
      `, [
        verificationData.verified_class || null,
        verificationData.verification_status || 'UNVERIFIED',
        verificationData.verified_by || null,
        verificationData.verified_at || new Date().toISOString(),
        verificationData.verification_reason || null,
        JSON.stringify(verificationData.audit_trail || []),
        eventId
      ]);
    } catch (err) {
      console.warn(`ThermoGuard: DB update for verification of ${eventId} failed:`, err);
    }
  }
}

export function getVerificationRecord(eventId: string) {
  return localVerifications[eventId] || null;
}

export function getAllVerificationRecords(): Record<string, any> {
  return { ...localVerifications };
}
