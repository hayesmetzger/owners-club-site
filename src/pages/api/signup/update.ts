import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

const VALID_INTENT = new Set(['buy', 'sell', 'both']);
const VALID_STAGE = new Set(['learning', 'discovering', 'executing']);

export const POST: APIRoute = async ({ request }) => {
  let token = '';
  let intent: string | undefined;
  let stage: string | undefined;
  let complete = false;

  try {
    const body = await request.json();
    token = String(body.token ?? '').trim();
    if (body.intent != null) intent = String(body.intent);
    if (body.stage != null) stage = String(body.stage);
    complete = Boolean(body.complete);
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!token || token.length > 100) {
    return json({ error: 'Missing session token.' }, 400);
  }
  if (intent !== undefined && !VALID_INTENT.has(intent)) {
    return json({ error: 'Invalid intent.' }, 400);
  }
  if (stage !== undefined && !VALID_STAGE.has(stage)) {
    return json({ error: 'Invalid stage.' }, 400);
  }
  if (intent === undefined && stage === undefined && !complete) {
    return json({ error: 'Nothing to update.' }, 400);
  }

  const connectionString =
    import.meta.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return json({ error: 'Server misconfigured.' }, 500);
  }
  const sql = neon(connectionString);

  try {
    const rows = await sql`
      UPDATE signups
      SET intent       = COALESCE(${intent ?? null}, intent),
          stage        = COALESCE(${stage ?? null}, stage),
          completed_at = CASE WHEN ${complete}::boolean THEN NOW() ELSE completed_at END
      WHERE token = ${token}
      RETURNING id
    ` as Array<{ id: number }>;
    if (rows.length === 0) {
      return json({ error: 'Signup not found.' }, 404);
    }
    return json({ ok: true });
  } catch (err) {
    console.error('signup update failed', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
