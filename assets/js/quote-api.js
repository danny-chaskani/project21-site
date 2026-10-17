// The single connection point for sending a quote request.
// Live site: POST to the Worker at api.project21.net, which emails the
// request and stores a copy. The destination address lives only there.
// Local preview: logs the payload and reports success; nothing is sent.

import { isLocalPreview } from './products.js';

const ENDPOINT = 'https://api.project21.net/quote';

/** @returns {Promise<{ok: boolean, id?: string}>} */
export async function submitQuote(payload) {
  if (isLocalPreview) {
    // Local-only test hook to exercise the failure path.
    if (window.__p21FailNextQuote) {
      window.__p21FailNextQuote = false;
      return { ok: false };
    }
    console.info('[submitQuote] local preview, nothing was sent', payload);
    return { ok: true };
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false };
  const data = await res.json().catch(() => ({}));
  return { ok: data.ok === true, id: typeof data.id === 'string' ? data.id : undefined };
}
