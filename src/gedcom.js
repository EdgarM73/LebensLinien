// Liest eine GEDCOM-Datei (Export aus webtrees, Gramps, MyHeritage, Ancestry …) und bringt sie in dieselbe
// Form wie die Daten aus Gramps Web (siehe gramps.js), damit buildModel unverändert damit arbeiten kann:
//   { people: Map(handle -> Person), families: Map(handle -> Familie), events: Map(handle -> Ereignis) }
// Gelesen werden nur die Angaben, die das Video braucht: Namen, Geschlecht, Geburt/Taufe, Tod/Beerdigung,
// Eltern-Kind-Beziehungen, Ehen (Heirat, Scheidung).
import { readFileSync } from 'node:fs';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const PERSON_EVENTS = { BIRT: 'Birth', CHR: 'Christening', BAPM: 'Baptism', DEAT: 'Death', BURI: 'Burial', CREM: 'Burial' };
const FAMILY_EVENTS = { MARR: 'Marriage', DIV: 'Divorce' };

/** Text einer GEDCOM-Datei aus Bytes: UTF-8 (auch mit BOM), UTF-16 oder ältere Exporte in Windows-1252/ANSI. */
export function decodeGedcom(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    // Kein gültiges UTF-8: ANSI-/ANSEL-Exporte – Windows-1252 trifft Umlaute in den allermeisten Fällen
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * GEDCOM-Datum -> [Tag, Monat, Jahr] (0 = unbekannt) oder null.
 * Versteht u. a. "12 JAN 1974", "JAN 1974", "1974", "ABT 1950", "BEF 1900", "BET 1900 AND 1910",
 * "FROM 1900 TO 1910", "INT 1900 (Text)", "1700/01" und Kalenderangaben wie "@#DJULIAN@ 1 JAN 1700".
 */
export function parseGedcomDate(value) {
  let text = String(value || '').toUpperCase().replace(/\([^)]*\)/g, ' ').replace(/@#D[^@]*@/g, ' ');
  text = text.replace(/\b(ABT|ABOUT|EST|CAL|BEF|AFT|INT|FROM|BET)\b/g, ' ');
  text = text.split(/\b(?:AND|TO)\b/)[0];   // bei Zeiträumen zählt der Anfang
  const match = /(?:(\d{1,2})\s+)?(?:([A-Z]{3})\s+)?(\d{3,4})(?:\/\d{1,2})?/.exec(text.trim());
  if (!match) return null;
  const month = match[2] ? MONTHS.indexOf(match[2]) + 1 : 0;
  const day = month && match[1] ? Number(match[1]) : 0;
  return [day, month, Number(match[3])];
}

/** Zerlegt "Thomas Michael /Huber/" in Vornamen und Nachnamen. */
function splitName(value) {
  const match = /^([^/]*)\/([^/]*)\/?(.*)$/.exec(value || '');
  if (!match) return { given: String(value || '').trim(), surname: '' };
  return { given: `${match[1]} ${match[3]}`.replace(/\s+/g, ' ').trim(), surname: match[2].trim() };
}

/** Wandelt GEDCOM-Text in die Gramps-Form um. */
export function parseGedcom(text) {
  const people = new Map();
  const families = new Map();
  const events = new Map();
  let record = null;       // aktuelle Person oder Familie
  let isPerson = false;
  let event = null;        // aktuelles Ereignis (Ebene 1)
  let inName = false;      // in der ersten NAME-Struktur einer Person
  let eventCount = 0;
  const ref = (value) => String(value || '').replace(/@/g, '').trim();

  for (const raw of String(text).split(/\r\n|\r|\n/)) {
    const line = raw.replace(/^\s+/, '');
    const match = /^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/.exec(line);
    if (!match) continue;
    const level = Number(match[1]);
    const xref = match[2];
    const tag = match[3].toUpperCase();
    const value = (match[4] || '').trim();

    if (level === 0) {
      record = null; event = null; inName = false;
      if (!xref) continue;
      const id = ref(xref);
      if (tag === 'INDI') {
        isPerson = true;
        record = { handle: id, gramps_id: id, gender: null, primary_name: { first_name: '', surname_list: [] }, event_ref_list: [], parent_family_list: [], family_list: [] };
        people.set(id, record);
      } else if (tag === 'FAM') {
        isPerson = false;
        record = { handle: id, gramps_id: id, father_handle: null, mother_handle: null, child_ref_list: [], event_ref_list: [], type: 'Unknown' };
        families.set(id, record);
      }
      continue;
    }
    if (!record) continue;

    if (level === 1) {
      event = null; inName = false;
      const kind = isPerson ? PERSON_EVENTS[tag] : FAMILY_EVENTS[tag];
      if (kind) {
        event = { handle: `${record.handle}:${tag}:${++eventCount}`, type: kind, date: null };
        events.set(event.handle, event);
        const index = record.event_ref_list.push({ ref: event.handle }) - 1;
        if (isPerson && tag === 'BIRT' && record.birth_ref_index == null) record.birth_ref_index = index;
        if (isPerson && tag === 'DEAT' && record.death_ref_index == null) record.death_ref_index = index;
        if (!isPerson && tag === 'MARR') record.type = 'Married';   // eine Heirat genügt, auch ohne Datum
        continue;
      }
      if (isPerson) {
        if (tag === 'NAME' && !record.nameSeen) {
          record.nameSeen = true; inName = true;
          const { given, surname } = splitName(value);
          record.primary_name.first_name = given;
          if (surname) record.primary_name.surname_list = [{ surname }];
        } else if (tag === 'SEX') {
          record.gender = { M: 1, F: 0 }[value.toUpperCase()[0]] ?? 2;
        } else if (tag === 'FAMS') record.family_list.push(ref(value));
        else if (tag === 'FAMC') record.parent_family_list.push(ref(value));
      } else if (tag === 'HUSB') record.father_handle = ref(value);
      else if (tag === 'WIFE') record.mother_handle = ref(value);
      else if (tag === 'CHIL') record.child_ref_list.push({ ref: ref(value) });
      continue;
    }

    if (level === 2) {
      if (event && tag === 'DATE') {
        const dateval = parseGedcomDate(value);
        if (dateval) event.date = { dateval, text: value };
      } else if (inName && tag === 'GIVN' && value) record.primary_name.first_name = value;
      else if (inName && tag === 'SURN' && value) record.primary_name.surname_list = [{ surname: value }];
      else if (inName && tag === 'NICK' && value) record.primary_name.nick = value;
    }
  }

  for (const person of people.values()) delete person.nameSeen;
  // Verweise auf Familien oder Personen, die in der Datei fehlen, entfernen
  for (const person of people.values()) {
    person.family_list = person.family_list.filter((id) => families.has(id));
    person.parent_family_list = person.parent_family_list.filter((id) => families.has(id));
  }
  for (const family of families.values()) {
    if (family.father_handle && !people.has(family.father_handle)) family.father_handle = null;
    if (family.mother_handle && !people.has(family.mother_handle)) family.mother_handle = null;
    family.child_ref_list = family.child_ref_list.filter((child) => people.has(child.ref));
  }
  if (!people.size) throw new Error('GEDCOM: keine Personen gefunden – ist das eine GEDCOM-Datei?');
  return { people, families, events };
}

/** Liest eine GEDCOM-Datei von der Platte. */
export function loadGedcom(file) {
  return parseGedcom(decodeGedcom(readFileSync(file)));
}

/** Kompakte Personenliste für die Suche (wie listPeople in gramps.js). */
export function listGedcomPeople(tree) {
  const yearOf = (person, index, kinds) => {
    const refs = person.event_ref_list || [];
    const pick = (i) => tree.events.get(refs[i]?.ref)?.date?.dateval?.[2] || null;
    if (index != null) { const y = pick(index); if (y) return y; }
    for (let i = 0; i < refs.length; i++) if (kinds.includes(tree.events.get(refs[i].ref)?.type)) { const y = pick(i); if (y) return y; }
    return null;
  };
  return [...tree.people.values()].map((person) => ({
    id: person.gramps_id,
    name: [person.primary_name.first_name, person.primary_name.surname_list[0]?.surname].filter(Boolean).join(' ').trim(),
    birth: yearOf(person, person.birth_ref_index, ['Birth', 'Christening', 'Baptism']),
    death: yearOf(person, person.death_ref_index, ['Death', 'Burial']),
  }));
}
