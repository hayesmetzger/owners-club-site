const SESSION_KEY = 'oc_sid';
const ENDPOINT = '/api/event';

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
): void {
  let payload: string;
  try {
    payload = JSON.stringify({
      name,
      properties,
      session_id: getSessionId(),
    });
  } catch {
    return;
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}
