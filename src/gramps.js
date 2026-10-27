// Zugriff auf die Gramps-Web-REST-API: lädt Personen, Familien und Ereignisse.

const EVENT_TYPES = { 1: 'Marriage', 7: 'Divorce', 12: 'Birth', 13: 'Death', 15: 'Baptism', 19: 'Burial', 22: 'Christening' };
const FAMILY_REL = { 0: 'Married', 1: 'Unmarried', 2: 'Civil Union', 3: 'Unknown' };

export function typeName(t, table = EVENT_TYPES) {
  if (t == null) return '';
  if (typeof t === 'string') return t;
  if (typeof t === 'number') return table[t] || '';
  return t.string || table[t.value] || '';
}
export const familyRelName = (t) => typeName(t, FAMILY_REL);

async function api(base, path, { token, method = 'GET', body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Gramps Web ${method} ${path}: HTTP ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
  return res.json();
}

async function getAll(base, token, path) {
  const pageSize = 500;
  const out = [];
  for (let page = 1; ; page++) {
    const rows = await api(base, `/api/${path}/?page=${page}&pagesize=${pageSize}`, { token });
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** Lädt den ganzen Stammbaum (für private Stammbäume völlig ausreichend). */
export async function loadTree(cfg) {
  const base = cfg.url.replace(/\/+$/, '');
  const password = cfg.password || process.env.GRAMPS_PASSWORD;
  if (!cfg.username || !password) throw new Error('username/password fehlen (config.json oder Umgebungsvariable GRAMPS_PASSWORD).');
  const { access_token: token } = await api(base, '/api/token/', { method: 'POST', body: { username: cfg.username, password } });
  delete process.env.GRAMPS_PASSWORD;
  const [people, families, events] = await Promise.all([
    getAll(base, token, 'people'),
    getAll(base, token, 'families'),
    getAll(base, token, 'events'),
  ]);
  const byHandle = (arr) => new Map(arr.map((o) => [o.handle, o]));
  return { people: byHandle(people), families: byHandle(families), events: byHandle(events) };
}
