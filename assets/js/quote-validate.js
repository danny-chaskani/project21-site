// Quote request validation. No DOM access here, so the server endpoint can
// import and run the same checks again before sending.

export const NOTES_MAX = 500;

export const MESSAGES = {
  name: 'צריך שם ושם משפחה.',
  email: 'כתובת המייל לא נראית תקינה.',
  phone: 'מספר הטלפון לא נראה תקין. אפשר לכתוב 050-1234567.',
  consent: 'צריך לאשר יצירת קשר כדי שנוכל לחזור אליך.',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validName(v) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.length >= 2 && s.includes(' ');
}

export function validEmail(v) {
  const s = String(v ?? '').trim();
  return s.length <= 254 && EMAIL_RE.test(s);
}

/** Israeli mobile (05X-XXXXXXX, with or without dashes/spaces) or an
    international number starting with +. Returns E.164, or null if invalid. */
export function normalizePhone(v) {
  const raw = String(v ?? '').trim();
  const compact = raw.replace(/[\s\-().]/g, '');
  if (/^05\d{8}$/.test(compact)) return `+972${compact.slice(1)}`;
  if (/^\+9725\d{8}$/.test(compact)) return compact;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

/** Returns {ok, errors: {field: message}, value} where value is the cleaned customer object. */
export function validateCustomer(input) {
  const errors = {};
  if (!validName(input.name)) errors.name = MESSAGES.name;
  if (!validEmail(input.email)) errors.email = MESSAGES.email;
  const phone = normalizePhone(input.phone);
  if (!phone) errors.phone = MESSAGES.phone;
  if (input.consent !== true) errors.consent = MESSAGES.consent;
  const value = {
    name: String(input.name ?? '').trim().replace(/\s+/g, ' '),
    email: String(input.email ?? '').trim(),
    phone,
    notes: String(input.notes ?? '').trim().slice(0, NOTES_MAX),
  };
  return { ok: Object.keys(errors).length === 0, errors, value };
}

/** P21-Q-YYMMDD-XXXX, XXXX = 4 random characters (no look-alikes). */
export function requestId(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const ymd = `${p(date.getFullYear() % 100)}${p(date.getMonth() + 1)}${p(date.getDate())}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const rand = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `P21-Q-${ymd}-${rand}`;
}
