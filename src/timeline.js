// Macht aus dem rohen Gramps-Stammbaum ein Modell für die Animation:
// Hauptperson + Angehörige, jeweils mit Eintritt ("start") und Austritt ("end") in Kalenderjahren.
import { typeName, familyRelName } from './gramps.js';

// Die Bezeichnungen werden hier nur als Schlüssel ("father" …) abgelegt; übersetzt wird erst in i18n.js (localize).
const KEYS = new Proxy({}, { get: (_, k) => k });
const g3 = (gender, m, f, n) => (gender === 1 || gender === 'M' ? m : gender === 0 || gender === 'F' ? f : n);
const genderOf = (p) => { const g = p.gender; return typeof g === 'object' ? g?.value : g; };

function dateToYear(date) {
  if (!date) return null;
  const dv = date.dateval;
  if (Array.isArray(dv) && dv[2]) {
    const [d, m, y] = dv;
    return y + (m ? (m - 1) / 12 + (d ? (d - 1) / 365 : 0) : 0.5);
  }
  const mt = /\b(\d{4})\b/.exec(date.text || '');
  return mt ? +mt[1] + 0.5 : null;
}

const parseYear = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(v).trim());
  return m ? +m[1] + (m[2] ? (+m[2] - 1) / 12 : 0.5) : null;
};

/**
 * Eintrag aus "extras" (config.json) -> Mitglied der Animation.
 *   { "name": "Peter", "rel": "Freund", "start": 1975, "end": 1990, "exit": "star" }
 *   { "id": "I0123", "rel": "Kollege", "start": "1988-03" }      // Name/Sterbedatum aus Gramps
 * Ohne "end" bleibt die Person bis zum Schluss (bei Gramps-Person mit Sterbedatum: bis dahin, als Stern).
 * Mit "end" ohne "exit" driftet die Linie weg (Kontakt eingeschlafen); "exit": "star" für Verstorbene.
 */
export function makeExtra(e, i, { bP, endT, today, name = null, death = null, warnings = [] } = {}) {
  const label = name?.first || e.name || e.id || `Zusatz ${i + 1}`;
  const start = parseYear(e.start);
  if (start == null) { warnings.push(`${label}: "start" fehlt (Jahr, ab dem die Person im Leben vorkommt) – übersprungen`); return null; }
  let end = parseYear(e.end), exit = e.exit || 'drift';
  if (end == null && death != null) { end = death; exit = 'star'; }
  if (end != null && end <= bP) return null;
  if (start > endT) return null;
  if (end != null && end > endT) end = null;
  return {
    id: `extra:${e.id || e.name || i}`, name: label, full: name?.full || e.name || label, rel: e.rel, relKey: e.rel ? undefined : 'friend', group: 6,
    gender: null, start: Math.max(start, bP), end, exit: end == null ? null : exit, initial: start <= bP,
  };
}

export function buildModel(tree, rootHandle, opts = {}) {
  const lang = KEYS;
  const now = new Date();
  const today = now.getFullYear() + now.getMonth() / 12;
  const { people, families, events } = tree;

  const evYear = (p, kinds, idxKey) => {
    const refs = p.event_ref_list || [];
    const pick = (ref) => (ref ? events.get(ref.ref) : null);
    const primary = idxKey != null && p[idxKey] >= 0 ? pick(refs[p[idxKey]]) : null;
    let y = primary ? dateToYear(primary.date) : null;
    if (y == null) {
      for (const ref of refs) {
        const e = pick(ref);
        if (e && kinds.includes(typeName(e.type))) { y = dateToYear(e.date); if (y != null) break; }
      }
    }
    return y;
  };
  const birthOf = (h) => { const p = people.get(h); return p ? evYear(p, ['Birth', 'Baptism', 'Christening'], 'birth_ref_index') : null; };
  const deathOf = (h) => { const p = people.get(h); return p ? evYear(p, ['Death', 'Burial'], 'death_ref_index') : null; };
  const nameOf = (h) => {
    const n = people.get(h)?.primary_name || {};
    return { first: (n.call_name || n.first_name || '').split(' ')[0] || '?', full: [n.first_name, n.surname_list?.[0]?.surname].filter(Boolean).join(' ') };
  };
  const famEvents = (f, kind) => (f.event_ref_list || []).map((r) => events.get(r.ref)).filter((e) => e && typeName(e.type) === kind).map((e) => dateToYear(e.date)).filter((y) => y != null);
  const parentsOf = (h) => (people.get(h)?.parent_family_list || []).flatMap((fh) => { const f = families.get(fh); return f ? [f.father_handle, f.mother_handle].filter(Boolean) : []; });
  const childrenOf = (h) => (people.get(h)?.family_list || []).flatMap((fh) => (families.get(fh)?.child_ref_list || []).map((r) => r.ref));

  const root = people.get(rootHandle);
  const bP = birthOf(rootHandle);
  if (bP == null) throw new Error('Für die Hauptperson ist kein Geburtsjahr hinterlegt – ohne Geburt keine Lebenslinie.');
  const dP = deathOf(rootHandle);
  const endT = opts.endYear ?? dP ?? Math.min(today, bP + 100);

  const members = new Map();
  const warnings = [];
  const add = (handle, group, rel, startRaw, { endOverride, exit, needStart } = {}) => {
    if (members.has(handle) || handle === rootHandle || !people.has(handle)) return;
    const birth = birthOf(handle);
    const death = deathOf(handle);
    let start = startRaw ?? birth;
    const nm = nameOf(handle);
    if (needStart && startRaw == null) { warnings.push(`${nm.full}: Ehepartner ohne Heirats-/Kinddatum übersprungen`); return; }   // sonst würde die Linie bei der Geburt beginnen
    if (start == null) { warnings.push(`${nm.full}: ohne Datum übersprungen`); return; }
    if (group <= 2 && birth != null && birth <= bP) start = bP; // war schon da, als die Hauptperson geboren wurde
    if (group <= 1 && birth == null) start = bP; // Eltern/Großeltern ohne Geburtsdatum
    let end = endOverride ?? death;
    let ex = exit || 'star';
    if (end == null && birth != null && today - birth > 100) { end = birth + 78; warnings.push(`${nm.full}: kein Sterbedatum, nehme ${Math.round(end)} an`); }
    if (end != null && end <= bP) return;           // starb vor der Geburt der Hauptperson
    if (start > endT) return;                       // kam erst nach Ende hinzu
    if (end != null && end > endT) end = null;      // bleibt bis zum Schluss
    members.set(handle, { id: handle, name: nm.first, full: nm.full, rel, relKey: rel, group, gender: genderOf(people.get(handle)), start: Math.max(start, bP), end, exit: end == null ? null : ex, initial: start <= bP });
  };

  const parents = parentsOf(rootHandle);
  for (const ph of parents) for (const gh of parentsOf(ph)) add(gh, 0, g3(genderOf(people.get(gh)), lang.grandfather, lang.grandmother, lang.grandfather), null);
  for (const ph of parents) add(ph, 1, g3(genderOf(people.get(ph)), lang.father, lang.mother, lang.father), null);
  for (const fh of root.parent_family_list || []) {
    for (const r of families.get(fh)?.child_ref_list || [])
      add(r.ref, 2, g3(genderOf(people.get(r.ref)), lang.brother, lang.sister, lang.sibling), null);
  }
  for (const fh of root.family_list || []) {
    const f = families.get(fh);
    if (!f) continue;
    const sh = f.father_handle === rootHandle ? f.mother_handle : f.father_handle;
    const married = famEvents(f, 'Marriage')[0];
    const divorced = famEvents(f, 'Divorce')[0];
    const kidBirths = (f.child_ref_list || []).map((r) => birthOf(r.ref)).filter((y) => y != null);
    const start = married ?? (kidBirths.length ? Math.min(...kidBirths) - 1 : null);
    const rel = familyRelName(f.type) === 'Married' ? g3(genderOf(people.get(sh)), lang.husband, lang.wife, lang.partner) : lang.partner;
    if (sh) add(sh, 3, rel, start, { needStart: true, ...(divorced != null ? { endOverride: divorced, exit: 'drift' } : {}) });
    for (const r of f.child_ref_list || []) add(r.ref, 4, g3(genderOf(people.get(r.ref)), lang.son, lang.daughter, lang.child), null);
  }
  if (opts.grandchildren !== false) {
    for (const [h, m] of [...members]) if (m.group === 4) for (const gh of childrenOf(h)) add(gh, 5, g3(genderOf(people.get(gh)), lang.grandson, lang.granddaughter, lang.grandchild), null);
  }

  // Ehepartner der Nachkommen (Schwiegersohn/-tochter, bei Enkeln einfach "Partner")
  if (opts.inLaws !== false) {
    for (const [h, m] of [...members]) {
      if (m.group !== 4 && m.group !== 5) continue;
      for (const fh of people.get(h).family_list || []) {
        const f = families.get(fh);
        const sh = f && (f.father_handle === h ? f.mother_handle : f.father_handle);
        if (!sh) continue;
        const married = famEvents(f, 'Marriage')[0];
        const divorced = famEvents(f, 'Divorce')[0];
        const kidBirths = (f.child_ref_list || []).map((r) => birthOf(r.ref)).filter((y) => y != null);
        const key = m.group === 4 ? g3(genderOf(people.get(sh)), 'sonInLaw', 'daughterInLaw', 'partner') : 'partner';
        add(sh, 7, key, married ?? (kidBirths.length ? Math.min(...kidBirths) - 1 : null), { needStart: true, ...(divorced != null ? { endOverride: divorced, exit: 'drift' } : {}) });
      }
    }
  }

  // Nicht verwandte, aber wichtige Menschen (Freunde, Kollegen …) aus der Konfiguration
  const byGrampsId = new Map([...people.values()].map((p) => [String(p.gramps_id).toLowerCase(), p.handle]));
  const extraList = [];
  (opts.extras || []).forEach((e, i) => {
    const h = e.id ? byGrampsId.get(String(e.id).toLowerCase()) : null;
    if (e.id && !h) { warnings.push(`Zusatzperson ${e.id} nicht in Gramps gefunden`); return; }
    const x = makeExtra(e, i, { bP, endT, today, name: h ? nameOf(h) : null, death: h ? deathOf(h) : null, warnings });
    if (x) extraList.push(x);
  });

  return {
    person: { name: nameOf(rootHandle).full, first: nameOf(rootHandle).first, birth: bP, death: dP, gender: genderOf(root) },
    endT,
    members: [...[...members.values()].sort((a, b) => a.group - b.group || a.start - b.start), ...extraList],
    warnings,
  };
}
