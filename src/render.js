// Zeichnet die Animation: Lebenslinien als leuchtende Fäden, Verstorbene steigen als Sterne auf.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const FONT_DIRS = ['C:/Windows/Fonts/', '/usr/share/fonts/truetype/dejavu/', '/System/Library/Fonts/Supplemental/'];
function findFont(names) { for (const d of FONT_DIRS) for (const n of names) if (existsSync(d + n)) return d + n; return null; }
function setupFonts() {
  const serif = findFont(['georgia.ttf', 'DejaVuSerif.ttf', 'Georgia.ttf']);
  const serifI = findFont(['georgiai.ttf', 'DejaVuSerif-Italic.ttf', 'Georgia Italic.ttf']);
  const sans = findFont(['segoeui.ttf', 'DejaVuSans.ttf', 'Arial.ttf']);
  if (serif) GlobalFonts.registerFromPath(serif, 'LSerif');
  if (serifI) GlobalFonts.registerFromPath(serifI, 'LSerifI');
  if (sans) GlobalFonts.registerFromPath(sans, 'LSans');
}

const PALETTE = ['#ff6b7a', '#5aa9ff', '#4fe0a6', '#c58bff', '#ffa85c', '#4de1ee', '#ff8fd0', '#b6e36a', '#9fb4ff', '#f0e68c'];
const GOLD = '#ffc857';
const LEAD = 2;   // Jahre vor der Geburt, ab denen die Zeitleiste läuft (wie in timeline.js)
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const frac = (x) => x - Math.floor(x);
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export async function render(model, opt) {
  setupFonts();
  const { width: W, height: H, fps, out, still, texts, audio } = opt;
  const S = W / 1080;                      // alle Maße sind für 1080 Breite gedacht
  const SERIF = 'LSerif, Georgia, serif', SERIFI = 'LSerifI, Georgia, serif', SANS = 'LSans, "Segoe UI", sans-serif';
  const headY = H * 0.47;
  const visibleYears = 20;
  const ppy = (H - headY) / visibleYears;  // Pixel pro Lebensjahr
  const tb = model.person.birth, t0 = tb - LEAD, t1 = model.endT;
  const mainSec = opt.seconds || Math.max(32, Math.min(75, (t1 - t0) * 0.85));
  const endSec = 11;
  const total = mainSec + endSec;

  // ---- Zeitraffer: um Ereignisse herum langsamer
  const eventTs = [tb, ...model.members.flatMap((m) => [m.initial ? null : m.start, m.end])].filter((t) => t != null && t > t0 && t <= t1);
  const dy = 0.02, n = Math.ceil((t1 - t0) / dy);
  const cum = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const t = t0 + i * dy;
    let d = 1; for (const e of eventTs) d += 4 * Math.exp(-(((t - e) / 0.9) ** 2));
    cum[i] = cum[i - 1] + d * dy;
  }
  const cumTotal = cum[n];
  const timeAt = (tau) => { // Videosekunde -> Jahr
    const target = clamp01(tau / mainSec) * cumTotal;
    let lo = 0, hi = n; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid + 1; else hi = mid; }
    return Math.min(t1, t0 + lo * dy);
  };
  const tauOf = (t) => { const i = Math.max(0, Math.min(n, Math.round((t - t0) / dy))); return (cum[i] / cumTotal) * mainSec; };

  // ---- Mitglieder vorbereiten
  const me = { id: 'me', name: '', rel: opt.anonymous ? (model.labels?.me || 'Ich') : model.person.first, group: 3, color: GOLD, initial: false, birth: true, start: tb, end: null, isMe: true };   // statt "Ich": nur der Vorname
  const all = [...model.members.map((m, i) => ({ ...m, ...(opt.anonymous ? { name: '' } : {}), color: PALETTE[i % PALETTE.length] })), me];
  all.sort((a, b) => (a.group - b.group) || (a.start - b.start));
  const entryDur = 2.2, exitDur = 2.6;
  for (const m of all) {
    m.tauIn = m.initial ? -1e9 : tauOf(m.start);
    m.tauOut = m.end != null ? tauOf(m.end) : null;
    m.fixedSide = m.side;   // vom Modell vorgegebene Seite (links/rechts), sonst Standardverteilung
    m.side = m.side ?? (Math.random() < 0.5 ? -1 : 1);
    m.x = null; m.hist = []; m.frozenX = null;
    m.rank = all.indexOf(m);
  }
  let friendIdx = 0;
  for (const m of all) m.leftSide = m.fixedSide != null ? m.fixedSide < 0 : m.group <= 2 || (m.group === 6 && friendIdx++ % 2 === 0);
  // Nähe zur Hauptperson: Kinder, Partner, Eltern/Enkel, Geschwister, dann der Rest (Großeltern, Freunde …)
  const tier = (m) => (m.group === 4 ? 0 : m.group === 3 ? 1 : m.group === 1 || m.group === 5 ? 2 : m.group === 2 ? 3 : 4);
  const byCloseness = (a, b) => tier(a) - tier(b) || a.group - b.group || a.start - b.start;

  // ---- Sternenpositionen oben (deterministisch, ohne Überlappung)
  const starSpots = [];
  const placed = [];
  const spotFor = (i) => {
    for (let dmin = 170; dmin >= 80; dmin -= 10) {   // bei vielen Sternen den Mindestabstand schrittweise lockern
      for (let k = 0; k < 150; k++) {
        const x = (110 + frac((i + k) * 0.6180339 + 0.17) * 860) * S;
        const y = H * (0.05 + frac((i * 7 + k) * 0.3819 + 0.31) * 0.25);
        if (placed.every((p) => Math.hypot((p.x - x) * 0.8, p.y - y) > dmin * S)) { placed.push({ x, y }); return { x, y }; }
      }
    }
    const p = { x: (140 + (i * 173) % 800) * S, y: H * 0.1 }; placed.push(p); return p;
  };
  const byExit = all.filter((m) => m.exit === 'star').sort((a, b) => a.end - b.end);
  byExit.forEach((m, i) => { m.star = spotFor(i); });
  // Die Hauptperson wird nur dann zum Stern, wenn sie selbst verstorben ist; sonst bleibt sie bei den Lebenden unten.
  if (model.person.death) { me.star = { x: W / 2, y: headY - 20 * S }; placed.push(me.star); }
  const rowY = H * 0.8;   // hier warten die noch Lebenden am Ende

  // ---- Hintergrund einmalig vorbereiten
  const bg = createCanvas(W, H); {
    const g = bg.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1030'); gr.addColorStop(0.5, '#0d1238'); gr.addColorStop(1, '#070a22');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const r = rng(7);
    for (const [cx, cy, rad, col] of [[0.2, 0.15, 0.5, 'rgba(70,60,160,0.28)'], [0.85, 0.55, 0.55, 'rgba(40,90,170,0.2)'], [0.4, 0.9, 0.6, 'rgba(90,50,140,0.18)']]) {
      const rg = g.createRadialGradient(cx * W, cy * H, 0, cx * W, cy * H, rad * W); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    for (let i = 0; i < 420; i++) { const a = 0.15 + r() * 0.6; g.fillStyle = `rgba(200,215,255,${a})`; const s = (r() < 0.9 ? 1 : 2) * S; g.fillRect(r() * W, r() * H, s, s); }
  }
  const twinkle = Array.from({ length: 40 }, (_, i) => { const r = rng(100 + i); return { x: r() * W, y: r() * H, p: r() * 6.28, s: 0.5 + r() * 1.5 }; });

  // ---- Canvas, ffmpeg
  const cv = createCanvas(W, H), c = cv.getContext('2d');
  let ff = null;
  if (!still) {
    const args = ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-'];
    if (audio) args.push('-i', audio, '-af', `afade=t=in:d=2,afade=t=out:st=${Math.max(0, total - 3)}:d=3`, '-shortest');
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart');
    if (audio) args.push('-c:a', 'aac', '-b:a', '192k');
    args.push(out);
    ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    ff.stderr.on('data', () => {});
  }
  const ffDone = ff ? new Promise((res, rej) => { ff.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg Fehlercode ' + code)))); ff.on('error', rej); }) : null;

  const stillFrame = still != null ? Math.round(still * fps) : -1;
  const nFrames = Math.ceil(total * fps);
  const trailPts = (m, tNow) => {
    const pts = [];
    let lx = -1e9, ly = -1e9;
    for (let i = m.hist.length - 1; i >= 0; i--) {
      const h = m.hist[i];
      const y = headY + (tNow - h.t) * ppy;
      if (Math.abs(h.x - lx) + Math.abs(y - ly) < 3 && i > 0 && i < m.hist.length - 1) continue;
      pts.push([h.x, y]); lx = h.x; ly = y;
      if (y > H + 40) break;
    }
    const last = pts[pts.length - 1];
    if (m.initial && last && last[1] < H + 40) pts.push([last[0], H + 40]);
    return pts;
  };

  const label = (txt1, txt2, x, y, alpha, scale, align = 'center') => {
    c.textAlign = align; c.globalAlpha = alpha;
    c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 8 * S;
    c.font = `${Math.round(27 * S * scale)}px ${SANS}`; c.fillStyle = '#f3f6ff'; c.fillText(txt1, x, y);
    if (txt2) { c.font = `${Math.round(22 * S * scale)}px ${SANS}`; c.fillStyle = 'rgba(190,205,240,0.85)'; c.fillText(txt2, x, y + 28 * S * scale); }
    c.shadowBlur = 0; c.globalAlpha = 1;
  };
  const dot = (x, y, color, r, alpha = 1) => {
    c.globalAlpha = alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, rgba(color, 0.9)); g.addColorStop(0.25, rgba(color, 0.35)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4, 0, 6.2832); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.7, 0, 6.2832); c.fill();
    c.globalAlpha = 1;
  };

  let started = false;
  for (let f = 0; f < nFrames; f++) {
    const tau = f / fps, dt = 1 / fps;
    const inMain = tau <= mainSec;
    const tNow = inMain ? timeAt(tau) : t1;
    const endTau = tau - mainSec;                       // >0 in der Schlussphase
    const trailFade = 1 - ease(endTau / 2.5);

    // aktive Bahnen bestimmen
    const lanes = all.filter((m) => tau >= m.tauIn && (m.tauOut == null || tau < m.tauOut) && !(m.rise));
    // Die Hauptperson bleibt immer in der Bildmitte; Eltern, Geschwister und Großeltern links,
    // Kinder, Enkel und Partner rechts, Freunde abwechselnd außen; je Seite nach Nähe (siehe tier) sortiert.
    const mid = W / 2;
    const left = lanes.filter((m) => !m.isMe && m.leftSide).sort(byCloseness);
    const right = lanes.filter((m) => !m.isMe && !m.leftSide).sort(byCloseness);
    const spacing = Math.min(170 * S, (W / 2 - 150 * S) / Math.max(1, left.length, right.length));
    me.target = mid;
    left.forEach((m, i) => { m.target = mid - (i + 1) * spacing; m.side = -1; m.stag = i % 2; });
    right.forEach((m, i) => { m.target = mid + (i + 1) * spacing; m.side = 1; m.stag = i % 2; });
    me.stag = 0;
    const tight = spacing < 125 * S;   // enge Bahnen: Beschriftung abwechselnd höher setzen
    for (const m of all) {
      if (m.x == null && m.target != null) m.x = m.target;
      else if (m.target != null && lanes.includes(m)) m.x += (m.target - m.x) * (1 - Math.exp(-dt * 3.2));
    }

    // Kopfposition + Verlauf
    for (const m of all) {
      m.vis = false;
      if (tau < m.tauIn || m.x == null) continue;
      m.vis = true;
      // sanftes Pendeln nach links/rechts (Lebendigkeit); die Spur zeichnet die Welle automatisch nach
      const amp = Math.min(8 * S, spacing * 0.11) * (m.isMe ? 0.6 : 1);
      const base = m.x + amp * (0.7 * Math.sin(tNow * 2.1 + m.rank * 1.7) + 0.4 * Math.sin(tNow * 0.9 + m.rank * 2.9) + 0.25 * Math.sin(tau * 1.3 + m.rank * 0.8));
      let hx = base, state = 'lane';
      const inT = tau - m.tauIn;
      if (inT < entryDur && !m.birth) hx = base + m.side * (W * 0.9) * (1 - ease(inT / entryDur)) ** 2;
      if (m.tauOut != null && tau >= m.tauOut) {
        const u = (tau - m.tauOut) / exitDur;
        if (m.exit === 'drift') { hx = m.frozenX + (m.side || 1) * W * ease(u) ** 2 * 1.2; state = 'drift'; if (u < 1.2) m.hist.push({ t: tNow, x: hx }); }
        else state = 'rise';
        m.state = state; m.u = u; m.hx = hx;
        continue;
      }
      if (m.tauOut != null) m.frozenX = hx;
      if (!m.isMe || true) m.hist.push({ t: tNow, x: hx });
      m.state = state; m.hx = hx;
    }
    // Schlussphase: Lebende steigen zu Sternen auf
    if (!inMain) {
      for (const m of all) {
        if (!m.vis || m.end != null) continue;
        if (!m.isMe || !m.star) { m.state = 'stay'; m.u = endTau / 2.2; continue; }   // Lebende werden kein Stern
        m.u = (endTau - 0.6) / exitDur; m.state = 'finalRise'; m.fx = m.hx;
      }
    }

    if (f < stillFrame) continue;

    // ---------------- zeichnen
    c.globalAlpha = 1; c.drawImage(bg, 0, 0);
    c.fillStyle = '#cfe0ff';
    for (const s of twinkle) { c.globalAlpha = 0.25 + 0.35 * Math.sin(tau * s.s + s.p) ** 2; c.fillRect(s.x, s.y, 2 * S, 2 * S); }
    c.globalAlpha = 1;

    // Alterslineal links
    const rulerA = trailFade * (inMain ? 1 : 1);
    if (rulerA > 0) {
      c.textAlign = 'left'; c.font = `${Math.round(21 * S)}px ${SANS}`;
      for (let age = 0; tb + age <= t1 + 12; age += 5) {
        const y = headY + (tNow - (tb + age)) * ppy;
        if (y < headY - 180 * S || y > H + 20) continue;
        const a = rulerA * 0.55 * clamp01((y - (headY - 180 * S)) / (140 * S)) * clamp01((H - y) / (120 * S) + 0.2);
        c.globalAlpha = a; c.fillStyle = '#b9c7ee';
        c.fillRect(34 * S, y, 16 * S, 1.5 * S);
        c.fillText(String(age), 58 * S, y + 7 * S);
        if (age % 10 === 0) { c.globalAlpha = a * 0.6; c.font = `${Math.round(17 * S)}px ${SANS}`; c.fillText(String(Math.floor(tb + age)), 58 * S, y + 27 * S); c.font = `${Math.round(21 * S)}px ${SANS}`; }
      }
      c.globalAlpha = 1;
    }

    // Spuren
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (const m of all) {
      if (!m.vis || m.hist.length < 2 || trailFade <= 0) continue;
      const pts = trailPts(m, tNow);
      if (pts.length < 2) continue;
      const g = c.createLinearGradient(0, headY - 30 * S, 0, H);
      g.addColorStop(0, rgba(m.color, 1)); g.addColorStop(0.7, rgba(m.color, 0.55)); g.addColorStop(1, rgba(m.color, 0));
      const gg = c.createLinearGradient(0, headY - 30 * S, 0, H);
      gg.addColorStop(0, rgba(m.color, 0.3)); gg.addColorStop(1, rgba(m.color, 0));
      c.globalAlpha = trailFade;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.strokeStyle = gg; c.lineWidth = 16 * S; c.stroke();
      c.strokeStyle = g; c.lineWidth = 3.2 * S; c.stroke();
      c.globalAlpha = 1;
    }

    // Köpfe, Beschriftungen, Sterne
    const labelScale = Math.min(1, spacing / (150 * S));
    const stars = [];
    for (const m of all) {
      if (!m.vis) continue;
      const hx = m.hx;
      if (m.state === 'lane') {
        const pop = m.birth ? ease((tau - m.tauIn) / 1.6) : 1;   // Neugeborene blenden an ihrem Platz auf, statt hereinzufahren
        dot(hx, headY, m.color, (3 + 4 * pop) * S, pop);
        label(m.rel, m.name, hx, headY - (56 + (tight && m.stag ? 62 : 0)) * S, pop, Math.max(0.78, labelScale));
      } else if (m.state === 'stay') {
        const y = headY + (rowY - headY) * ease(m.u);
        dot(hx, y, m.color, 7 * S);
        label(m.rel, m.name, hx, y - (56 + (tight && m.stag ? 62 : 0)) * S, 1, Math.max(0.78, labelScale));
      } else if (m.state === 'drift') {
        const a = 1 - ease(m.u * 1.2);
        dot(hx, headY, m.color, 7 * S, a);
        label(m.rel, m.name, hx, headY - 56 * S, a, Math.max(0.78, labelScale));
      } else {
        // aufsteigender Funke bzw. fertiger Stern
        const fromX = m.state === 'finalRise' ? m.fx : m.frozenX, fromY = headY;
        const u = ease(m.u);
        if (m.state === 'finalRise' && m.u <= 0) { dot(hx, headY, m.color, 7 * S); label(m.rel, m.name, hx, headY - 56 * S, 1 - 0, Math.max(0.78, labelScale)); continue; }
        const sx = fromX + (m.star.x - fromX) * u, sy = fromY + (m.star.y - fromY) * u + Math.sin(u * 3.14159) * 30 * S * (m.side || 1);
        const settled = m.u >= 1;
        const pulse = 1 + 0.12 * Math.sin(tau * 1.8 + m.rank);
        dot(sx, sy, m.color, (settled ? 6 : 7 - 2 * u) * S * pulse);
        if (!settled) { c.globalAlpha = 1 - u; label(m.rel, m.name, sx, sy - 52 * S, 1 - u * 0.4, Math.max(0.78, labelScale)); }
        else label(m.rel, m.name, sx + (m.star.x > W / 2 ? -1 : 1) * 24 * S, sy - 4 * S, 0.85, 0.82, m.star.x > W / 2 ? 'right' : 'left');
        if (settled) stars.push(m);
      }
    }

    // Sternbild am Ende
    if (!inMain) {
      const ready = all.filter((m) => m.vis && m.u != null && m.u >= 1 && m.star);
      if (ready.length > 1) {
        const a = clamp01((endTau - 3.2) / 2.5) * 0.35;
        const pts = ready.map((m) => m.star), used = [0], edges = [];
        while (used.length < pts.length) { let best = null; for (const i of used) for (let j = 0; j < pts.length; j++) if (!used.includes(j)) { const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y); if (!best || d < best.d) best = { i, j, d }; } edges.push(best); used.push(best.j); }
        c.strokeStyle = `rgba(190,210,255,${a})`; c.lineWidth = 1.5 * S; c.beginPath();
        for (const e of edges) { c.moveTo(pts[e.i].x, pts[e.i].y); c.lineTo(pts[e.j].x, pts[e.j].y); }
        c.stroke();
      }
    }

    // Anzeige unten: Alter und Jahr
    if (inMain) {
      const fade = clamp01(1 - (tau - (mainSec - 1.5)) / 1.5) * clamp01((tau - 3) / 1.5);
      c.globalAlpha = 0.8 * fade; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 8 * S;
      c.font = `${Math.round(30 * S)}px ${SERIFI}`; c.fillStyle = '#dfe8ff';
      c.fillText((tNow >= tb ? `${opt.ageLabel} ${Math.floor(tNow - tb)}  ·  ` : '') + Math.floor(tNow), W / 2, H - 70 * S);
      c.shadowBlur = 0; c.globalAlpha = 1;
    }

    // Titel zu Beginn
    if (tau < 5) {
      const a = ease(tau / 1) * (1 - ease((tau - 3.5) / 1.5));
      c.globalAlpha = a; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.95)'; c.shadowBlur = 14 * S;
      c.fillStyle = '#fff'; c.font = `${Math.round(68 * S)}px ${SERIF}`; if (!opt.anonymous) c.fillText(model.person.name, W / 2, H * 0.2);
      c.fillStyle = '#c9d6f5'; c.font = `${Math.round(36 * S)}px ${SERIFI}`;
      c.fillText(`${Math.floor(tb)}${model.person.death ? ' – ' + Math.floor(model.person.death) : ''}`, W / 2, H * 0.2 + 56 * S);
      c.shadowBlur = 0; c.globalAlpha = 1;
    }

    // Schlusstext
    if (!inMain) {
      const a1 = ease((endTau - 4.5) / 1.8), a2 = ease((endTau - 6.2) / 1.8);
      if (a1 > 0) {
      c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.95)'; c.shadowBlur = 14 * S;
      c.globalAlpha = a1; c.fillStyle = '#fff'; c.font = `${Math.round(70 * S)}px ${SERIF}`; c.fillText(texts.title, W / 2, H * 0.55);
      c.globalAlpha = a2; c.fillStyle = '#d6e0fa'; c.font = `${Math.round(36 * S)}px ${SERIFI}`;
      if (a2 > 0) texts.lines.forEach((l, i) => c.fillText(l, W / 2, H * 0.55 + 80 * S + i * 52 * S));
      c.shadowBlur = 0; c.globalAlpha = 1;
      }
    }

    if (still != null) { return cv.toBuffer('image/png'); }
    const buf = cv.data();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % (fps * 5) === 0) process.stdout.write(`\r  ${Math.round((f / nFrames) * 100)} %   `);
    started = true;
  }
  ff.stdin.end();
  await ffDone;
  process.stdout.write('\r  100 %   \n');
}
