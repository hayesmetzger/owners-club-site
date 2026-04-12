import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'node:crypto';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  let name = '';
  let email = '';

  try {
    const body = await request.json();
    name = String(body.name ?? '').trim();
    email = String(body.email ?? '').trim().toLowerCase();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!name || name.length > 200) {
    return json({ error: 'Please enter your name.' }, 400);
  }
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return json({ error: 'Please enter a valid email.' }, 400);
  }

  const sql = getSql();
  if (!sql) return json({ error: 'Server misconfigured.' }, 500);

  const token = randomBytes(24).toString('base64url');

  try {
    const rows = await sql`
      INSERT INTO signups (name, email, token)
      VALUES (${name}, ${email}, ${token})
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            token = COALESCE(signups.token, EXCLUDED.token)
      RETURNING token
    ` as Array<{ token: string }>;
    return json({ ok: true, token: rows[0].token });
  } catch (err) {
    console.error('signup insert failed', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

function getSql() {
  const connectionString =
    import.meta.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return null;
  }
  return neon(connectionString);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
