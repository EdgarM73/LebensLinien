#!/usr/bin/env node
// Lebenslinien: Video aus einer Person in Gramps Web.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { loadTree } from './gramps.js';
import { buildModel, makeExtra } from './timeline.js';
import { render } from './render.js';
import { demoModel } from './demo.js';
import { LANGS, localize } from './i18n.js';

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    person: { type: 'string', short: 'p' },   // Gramps-ID (I0044) oder Teil des Namens
    config: { type: 'string', short: 'c' },     // config_<name>.json der Hauptperson (alternativ als erstes Argument)
    out: { type: 'string', short: 'o' },        // Standard: <Name der Person>.mp4
    demo: { type: 'boolean' },
    model: { type: 'string' },                // fertig berechnetes Modell (JSON) statt Gramps-Abfrage
    dump: { type: 'string' },                 // Modell als JSON speichern (zum Prüfen / Nachbearbeiten)
    still: { type: 'string' },                // nur ein PNG bei Sekunde X rendern (Schnelltest)
    size: { type: 'string', default: '1080x1920' },
    fps: { type: 'string', default: '30' },
    seconds: { type: 'string' },              // Dauer des Hauptteils (sonst automatisch)
    lang: { type: 'string' },
    extras: { type: 'string' },               // JSON-Datei mit Zusatzpersonen (Freunde, Kollegen …)
    audio: { type: 'string' },                // optionale Musikdatei
    'no-grandchildren': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (a.help) {
  console.log(`Aufruf: node src/index.js config_opa.json [--out video.mp4]
  Pro Hauptperson eine eigene Datei config_<name>.json (url, username, person, extras …, siehe config.example.json).
  Das Video heißt standardmäßig wie die Person: "Vorname Nachname.mp4".
  --demo               Beispieldaten statt Gramps Web
  --still 30           nur ein Standbild (PNG) bei Sekunde 30 erzeugen
  --dump modell.json   berechnetes Modell speichern;  --model modell.json  daraus rendern
  --size 1080x1920  --fps 30  --seconds 60  --lang de|en|tr|bs  --audio musik.mp3  --no-grandchildren`);
  process.exit(0);
}

const cfgFile = a.config || positionals[0];
if (!cfgFile && !a.demo && !a.model) { console.error('Bitte die Konfigurationsdatei der Person angeben, z. B.:  node src/index.js config_opa.json\n(Vorlage: config.example.json – pro Hauptperson eine eigene config_<name>.json.)'); process.exit(1); }
if (cfgFile && !existsSync(cfgFile)) { console.error('Konfigurationsdatei nicht gefunden: ' + cfgFile); process.exit(1); }
const cfg = cfgFile ? JSON.parse(readFileSync(cfgFile, 'utf8')) : {};
const personQuery = a.person || cfg.person;
const lang = a.lang || cfg.lang || 'de';
if (!LANGS[lang]) { console.error(`Unbekannte Sprache "${lang}". Möglich: ` + Object.entries(LANGS).map(([k, v]) => `${k} (${v.name})`).join(', ')); process.exit(1); }
const extras = [...(cfg.extras || []), ...(a.extras ? JSON.parse(readFileSync(a.extras, 'utf8')) : [])];

let model;
if (a.demo) model = structuredClone(demoModel);
else if (a.model) model = JSON.parse(readFileSync(a.model, 'utf8'));
else {
  if (!cfg.url) { console.error(`In ${cfgFile} fehlt "url" (siehe config.example.json).`); process.exit(1); }
  if (!personQuery) { console.error(`In ${cfgFile} fehlt "person" (Gramps-ID oder Name).`); process.exit(1); }
  console.log('Lade Stammbaum aus Gramps Web …');
  const tree = await loadTree(cfg);
  const q = personQuery.toLowerCase();
  const hits = [...tree.people.values()].filter((p) => p.gramps_id?.toLowerCase() === q ||
    [p.primary_name?.first_name, p.primary_name?.surname_list?.[0]?.surname].filter(Boolean).join(' ').toLowerCase().includes(q));
  const exact = hits.filter((p) => p.gramps_id?.toLowerCase() === q);
  const pick = exact.length ? exact : hits;
  if (pick.length !== 1) {
    console.error(pick.length ? 'Mehrere Treffer, bitte die Gramps-ID verwenden:' : 'Niemand gefunden.');
    for (const p of pick.slice(0, 15)) console.error(`  ${p.gramps_id}  ${p.primary_name?.first_name} ${p.primary_name?.surname_list?.[0]?.surname || ''}`);
    process.exit(1);
  }
  model = buildModel(tree, pick[0].handle, { lang, extras, grandchildren: !a['no-grandchildren'] });
  console.log(`${model.person.name}: ${model.members.length} Angehörige gefunden.`);
  for (const w of model.warnings) console.warn('  Hinweis: ' + w);
}
if (a.demo || a.model) {   // ohne Gramps-Abfrage: nur Zusatzpersonen mit Namen
  extras.forEach((e, i) => {
    const x = makeExtra(e, i, { bP: model.person.birth, endT: model.endT, warnings: model.warnings });
    if (x && !model.members.some((m) => m.id === x.id)) model.members.push(x);
  });
}
if (a.dump) { writeFileSync(a.dump, JSON.stringify(model, null, 2)); console.log('Modell gespeichert: ' + a.dump); }

const [W, H] = a.size.split('x').map(Number);
// Ausgabename: standardmäßig der Name der Person (ohne unzulässige Dateizeichen)
const safeName = (model.person.name || 'Lebenslinien').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'Lebenslinien';
const outFile = a.out || cfg.out || `${safeName}.mp4`;
const t = localize(model, lang);
const texts = { title: cfg.texts?.title || t.title, lines: cfg.texts?.lines || t.lines };
const opt = { width: W, height: H, fps: +a.fps, out: outFile, texts, audio: a.audio || cfg.audio, seconds: a.seconds ? +a.seconds : undefined, ageLabel: t.age };

if (a.still != null) {
  const png = await render(model, { ...opt, still: +a.still });
  const pngFile = outFile.replace(/\.mp4$/, '') + `_${a.still}s.png`;
  writeFileSync(pngFile, png);
  console.log('Standbild geschrieben: ' + pngFile);
} else {
  console.log('Rendere Video …');
  await render(model, opt);
  console.log('Fertig: ' + outFile);
}
