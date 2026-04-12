const REALM = 'Owners Club Admin';

export function getAdminPassword(): string | null {
  return (
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    null
  );
}

export function checkBasicAuth(request: Request): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;

  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return false;
  }

  const idx = decoded.indexOf(':');
  if (idx === -1) return false;
  const password = decoded.slice(idx + 1);

  return timingSafeEqual(password, expected);
}

export function unauthorizedResponse(): Response {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'content-type': 'text/plain',
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
