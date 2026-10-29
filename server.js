#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS } from './src/i18n.js';
import { consumePasswordReset } from './src/password-reset.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(process.env.APP_DATA_DIR || path.join(ROOT, 'data'));
const VIDEO_DIR = path.join(DATA, 'videos');
const AUDIO_DIR = path.join(DATA, 'audio');
const RESET_DIR = path.join(DATA, 'password-resets');
const USERS_FILE = path.join(DATA, 'users.json');
const KEY_FILE = path.join(DATA, 'master.key');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const SESSION_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();
const attempts = new Map();
const generating = new Set();

class InputError extends Error {}

mkdirSync(VIDEO_DIR, { recursive: true });
mkdirSync(AUDIO_DIR, { recursive: true });
const key = process.env.APP_KEY
  ? Buffer.from(process.env.APP_KEY, 'base64')
  : (existsSync(KEY_FILE) ? readFileSync(KEY_FILE) : randomBytes(32));
if (key.length !== 32) throw new Error('APP_KEY muss ein Base64-kodierter 32-Byte-Schlüssel sein.');
if (!process.env.APP_KEY && !existsSync(KEY_FILE)) writeFileSync(KEY_FILE, key, { mode: 0o600, flag: 'wx' });

let users = existsSync(USERS_FILE) ? JSON.parse(readFileSync(USERS_FILE, 'utf8')) : [];
const saveUsers = () => {
  const temp = `${USERS_FILE}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(users), { mode: 0o600 });
  renameSync(temp, USERS_FILE);
};

function encrypt(value) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function decrypt(value) {
  if (!value) return null;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.nonce, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'));
}

function json(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new InputError('Anfrage ist zu groß.');
  }
  return raw ? JSON.parse(raw) : {};
}

async function binaryBody(req, maxBytes) {
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > maxBytes) throw new InputError('Die Audiodatei darf höchstens 50 MB groß sein.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new InputError('Die Audiodatei darf höchstens 50 MB groß sein.');
    chunks.push(chunk);
  }
  if (!size) throw new InputError('Die Audiodatei ist leer.');
  return Buffer.concat(chunks, size);
}

function audioExtension(originalName, data) {
  let filename;
  try { filename = decodeURIComponent(originalName); } catch { throw new InputError('Ungültiger Dateiname.'); }
  const extension = path.extname(path.basename(filename.replace(/\\/g, '/'))).toLowerCase();
  const valid = extension === '.mp3' && (data.subarray(0, 3).toString() === 'ID3' || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0)) ||
    extension === '.wav' && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WAVE' ||
    ['.m4a', '.mp4'].includes(extension) && data.subarray(4, 8).toString() === 'ftyp' ||
    extension === '.aac' && data[0] === 0xff && (data[1] & 0xf6) === 0xf0 ||
    extension === '.ogg' && data.subarray(0, 4).toString() === 'OggS' ||
    extension === '.flac' && data.subarray(0, 4).toString() === 'fLaC';
  if (!valid) throw new InputError('Bitte eine gültige MP3-, WAV-, M4A-, AAC-, OGG- oder FLAC-Datei auswählen.');
  return { extension, filename };
}

function cookie(req, name) {
  const item = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function sessionUser(req) {
  const token = cookie(req, 'lebenslinien_session');
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) { sessions.delete(token); return null; }
  return users.find((user) => user.id === session.userId) || null;
}

function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function rateAllowed(req, action) {
  const ip = req.socket.remoteAddress || 'unknown';
  const id = `${action}:${ip}`;
  const now = Date.now();
  const entry = attempts.get(id) || { count: 0, start: now };
  if (now - entry.start > 15 * 60 * 1000) { entry.count = 0; entry.start = now; }
  entry.count++;
  attempts.set(id, entry);
  return entry.count <= 20;
}

function publicConfig(user) {
  const config = decrypt(user.config);
  if (!config) return { configured: false, hasPassword: false, extras: [] };
  const { password, ...safe } = config;
  return { ...safe, configured: true, hasPassword: Boolean(password) };
}

function validateConfig(input, previous) {
  const url = String(input.url || '').trim().replace(/\/+$/, '');
  let parsed;
  try { parsed = new URL(url); } catch { throw new InputError('Bitte eine gültige Gramps-URL angeben.'); }
  if (parsed.username || parsed.password) throw new InputError('Zugangsdaten gehören nicht in die Server-URL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (!['https:', ...(local ? ['http:'] : [])].includes(parsed.protocol)) throw new InputError('Für Gramps-Verbindungen ist HTTPS erforderlich (außer lokalem localhost).');
  const allowedHosts = process.env.APP_ALLOWED_GRAMPS_HOSTS?.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (allowedHosts?.length && !allowedHosts.includes(parsed.hostname.toLowerCase())) throw new InputError('Dieser Gramps-Server ist nicht freigegeben.');
  const username = String(input.username || '').trim();
  const person = String(input.person || '').trim();
  const password = String(input.password || '') || previous?.password || '';
  if (!username || !person || !password) throw new InputError('URL, Benutzername, Hauptperson und Passwort sind erforderlich.');
  if (username.length > 160 || person.length > 160 || password.length > 512) throw new InputError('Ein Eingabefeld ist zu lang.');
  const lang = ['de', 'en', 'tr', 'bs'].includes(input.lang) ? input.lang : 'de';
  if (Array.isArray(input.extras) && input.extras.length > 200) throw new InputError('Es können höchstens 200 Zusatzpersonen gespeichert werden.');
  const extras = Array.isArray(input.extras) ? input.extras.map((extra) => {
    const name = String(extra.name || '').trim();
    const id = String(extra.id || '').trim();
    const start = String(extra.start || '').trim();
    const end = String(extra.end || '').trim();
    if (!name && !id) throw new InputError('Jede Zusatzperson braucht einen Namen oder eine Gramps-ID.');
    if (!/^\d{4}(?:-\d{1,2})?$/.test(start)) throw new InputError(`Ungültiges Startjahr bei ${name || id}.`);
    if (end && !/^\d{4}(?:-\d{1,2})?$/.test(end)) throw new InputError(`Ungültiges Endjahr bei ${name || id}.`);
    return { ...(name ? { name } : {}), ...(id ? { id } : {}), rel: String(extra.rel || '').trim().slice(0, 80), start, ...(end ? { end } : {}), ...(end ? { exit: extra.exit === 'star' ? 'star' : 'drift' } : {}) };
  }) : [];
  const defaults = LANGS[lang];
  const title = String(input.texts?.title || '').trim();
  const lines = Array.isArray(input.texts?.lines) ? input.texts.lines.slice(0, 2).map((line) => String(line || '').trim()) : [];
  const suggestedLines = defaults.lines.slice(0, 2);
  const isDefaultText = (title === defaults.title || !title) && lines.length === 2 && lines.every((line, index) => line === suggestedLines[index]);
  const hasCustomText = title || lines.some(Boolean);
  const texts = hasCustomText && !isDefaultText
    ? { title: title.slice(0, 120), lines: [lines[0] || '', lines[1] || ''] }
    : undefined;
  if (title.length > 120 || lines.some((line) => line.length > 180)) throw new InputError('Der Titel darf 120, jede Schlusszeile 180 Zeichen lang sein.');
  const mainLabel = String(input.mainLabel || '').trim().slice(0, 40);
  return { url, username, password, person, lang, extras, anonymous: input.anonymous === true, ...(mainLabel ? { mainLabel } : {}), ...(texts ? { texts } : {}) };
}

function runGenerator(user, config) {
  return new Promise((resolve, reject) => {
    const tmpConfig = path.join(DATA, `config-${user.id}-${randomUUID()}.json`);
    const outputName = `${user.id}-${Date.now()}.mp4`;
    const outputPath = path.join(VIDEO_DIR, outputName);
    const { password, ...nonSecretConfig } = config;
    writeFileSync(tmpConfig, JSON.stringify(nonSecretConfig), { mode: 0o600, flag: 'wx' });
    const args = [path.join(ROOT, 'src', 'index.js'), tmpConfig, '--out', outputPath, '--lang', config.lang];
    if (user.audioFile) {
      const audioPath = path.join(AUDIO_DIR, path.basename(user.audioFile));
      if (!existsSync(audioPath)) { try { unlinkSync(tmpConfig); } catch {} reject(new Error('Die gespeicherte Audiodatei wurde nicht gefunden.')); return; }
      args.push('--audio', audioPath);
    }
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, GRAMPS_PASSWORD: password },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-6000); });
    const timeout = setTimeout(() => child.kill(), 15 * 60 * 1000);
    child.on('error', (error) => { clearTimeout(timeout); try { unlinkSync(tmpConfig); } catch {} reject(error); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      try { unlinkSync(tmpConfig); } catch {}
      if (code === 0 && existsSync(outputPath)) resolve({ outputName });
      else reject(new Error(code === null ? 'Die Videoerzeugung hat das Zeitlimit überschritten.' : `Videoerzeugung fehlgeschlagen. ${stderr.slice(-1200)}`));
    });
  });
}

function sendFile(res, file) {
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="Lebenslinien.mp4"', 'Cache-Control': 'private, no-store' });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(readFileSync(path.join(ROOT, 'public', 'index.html')));
    }
    if (req.method === 'GET' && ['/app.js', '/styles.css'].includes(url.pathname)) {
      const file = path.join(ROOT, 'public', url.pathname.slice(1));
      res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(readFileSync(file));
    }
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, { registrationKeyRequired: Boolean(process.env.APP_REGISTRATION_KEY) });
    if (req.method === 'GET' && url.pathname === '/api/texts') {
      const lang = url.searchParams.get('lang');
      if (!LANGS[lang]) return json(res, 400, { error: 'Unbekannte Sprache.' });
      return json(res, 200, { title: LANGS[lang].title, lines: LANGS[lang].lines.slice(0, 2) });
    }

    if (!validOrigin(req)) return json(res, 403, { error: 'Ungültige Herkunft der Anfrage.' });
    if (req.method === 'POST' && ['/api/register', '/api/login'].includes(url.pathname)) {
      const action = url.pathname.endsWith('register') ? 'register' : 'login';
      if (!rateAllowed(req, action)) return json(res, 429, { error: 'Zu viele Versuche. Bitte später erneut probieren.' });
      const input = await body(req);
      const username = String(input.username || '').trim();
      const password = String(input.password || '');
      if (username.length > 40 || password.length > 256) return json(res, 400, { error: 'Benutzername oder Passwort ist zu lang.' });
      if (url.pathname === '/api/register') {
        if (process.env.APP_REGISTRATION_KEY && input.invite !== process.env.APP_REGISTRATION_KEY) return json(res, 403, { error: 'Einladungscode ist ungültig.' });
        if (!/^[\p{L}\p{N}._-]{3,40}$/u.test(username) || password.length < 8 || password.length > 256) return json(res, 400, { error: 'Benutzername: 3–40 Zeichen. Passwort: mindestens 8 Zeichen.' });
        if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return json(res, 409, { error: 'Benutzername ist bereits vergeben.' });
        const salt = randomBytes(16);
        users.push({ id: randomUUID(), username, salt: salt.toString('base64'), passwordHash: scryptSync(password, salt, 64).toString('base64'), config: null, lastVideo: null });
        saveUsers();
      } else {
        const found = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
        const salt = found ? Buffer.from(found.salt, 'base64') : Buffer.alloc(16);
        const hash = scryptSync(password, salt, 64);
        if (!found || !timingSafeEqual(hash, Buffer.from(found.passwordHash, 'base64'))) return json(res, 401, { error: 'Anmeldung fehlgeschlagen.' });
      }
      const user = users.find((item) => item.username.toLowerCase() === username.toLowerCase());
      const token = randomBytes(32).toString('base64url');
      sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_MS });
      return json(res, 200, { username: user.username }, { 'Set-Cookie': `lebenslinien_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}` });
    }

    if (req.method === 'POST' && url.pathname === '/api/password-reset/complete') {
      if (!rateAllowed(req, 'password-reset')) return json(res, 429, { error: 'Zu viele Versuche. Bitte später erneut probieren.' });
      const input = await body(req);
      const password = String(input.password || '');
      if (password.length < 8 || password.length > 256) return json(res, 400, { error: 'Das Passwort muss 8–256 Zeichen lang sein.' });
      const target = consumePasswordReset(input.token, users, RESET_DIR);
      if (!target) return json(res, 400, { error: 'Der Reset-Link ist ungültig oder abgelaufen.' });
      const salt = randomBytes(16);
      target.salt = salt.toString('base64');
      target.passwordHash = scryptSync(password, salt, 64).toString('base64');
      saveUsers();
      for (const [sessionToken, session] of sessions) if (session.userId === target.id) sessions.delete(sessionToken);
      return json(res, 200, { ok: true });
    }

    const user = sessionUser(req);
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      sessions.delete(cookie(req, 'lebenslinien_session'));
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'lebenslinien_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (!user) return json(res, 401, { error: 'Bitte zuerst anmelden.' });
    if (req.method === 'GET' && url.pathname === '/api/me') return json(res, 200, { username: user.username, registrationKeyRequired: Boolean(process.env.APP_REGISTRATION_KEY), config: publicConfig(user), hasVideo: Boolean(user.lastVideo), audioName: user.audioName || null });
    if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, publicConfig(user));
    if (req.method === 'POST' && url.pathname === '/api/config') {
      const input = await body(req);
      const config = validateConfig(input, decrypt(user.config));
      user.config = encrypt(config);
      saveUsers();
      return json(res, 200, { ...publicConfig(user), saved: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/audio') {
      if (generating.size) return json(res, 409, { error: 'Während der Videoerstellung kann die Musik nicht geändert werden.' });
      const data = await binaryBody(req, 50 * 1024 * 1024);
      const { extension, filename } = audioExtension(String(req.headers['x-audio-name'] || ''), data);
      const audioFile = `${user.id}-${randomUUID()}${extension}`;
      writeFileSync(path.join(AUDIO_DIR, audioFile), data, { mode: 0o600, flag: 'wx' });
      const oldAudio = user.audioFile;
      user.audioFile = audioFile;
      user.audioName = path.basename(filename.replace(/\\/g, '/')).slice(0, 180);
      saveUsers();
      if (oldAudio) { try { unlinkSync(path.join(AUDIO_DIR, path.basename(oldAudio))); } catch {} }
      return json(res, 200, { audioName: user.audioName });
    }
    if (req.method === 'DELETE' && url.pathname === '/api/audio') {
      if (generating.size) return json(res, 409, { error: 'Während der Videoerstellung kann die Musik nicht geändert werden.' });
      if (user.audioFile) { try { unlinkSync(path.join(AUDIO_DIR, path.basename(user.audioFile))); } catch {} }
      user.audioFile = null;
      user.audioName = null;
      saveUsers();
      return json(res, 200, { audioName: null });
    }
    if (req.method === 'POST' && url.pathname === '/api/generate') {
      if (generating.has(user.id)) return json(res, 409, { error: 'Für diesen Nutzer läuft bereits eine Videoerzeugung.' });
      if (generating.size >= 1) return json(res, 503, { error: 'Derzeit wird bereits ein Video erstellt. Bitte später erneut versuchen.' });
      const config = decrypt(user.config);
      if (!config) return json(res, 400, { error: 'Bitte zuerst die Verbindungsdaten speichern.' });
      generating.add(user.id);
      try {
        const { outputName } = await runGenerator(user, config);
        if (user.lastVideo) {
          try { unlinkSync(path.join(VIDEO_DIR, path.basename(user.lastVideo))); } catch {}
        }
        user.lastVideo = outputName;
        saveUsers();
        return json(res, 200, { ok: true, video: '/api/video' });
      } catch (error) {
        console.error(`Generierung für ${user.username} fehlgeschlagen:`, error.message);
        return json(res, 500, { error: 'Das Video konnte nicht erstellt werden. Bitte Verbindung und Gramps-Daten prüfen.' });
      } finally { generating.delete(user.id); }
    }
    if (req.method === 'GET' && url.pathname === '/api/video') {
      if (!user.lastVideo) return json(res, 404, { error: 'Noch kein Video vorhanden.' });
      const file = path.join(VIDEO_DIR, path.basename(user.lastVideo));
      if (!existsSync(file)) return json(res, 404, { error: 'Video wurde nicht gefunden.' });
      return sendFile(res, file);
    }
    return json(res, 404, { error: 'Nicht gefunden.' });
  } catch (error) {
    const status = error instanceof SyntaxError || error instanceof InputError ? 400 : 500;
    if (status === 500) console.error(error);
    return json(res, status, { error: status === 400 ? error.message || 'Ungültige Anfrage.' : 'Interner Serverfehler.' });
  }
});

server.listen(PORT, HOST, () => console.log(`Lebenslinien-Web läuft auf http://${HOST}:${PORT}`));