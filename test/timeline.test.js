import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildModel } from '../src/timeline.js';
import { loadGedcom } from '../src/gedcom.js';

const gedcomPath = fileURLToPath(new URL('../test-stammbaum-huber.ged', import.meta.url));

async function loadFixtureTree() {
  return loadGedcom(gedcomPath);
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