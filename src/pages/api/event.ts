import type { APIRoute } from 'astro';
import { getSql, ensureEventsTable } from '../../lib/db';

export const prerender = false;

const ALLOWED_EVENTS = new Set([
  'page_view',
  'join_view',
  'signup_started',
  'signup_intent',
  'signup_stage',
  'signup_completed',
  'signup_error',
]);

export const POST: APIRoute = async ({ request }) => {
  let name = '';
  let properties: Record<string, unknown> | null = null;
  let sessionId: string | null = null;

  try {
    const body = await request.json();
    name = String(body.name ?? '').trim();
    if (body.properties && typeof body.properties === 'object') {
      properties = body.properties as Record<string, unknown>;
    }
    if (body.session_id) sessionId = String(body.session_id).slice(0, 64);
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!ALLOWED_EVENTS.has(name)) {
    return json({ error: 'Invalid event name.' }, 400);
  }

  const propsJson = properties ? JSON.stringify(properties) : null;
  if (propsJson && propsJson.length > 2048) {
    return json({ error: 'Properties too large.' }, 400);
  }

  const sql = getSql();
  if (!sql) return json({ error: 'Server misconfigured.' }, 500);

  try {
    await ensureEventsTable(sql);
    await sql`
      INSERT INTO events (name, properties, session_id)
      VALUES (${name}, ${propsJson}::jsonb, ${sessionId})
    `;
    return json({ ok: true });
  } catch (err) {
    console.error('event insert failed', err);
    return json({ error: 'Something went wrong.' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
