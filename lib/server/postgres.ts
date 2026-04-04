import { Pool, type PoolClient } from "pg";
import type { SimulationStats } from "@/simulation/types";

export interface PersistedRuntimeState {
  running: boolean;
  desiredRunning: boolean;
  autoGenerateIncidents: boolean;
  state: {
    drones: unknown[];
    incidents: unknown[];
    alerts: unknown[];
    stats: SimulationStats;
  };
  meta: {
    tickCount: number;
    responseTimes: number[];
  };
  updatedAt: number;
}

export interface DetectorEventRecord {
  sourceType: string;
  sourceId: string;
  payload: unknown;
  status: "accepted" | "ignored" | "rejected";
  incidentId?: string;
  reason?: string;
}

const LOCK_ID = 716_240_119;

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getPoolFromGlobal() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!global.__netraPgPool) {
    const useSsl = parseBoolean(process.env.DATABASE_SSL, false);
    global.__netraPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }

  return global.__netraPgPool;
}

export async function initPersistenceSchema() {
  const pool = getPoolFromGlobal();
  if (!pool) return false;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS netra_runtime_state (
      id SMALLINT PRIMARY KEY,
      state_json JSONB NOT NULL,
      meta_json JSONB NOT NULL,
      running BOOLEAN NOT NULL,
      desired_running BOOLEAN NOT NULL,
      auto_generate_incidents BOOLEAN NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS netra_detector_events (
      id BIGSERIAL PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      status TEXT NOT NULL,
      incident_id TEXT,
      reason TEXT,
      payload_json JSONB NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  return true;
}

export async function loadPersistedRuntimeState(): Promise<PersistedRuntimeState | null> {
  const pool = getPoolFromGlobal();
  if (!pool) return null;

  const result = await pool.query(
    `SELECT state_json, meta_json, running, desired_running, auto_generate_incidents, updated_at FROM netra_runtime_state WHERE id = 1`
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0] as {
    state_json: PersistedRuntimeState["state"];
    meta_json: PersistedRuntimeState["meta"];
    running: boolean;
    desired_running: boolean;
    auto_generate_incidents: boolean;
    updated_at: number;
  };

  return {
    running: row.running,
    desiredRunning: row.desired_running,
    autoGenerateIncidents: row.auto_generate_incidents,
    state: row.state_json,
    meta: row.meta_json,
    updatedAt: Number(row.updated_at),
  };
}

export async function savePersistedRuntimeState(data: PersistedRuntimeState) {
  const pool = getPoolFromGlobal();
  if (!pool) return;

  await pool.query(
    `
      INSERT INTO netra_runtime_state (
        id, state_json, meta_json, running, desired_running, auto_generate_incidents, updated_at
      )
      VALUES (1, $1::jsonb, $2::jsonb, $3, $4, $5, $6)
      ON CONFLICT (id)
      DO UPDATE SET
        state_json = EXCLUDED.state_json,
        meta_json = EXCLUDED.meta_json,
        running = EXCLUDED.running,
        desired_running = EXCLUDED.desired_running,
        auto_generate_incidents = EXCLUDED.auto_generate_incidents,
        updated_at = EXCLUDED.updated_at
    `,
    [
      JSON.stringify(data.state),
      JSON.stringify(data.meta),
      data.running,
      data.desiredRunning,
      data.autoGenerateIncidents,
      data.updatedAt,
    ]
  );
}

export async function setDesiredRunning(desiredRunning: boolean) {
  const pool = getPoolFromGlobal();
  if (!pool) return;

  const emptyState = {
    drones: [],
    incidents: [],
    alerts: [],
    stats: {
      totalIncidents: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      avgResponseTime: 0,
      dronesActive: 0,
      dronesIdle: 0,
      responseTimes: [],
    },
  };
  const emptyMeta = { tickCount: 0, responseTimes: [] };

  await pool.query(
    `
      INSERT INTO netra_runtime_state (
        id, state_json, meta_json, running, desired_running, auto_generate_incidents, updated_at
      )
      VALUES (1, $1::jsonb, $2::jsonb, false, $3, false, $4)
      ON CONFLICT (id)
      DO UPDATE SET desired_running = EXCLUDED.desired_running, updated_at = EXCLUDED.updated_at
    `,
    [JSON.stringify(emptyState), JSON.stringify(emptyMeta), desiredRunning, Date.now()]
  );
}

export async function acquireLeadershipLock(): Promise<PoolClient | null> {
  const pool = getPoolFromGlobal();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    const result = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock($1) AS acquired`,
      [LOCK_ID]
    );

    if (!result.rows[0]?.acquired) {
      client.release();
      return null;
    }

    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function releaseLeadershipLock(client: PoolClient | null) {
  if (!client) return;

  try {
    await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_ID]);
  } finally {
    client.release();
  }
}

export async function recordDetectorEvent(event: DetectorEventRecord) {
  const pool = getPoolFromGlobal();
  if (!pool) return;

  await pool.query(
    `
      INSERT INTO netra_detector_events (
        source_type, source_id, status, incident_id, reason, payload_json, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
    `,
    [
      event.sourceType,
      event.sourceId,
      event.status,
      event.incidentId ?? null,
      event.reason ?? null,
      JSON.stringify(event.payload),
      Date.now(),
    ]
  );
}

export function isPersistenceEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

declare global {
  // eslint-disable-next-line no-var
  var __netraPgPool: Pool | undefined;
}
