import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildModel } from '../src/timeline.js';

const gedcomPath = fileURLToPath(new URL('../test-stammbaum-huber.ged', import.meta.url));

function treeFromGedcom(gedcom) {
  const people = new Map();
  const families = new Map();
  const events = new Map();
  let record;
  let eventTag;

  for (const line of gedcom.split(/\r?\n/)) {
    const match = /^(\d+) (\S+)(?: (.*))?$/.exec(line);
    if (!match) continue;
    const level = Number(match[1]);
    const tag = match[2];
    const value = match[3] || '';

    if (level === 0) {
      const entity = /^@(.*?)@$/.exec(tag);
      record = null;
      eventTag = null;
      if (!entity) continue;
      const [, id] = entity;
      const kind = value;
      if (kind === 'INDI') {
        record = {
          handle: id,
          gramps_id: id,
          gender: null,
          primary_name: { first_name: '', surname_list: [] },
          event_ref_list: [],
          parent_family_list: [],
          family_list: [],
        };
        people.set(id, record);
      } else {
        record = { handle: id, father_handle: null, mother_handle: null, child_ref_list: [], event_ref_list: [], type: 'Married' };
        families.set(id, record);
      }
      continue;
    }
    if (!record) continue;

    if (level === 1) {
      eventTag = ['BIRT', 'DEAT', 'MARR'].includes(tag) ? tag : null;
      if (people.has(record.handle)) {
        if (tag === 'SEX') record.gender = value;
        if (tag === 'FAMS') record.family_list.push(value.replaceAll('@', ''));
        if (tag === 'FAMC') record.parent_family_list.push(value.replaceAll('@', ''));
      } else {
        if (tag === 'HUSB') record.father_handle = value.replaceAll('@', '');
        if (tag === 'WIFE') record.mother_handle = value.replaceAll('@', '');
        if (tag === 'CHIL') record.child_ref_list.push({ ref: value.replaceAll('@', '') });
      }
      continue;
    }

    if (level === 2 && tag === 'DATE' && eventTag) {
      const [day, month, year] = value.split(' ');
      const monthNumber = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(month) + 1;
      const event = {
        handle: `${record.handle}:${eventTag}`,
        type: { BIRT: 'Birth', DEAT: 'Death', MARR: 'Marriage' }[eventTag],
        date: { dateval: [Number(day), monthNumber, Number(year)] },
      };
      events.set(event.handle, event);
      if (people.has(record.handle)) {
        const index = record.event_ref_list.push({ ref: event.handle }) - 1;
        if (eventTag === 'BIRT') record.birth_ref_index = index;
        if (eventTag === 'DEAT') record.death_ref_index = index;
      } else {
        record.event_ref_list.push({ ref: event.handle });
      }
      continue;
    }

    if (level === 2 && people.has(record.handle)) {
      if (tag === 'GIVN') record.primary_name.first_name = value;
      if (tag === 'SURN') record.primary_name.surname_list = [{ surname: value }];
    }
  }

  return { people, families, events };
}

async function loadFixtureTree() {
  return treeFromGedcom(await readFile(gedcomPath, 'utf8'));
}

function membersInGroup(model, group) {
  return model.members.filter((member) => member.group === group).map((member) => member.full).sort();
}

test('buildModel bildet Thomas Huber und seine Familie aus dem GEDCOM ab', async () => {
  const tree = await loadFixtureTree();
  const model = buildModel(tree, 'I24');

  assert.equal(model.person.name, 'Thomas Huber');
  assert.equal(model.person.birth, 1974 + 14 / 365);
  assert.deepEqual(membersInGroup(model, 0), ['Hedwig Keller', 'Ingrid Vogt', 'Josef Huber', 'Walter Lindner']);
  assert.deepEqual(membersInGroup(model, 1), ['Renate Lindner', 'Rudolf Huber']);
  assert.deepEqual(membersInGroup(model, 2), ['Andrea Huber', 'Stefan Huber']);
  assert.deepEqual(membersInGroup(model, 3), ['Julia Schmid']);
  assert.deepEqual(membersInGroup(model, 4), ['Lena Huber', 'Lukas Huber']);
  assert.deepEqual(model.warnings, []);
});

test('buildModel nimmt Enkel standardmäßig auf und kann sie auslassen', async () => {
  const tree = await loadFixtureTree();
  const withGrandchildren = buildModel(tree, 'I9');
  const withoutGrandchildren = buildModel(tree, 'I9', { grandchildren: false });

  assert.deepEqual(membersInGroup(withGrandchildren, 5), ['Andrea Huber', 'Michael Huber', 'Stefan Huber', 'Thomas Huber']);
  assert.deepEqual(membersInGroup(withoutGrandchildren, 5), []);
});