import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { checkBasicAuth, unauthorizedResponse } from '../../lib/admin-auth';

export const prerender = false;

type Row = {
  id: number;
  name: string;
  email: string;
  intent: string | null;
  stage: string | null;
  created_at: string;
  completed_at: string | null;
};

export const GET: APIRoute = async ({ request }) => {
  if (!checkBasicAuth(request)) return unauthorizedResponse();

  const connectionString =
    import.meta.env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return new Response('Server misconfigured', { status: 500 });
  }
  const sql = neon(connectionString);

  const rows = (await sql`
    SELECT id, name, email, intent, stage, created_at, completed_at
    FROM signups
    ORDER BY created_at DESC
  `) as Row[];

  const header = ['id', 'name', 'email', 'intent', 'stage', 'created_at', 'completed_at'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        csvEscape(r.name),
        csvEscape(r.email),
        csvEscape(r.intent ?? ''),
        csvEscape(r.stage ?? ''),
        toIso(r.created_at),
        r.completed_at ? toIso(r.completed_at) : '',
      ].join(','),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="signups-${today}.csv"`,
    },
  });
};

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
