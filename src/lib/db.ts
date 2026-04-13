import { neon } from '@neondatabase/serverless';

export function getSql() {
  const connectionString =
    import.meta.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return null;
  }
  return neon(connectionString);
}

let eventsEnsured = false;

export async function ensureEventsTable(sql: ReturnType<typeof neon>) {
  if (eventsEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      properties JSONB,
      session_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS events_name_created_at ON events (name, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS events_session_id ON events (session_id)`;
  eventsEnsured = true;
}
