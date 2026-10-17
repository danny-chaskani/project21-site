// Project21 quote endpoint (Cloudflare Worker).
// POST /quote: validate again, rate-limit, store a copy in D1, email the
// request to the verified destination address (secret QUOTE_TO_EMAIL).
import { validateCustomer, requestId, NOTES_MAX } from '../../assets/js/quote-validate.js';

const ID_RE = /^P21-Q-\d{6}-[A-Z0-9]{4}$/;
const MAX_BODY = 20_000;

function cors(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return allowed.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : null;
}

const json = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function cleanItems(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) return null;
  const items = [];
  for (const i of raw) {
    const qty = Number(i?.qty);
    if (typeof i?.id !== 'string' || typeof i?.sku !== 'string' || typeof i?.name !== 'string') return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return null;
    items.push({
      id: i.id.slice(0, 100), sku: i.sku.slice(0, 100), name: i.name.slice(0, 100), qty,
      gift: i.gift === true, giftMessage: i.gift === true ? String(i.giftMessage ?? '').slice(0, 200) : '',
    });
  }
  return items;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildEmail(q) {
  const { id, sentAt, pageUrl } = q.request;
  const c = q.customer;
  const when = new Date(sentAt || Date.now()).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const giftText = (i) => (i.gift ? `כן${i.giftMessage ? `: ${i.giftMessage}` : ''}` : 'לא');

  const text = [
    `בקשת הצעת מחיר ${id}`, `נשלחה: ${when}`, '',
    `שם: ${c.name}`, `מייל: ${c.email}`, `טלפון: ${c.phone}`, '',
    'פריטים:',
    ...q.items.map((i) => `- ${i.name} | ${i.sku} | כמות ${i.qty} | מתנה: ${giftText(i)}`),
    '', `הערות: ${c.notes || '-'}`, '', `עמוד: ${pageUrl}`,
  ].join('\n');

  const td = 'padding:8px;border-bottom:1px solid #C7CACC;text-align:right;vertical-align:top';
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;padding:24px;background:#EEEFEC;color:#1F2124;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">
<div style="max-width:640px;margin:0 auto;background:#F8F8F6;border:1px solid #C7CACC;padding:24px">
<h1 style="font-size:22px;font-weight:normal;margin:0 0 4px">בקשת הצעת מחיר <span dir="ltr">${esc(id)}</span></h1>
<p style="margin:0 0 20px;color:#3A3D41">${esc(when)}</p>
<h2 style="font-size:16px;margin:0 0 6px">פרטי הלקוח</h2>
<p style="margin:0 0 20px">${esc(c.name)}<br>
<a href="mailto:${esc(c.email)}" style="color:#1F2124" dir="ltr">${esc(c.email)}</a><br>
<a href="tel:${esc(c.phone)}" style="color:#1F2124" dir="ltr">${esc(c.phone)}</a></p>
<h2 style="font-size:16px;margin:0 0 6px">פריטים</h2>
<table style="width:100%;border-collapse:collapse;margin:0 0 20px">
<tr><th style="${td}">שם</th><th style="${td}">מק"ט</th><th style="${td}">כמות</th><th style="${td}">מתנה וברכה</th></tr>
${q.items.map((i) => `<tr><td style="${td}" dir="ltr">${esc(i.name)}</td><td style="${td};font-family:monospace" dir="ltr">${esc(i.sku)}</td><td style="${td}">${i.qty}</td><td style="${td}">${esc(giftText(i))}</td></tr>`).join('')}
</table>
<h2 style="font-size:16px;margin:0 0 6px">הערות</h2>
<p style="margin:0 0 20px;white-space:pre-wrap">${esc(c.notes || '-')}</p>
<p style="margin:0;color:#3A3D41;font-size:13px" dir="ltr">${esc(pageUrl)}</p>
</div></body></html>`;

  return { subject: `בקשת הצעת מחיר ${id} | ${c.name}`, text, html };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request.headers.get('Origin') || '', env);

    if (url.pathname !== '/quote') return new Response('Not found', { status: 404 });
    if (request.method === 'OPTIONS') return new Response(null, { status: headers ? 204 : 403, headers: headers || {} });
    if (request.method !== 'POST') return json({ ok: false }, 405, headers || {});
    if (!headers) return json({ ok: false }, 403);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false }, 413, headers);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ ok: false }, 400, headers); }

    // Honeypot: pretend success, store and send nothing.
    if (String(body.company ?? '').trim() !== '') return json({ ok: true }, 200, headers);

    const check = validateCustomer({ ...body.customer, consent: body.customer?.consent === true });
    const items = cleanItems(body.items);
    if (!check.ok || !items) return json({ ok: false, errors: check.errors }, 422, headers);
    check.value.notes = check.value.notes.slice(0, NOTES_MAX);

    // Rate limit per hashed IP.
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const ipHash = await sha256(`p21:${ip}`);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM quote_requests WHERE ip_hash = ? AND created_at > ?')
      .bind(ipHash, since).first();
    if (n >= Number(env.RATE_LIMIT_PER_HOUR || 5)) return json({ ok: false }, 429, headers);

    let id = ID_RE.test(body.request?.id) ? body.request.id : requestId();
    const sentAt = typeof body.request?.sentAt === 'string' ? body.request.sentAt.slice(0, 40) : null;
    const pageUrl = typeof body.request?.pageUrl === 'string' ? body.request.pageUrl.slice(0, 300) : '';

    // Store first, so a failed email never loses the request.
    const insert = (rid) => env.DB.prepare(
      `INSERT INTO quote_requests (id, created_at, sent_at, name, email, phone, notes, items_json, page_url, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(rid, new Date().toISOString(), sentAt, check.value.name, check.value.email, check.value.phone,
      check.value.notes, JSON.stringify(items), pageUrl, ipHash).run();
    try {
      await insert(id);
    } catch {
      id = requestId();
      await insert(id);
    }

    const q = { customer: check.value, items, request: { id, sentAt, pageUrl } };
    const mail = buildEmail(q);
    try {
      await env.EMAIL.send({
        to: env.QUOTE_TO_EMAIL,
        from: env.QUOTE_FROM,
        replyTo: check.value.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      await env.DB.prepare("UPDATE quote_requests SET email_status = 'sent' WHERE id = ?").bind(id).run();
    } catch (e) {
      await env.DB.prepare("UPDATE quote_requests SET email_status = 'failed', email_error = ? WHERE id = ?")
        .bind(`${e.code || ''} ${e.message || ''}`.slice(0, 300), id).run();
      console.log('email failed', id, e.code, e.message);
    }

    // The request is stored either way; the customer gets the confirmation.
    return json({ ok: true, id }, 200, headers);
  },
};
