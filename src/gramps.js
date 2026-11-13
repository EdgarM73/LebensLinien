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
  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),   // ein hängender Server soll nicht endlos blockieren
    });
    // Gramps Web begrenzt z. B. Anmeldungen auf eine pro Sekunde (HTTP 429): kurz warten und erneut versuchen
    if (res.status !== 429 || attempt >= 3) break;
    await res.arrayBuffer().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  if (!res.ok) throw new Error(`Gramps Web ${method} ${path}: HTTP ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
  return res.json();
}

async function getAll(base, token, path, keys = '') {
  const pageSize = 500;
  const out = [];
  for (let page = 1; ; page++) {
    const rows = await api(base, `/api/${path}/?page=${page}&pagesize=${pageSize}${keys ? `&keys=${keys}` : ''}`, { token });
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** Meldet sich an und liefert das Zugriffstoken. */
export async function grampsLogin(url, username, password) {
  const base = url.replace(/\/+$/, '');
  const { access_token: token } = await api(base, '/api/token/', { method: 'POST', body: { username, password } });
  return token;
}

/** Kompakte Personenliste für die Suche: Gramps-ID, Name, Geburts- und Sterbejahr. */
export async function listPeople(url, token) {
  const base = url.replace(/\/+$/, '');
  // Rohdaten statt fertiger Profile (profile=self): die Profile berechnet Gramps Web je Person und braucht dafür
  // auch bei kleinen Stammbäumen zeitweise über 30 Sekunden, die Rohdaten kommen in Millisekunden.
  const [people, events] = await Promise.all([
    getAll(base, token, 'people', 'gramps_id,primary_name,birth_ref_index,death_ref_index,event_ref_list'),
    getAll(base, token, 'events', 'handle,date'),
  ]);
  const yearOf = new Map(events.map((event) => [event.handle, event.date?.dateval?.[2] || event.date?.year || null]));
  const year = (person, index) => (index >= 0 && yearOf.get(person.event_ref_list?.[index]?.ref)) || null;
  return people.map((person) => ({
    id: person.gramps_id || '',
    name: [person.primary_name?.first_name, person.primary_name?.surname_list?.[0]?.surname].filter(Boolean).join(' ').trim(),
    birth: year(person, person.birth_ref_index ?? -1),
    death: year(person, person.death_ref_index ?? -1),
  }));
}

/** Lädt den ganzen Stammbaum (für private Stammbäume völlig ausreichend). */
export async function loadTree(cfg) {
  const base = cfg.url.replace(/\/+$/, '');
  const password = cfg.password || process.env.GRAMPS_PASSWORD;
  if (!cfg.username || !password) throw new Error('username/password fehlen (config_<name>.json oder Umgebungsvariable GRAMPS_PASSWORD).');
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
