import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET || process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';

  if (!secret) {
    return json({ error: 'CRON_SECRET not configured' }, 500);
  }
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const hookUrl =
    import.meta.env.DEPLOY_HOOK_URL || process.env.DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return json({ error: 'DEPLOY_HOOK_URL not configured' }, 500);
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return json(
        { error: 'Deploy hook failed', status: res.status, body: text },
        502
      );
    }
    return json({ ok: true, triggered_at: new Date().toISOString() });
  } catch (err) {
    console.error('rebuild cron failed', err);
    return json({ error: 'Rebuild trigger failed' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
