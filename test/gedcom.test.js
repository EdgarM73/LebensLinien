import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { decodeGedcom, parseGedcom, parseGedcomDate, listGedcomPeople } from '../src/gedcom.js';
import { buildModel } from '../src/timeline.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = path.join(root, 'test-stammbaum-huber.ged');

test('GEDCOM-Datumsangaben werden verstanden', () => {
  assert.deepEqual(parseGedcomDate('12 JAN 1974'), [12, 1, 1974]);
  assert.deepEqual(parseGedcomDate('MAR 1950'), [0, 3, 1950]);
  assert.deepEqual(parseGedcomDate('ABT 1900'), [0, 0, 1900]);
  assert.deepEqual(parseGedcomDate('BET 1900 AND 1910'), [0, 0, 1900]);
  assert.deepEqual(parseGedcomDate('FROM 3 MAY 1920 TO 1930'), [3, 5, 1920]);
  assert.deepEqual(parseGedcomDate('INT 1888 (laut Kirchenbuch)'), [0, 0, 1888]);
  assert.deepEqual(parseGedcomDate('@#DJULIAN@ 1 FEB 1700/01'), [1, 2, 1700]);
  assert.equal(parseGedcomDate('unbekannt'), null);
});

test('Namen, Ereignisse, Ehen und ältere Zeichensätze', () => {
  const ansi = Buffer.concat([
    Buffer.from('0 HEAD\n1 CHAR ANSI\n0 @P1@ INDI\n1 NAME J', 'latin1'),
    Buffer.from([0xfc]),   // "ü" in Windows-1252
    Buffer.from('rgen /M\xfcller/\n1 SEX M\n1 BIRT\n2 DATE ABT 1950\n1 FAMS @F1@\n'
      + '0 @P2@ INDI\n1 NAME Anna /Schmidt/\n2 GIVN Anna Maria\n1 SEX F\n1 CHR\n2 DATE 3 MAR 1952\n1 FAMS @F1@\n'
      + '0 @P3@ INDI\n1 NAME Tom //\n1 SEX M\n1 BIRT\n2 DATE 1980\n1 FAMC @F1@\n'
      + '0 @F1@ FAM\n1 HUSB @P1@\n1 WIFE @P2@\n1 CHIL @P3@\n1 CHIL @P9@\n1 MARR\n1 DIV\n2 DATE 1990\n0 TRLR\n', 'latin1'),
  ]);
  const tree = parseGedcom(decodeGedcom(ansi));
  const people = listGedcomPeople(tree);
  assert.deepEqual(people.find((p) => p.id === 'P1'), { id: 'P1', name: 'Jürgen Müller', birth: 1950, death: null });
  assert.equal(people.find((p) => p.id === 'P2').name, 'Anna Maria Schmidt', 'GIVN hat Vorrang vor NAME');
  assert.equal(people.find((p) => p.id === 'P2').birth, 1952, 'Taufe ersetzt eine fehlende Geburt');
  const family = tree.families.get('F1');
  assert.equal(family.type, 'Married', 'eine Heirat ohne Datum zählt als Ehe');
  assert.deepEqual(family.child_ref_list, [{ ref: 'P3' }], 'Verweise auf fehlende Personen werden entfernt');

  const model = buildModel(tree, 'P3');
  const rels = Object.fromEntries(model.members.map((m) => [m.full, m]));
  assert.equal(rels['Jürgen Müller'].relKey, 'father');
  assert.equal(rels['Anna Maria Schmidt'].relKey, 'mother');
});

test('Der Huber-Stammbaum ergibt dasselbe Modell wie bisher', () => {
  const tree = parseGedcom(decodeGedcom(readFileSync(fixture)));
  assert.equal(tree.people.size, 35);
  const model = buildModel(tree, 'I24');
  assert.equal(model.person.name, 'Thomas Huber');
  assert.equal(model.members.length, 11);
});

test('Keine Personen: verständlicher Fehler', () => {
  assert.throws(() => parseGedcom('Das ist keine GEDCOM-Datei'), /keine Personen/);
});

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

test('Weboberfläche: GEDCOM hochladen, prüfen, suchen, speichern und Vorschaubild', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-gedcom-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root,
    env: { ...process.env, APP_DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1', APP_REGISTRATION_KEY: '' },
    stdio: 'ignore',
  });
  context.after(async () => {
    if (child.exitCode == null) child.kill();
    await new Promise((resolve) => child.exitCode != null ? resolve() : child.once('exit', resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });
  const deadline = Date.now() + 5000;
  let up = false;
  while (!up && Date.now() < deadline) { try { up = (await fetch(`${base}/api/status`)).ok; } catch { await new Promise((r) => setTimeout(r, 50)); } }
  assert.ok(up, 'Testserver wurde nicht rechtzeitig gestartet.');

  const registration = await fetch(`${base}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'gedcom-user', password: 'validpass' }) });
  const cookie = registration.headers.get('set-cookie').split(';')[0];
  const post = (route, data) => fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(data) });

  const before = await post('/api/gramps/test', { source: 'gedcom' });
  assert.equal(before.status, 400);
  assert.match((await before.json()).error, /zuerst eine GEDCOM-Datei/);

  const wrong = await fetch(`${base}/api/gedcom`, { method: 'POST', headers: { Cookie: cookie, 'X-File-Name': 'notiz.txt' }, body: 'nur Text' });
  assert.equal(wrong.status, 400);

  const upload = await fetch(`${base}/api/gedcom`, { method: 'POST', headers: { Cookie: cookie, 'X-File-Name': encodeURIComponent('Familie Huber.ged') }, body: readFileSync(fixture) });
  assert.equal(upload.status, 200);
  assert.deepEqual(await upload.json(), { gedcomName: 'Familie Huber.ged', gedcomPeople: 35 });

  assert.equal((await (await post('/api/gramps/test', { source: 'gedcom' })).json()).people, 35);
  const search = await (await post('/api/gramps/people', { source: 'gedcom', q: 'thomas hu' })).json();
  assert.deepEqual(search.people.map((p) => p.id), ['I24']);

  const saved = await post('/api/config', { source: 'gedcom', person: 'I24', lang: 'de', extras: [] });
  assert.equal(saved.status, 200, 'ohne Gramps-Zugangsdaten speicherbar');
  const config = await saved.json();
  assert.equal(config.source, 'gedcom');
  assert.equal(config.hasPassword, false);

  const me = await (await fetch(`${base}/api/me`, { headers: { Cookie: cookie } })).json();
  assert.equal(me.gedcomName, 'Familie Huber.ged');

  const preview = await post('/api/preview', { position: 'end' });
  assert.equal(preview.status, 200, 'Vorschaubild aus der GEDCOM-Datei');

  const removed = await fetch(`${base}/api/gedcom`, { method: 'DELETE', headers: { Cookie: cookie } });
  assert.equal(removed.status, 200);
  const missing = await post('/api/preview', { position: 'end' });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /GEDCOM-Datei wurde nicht gefunden/);
});
