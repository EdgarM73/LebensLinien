import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { loadTree } from '../src/gramps.js';
import { buildModel } from '../src/timeline.js';

const configPath = new URL('../config_test.json', import.meta.url);
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
const username = process.env.GRAMPS_TEST_USERNAME || config.username;
const password = process.env.GRAMPS_TEST_PASSWORD || config.password;
const url = process.env.GRAMPS_TEST_URL || config.url || 'https://grampsweb.apps.mw29.de';

test('GrampsWeb-Testinstanz enthält den Huber-Stammbaum', { skip: !username || !password }, async () => {
  const tree = await loadTree({ url, username, password });
  const roots = [...tree.people.values()].filter((person) =>
    person.primary_name?.first_name === 'Thomas' && person.primary_name?.surname_list?.[0]?.surname === 'Huber');

  assert.ok(roots.length, 'Thomas Huber muss im importierten Teststammbaum vorkommen');
  const models = roots.map((root) => {
    try { return buildModel(tree, root.handle); } catch { return null; }
  }).filter(Boolean);
  const model = models.find((candidate) =>
    candidate.members.some((member) => member.full === 'Julia Schmid' && member.group === 3) &&
    candidate.members.some((member) => member.full === 'Lukas Huber' && member.group === 4) &&
    candidate.members.some((member) => member.full === 'Lena Huber' && member.group === 4));

  assert.ok(model, 'Der passende Thomas Huber muss Julia Schmid, Lukas und Lena enthalten');
});