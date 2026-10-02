#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));

if (args.includes('--help') || (positional.length < 2 && !args.includes('--reveal'))) {
  console.log(`kero-blind

  node blind.mjs <folder-a> <folder-b> [--briefs folder] [--viewport 1440x900] [--port 4747] [--out kero-blind.json]
  node blind.mjs --reveal [--out kero-blind.json]

Files are paired by name without extension. Supported: html, png, jpg, jpeg, webp, gif, svg, mp4, webm.`);
  process.exit(args.includes('--help') ? 0 : 1);
}

const out = path.resolve(flag('out', 'kero-blind.json'));
const MEDIA = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const save = async (state) => {
  await fs.writeFile(out + '.tmp', JSON.stringify(state, null, 2));
  await fs.rename(out + '.tmp', out);
};

const summary = (state) => {
  const totals = { [state.labels.a]: 0, [state.labels.b]: 0, tie: 0 };
  const notes = [];
  for (const p of state.pairs) {
    if (!p.vote) continue;
    const chosen = p.vote.winner === 'tie' ? 'tie' : p[p.vote.winner].side === 'a' ? state.labels.a : state.labels.b;
    totals[chosen]++;
    if (p.vote.note) notes.push({ name: p.name, chosen, note: p.vote.note });
  }
  return { voted: state.pairs.filter((p) => p.vote).length, total: state.pairs.length, totals, notes };
};

if (args.includes('--reveal')) {
  const state = await readJson(out, null);
  if (!state) {
    console.error(`No results at ${out}`);
    process.exit(1);
  }
  const s = summary(state);
  console.log(`${s.voted} of ${s.total} pairs voted\n`);
  for (const [k, v] of Object.entries(s.totals)) console.log(`  ${k.padEnd(24)} ${v}`);
  if (s.notes.length) console.log('\nNotes');
  for (const n of s.notes) console.log(`  ${n.name} -> ${n.chosen}: ${n.note}`);
  process.exit(0);
}

const [dirA, dirB] = positional.slice(0, 2).map((d) => path.resolve(d));
const briefs = flag('briefs') ? path.resolve(flag('briefs')) : null;
const port = Number(flag('port', 4747));
const [vw, vh] = flag('viewport', '1440x900').split('x').map(Number);

const index = async (dir) => {
  const map = {};
  for (const f of await fs.readdir(dir)) {
    const ext = path.extname(f).toLowerCase();
    if (MEDIA[ext]) map[path.basename(f, ext)] = f;
  }
  return map;
};

const build = async () => {
  const [a, b] = await Promise.all([index(dirA), index(dirB)]);
  const previous = existsSync(out) ? await readJson(out, null) : null;
  const same = previous && previous.dirs?.a === dirA && previous.dirs?.b === dirB;
  const pairs = same ? previous.pairs : [];
  const known = new Set(pairs.map((p) => p.name));
  const added = Object.keys(a)
    .filter((n) => b[n] && !known.has(n))
    .map((name) => {
      const flip = crypto.randomInt(2) === 1;
      const left = { side: 'a', file: a[name] };
      const right = { side: 'b', file: b[name] };
      return { id: crypto.randomBytes(4).toString('hex'), name, A: flip ? right : left, B: flip ? left : right, vote: null };
    });
  for (let i = added.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [added[i], added[j]] = [added[j], added[i]];
  }
  const unpaired = [...Object.keys(a).filter((n) => !b[n]), ...Object.keys(b).filter((n) => !a[n])];
  return {
    dirs: { a: dirA, b: dirB },
    labels: { a: path.basename(dirA), b: path.basename(dirB) },
    pairs: [...pairs, ...added],
    unpaired,
  };
};

const state = await build();
await save(state);
if (!state.pairs.length) {
  console.error('No files share a name across the two folders.');
  process.exit(1);
}

const brief = async (name) => {
  if (!briefs) return '';
  for (const ext of ['.md', '.txt']) {
    const f = path.join(briefs, name + ext);
    if (existsSync(f)) return (await fs.readFile(f, 'utf8')).trim();
  }
  return '';
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blind comparison</title>
<style>
  :root { --bg: #f3f3f1; --surface: #fff; --ink: #161615; --ink-2: #55554f; --line: #dadad4; color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
  * { box-sizing: border-box; }
  body { margin: 0; height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
  header { display: flex; gap: 24px; align-items: flex-start; padding: 16px 24px; background: var(--surface); border-bottom: 1px solid var(--line); }
  .progress { font-size: 15px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; padding-top: 1px; }
  .brief { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-2); max-width: 110ch; white-space: pre-wrap; }
  .brief.collapsed { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; }
  main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 24px; min-height: 0; }
  .pane { display: grid; grid-template-rows: auto 1fr; gap: 8px; min-height: 0; }
  .pane-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 15px; }
  .pane-head strong { font-size: 18px; }
  .pane-head a { color: var(--ink-2); }
  .stage { position: relative; overflow: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
  .stage iframe { position: absolute; inset: 0 auto auto 0; border: 0; background: #fff; transform-origin: 0 0; }
  .stage img, .stage video { display: block; width: 100%; height: auto; }
  .pane.win .stage { outline: 3px solid var(--ink); outline-offset: 3px; }
  footer { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 12px 24px; background: var(--surface); border-top: 1px solid var(--line); }
  button { font: inherit; font-size: 15px; min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; transition: background-color 120ms ease-out; }
  @media (hover: hover) { button:hover { background: #ebebe7; } }
  button:active { transform: scale(0.97); }
  button[aria-pressed="true"], button.primary { background: var(--ink); border-color: var(--ink); color: #fff; }
  button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  input { font: inherit; font-size: 15px; flex: 1; min-width: 240px; min-height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--line); outline: none; }
  .keys { font-size: 14px; color: var(--ink-2); }
  .done { grid-column: 1 / -1; align-self: center; justify-self: center; font-size: 18px; line-height: 1.6; max-width: 60ch; }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } button:active { transform: none; } }
</style>
</head>
<body>
<header><div class="progress" id="progress">Loading</div><p class="brief collapsed" id="brief"></p></header>
<main id="main"></main>
<footer>
  <button id="prev">Previous</button>
  <button data-vote="A">A wins</button>
  <button data-vote="tie">Tie</button>
  <button data-vote="B">B wins</button>
  <input id="note" placeholder="Why, in one line (optional)…">
  <button class="primary" id="next">Next</button>
  <span class="keys">1 A, 2 tie, 3 B, arrows to move</span>
</footer>
<script>
  const VIEW = { w: ${vw}, h: ${vh} };
  let pairs = [];
  let at = 0;
  const $ = (id) => document.getElementById(id);
  const media = (p, side) => {
    const src = '/file/' + p.id + '/' + side;
    if (p[side] === 'html') return '<iframe title="Design ' + side + '" src="' + src + '"></iframe>';
    if (p[side] === 'video') return '<video src="' + src + '" controls loop muted playsinline></video>';
    return '<img alt="Design ' + side + '" src="' + src + '">';
  };
  const pane = (p, side) => {
    const el = document.createElement('section');
    el.className = 'pane' + (p.vote && p.vote.winner === side ? ' win' : '');
    el.innerHTML = '<div class="pane-head"><strong>' + side + '</strong><a href="/file/' + p.id + '/' + side + '" target="_blank" rel="noopener">Open in tab</a></div><div class="stage">' + media(p, side) + '</div>';
    return el;
  };
  const fit = () => document.querySelectorAll('.stage').forEach((stage) => {
    const f = stage.querySelector('iframe');
    if (!f) return;
    const r = stage.getBoundingClientRect();
    const scale = Math.min(1, r.width / VIEW.w);
    f.style.width = VIEW.w + 'px';
    f.style.height = Math.max(VIEW.h, r.height / scale) + 'px';
    f.style.transform = 'scale(' + scale + ')';
  });
  const render = async () => {
    const main = $('main');
    main.innerHTML = '';
    if (at >= pairs.length) {
      const s = await (await fetch('/api/summary')).json();
      $('progress').textContent = s.voted + ' of ' + s.total + ' voted';
      $('brief').textContent = '';
      const rows = Object.entries(s.totals).map(([k, v]) => k + ': ' + v).join('<br>');
      main.innerHTML = '<div class="done">' + (s.voted < s.total ? 'Some pairs are still open. Use Previous to go back.<br><br>' : '') + rows + '</div>';
      return;
    }
    const p = pairs[at];
    $('progress').textContent = 'Pair ' + (at + 1) + ' of ' + pairs.length;
    $('brief').textContent = p.brief;
    $('note').value = p.vote ? p.vote.note : '';
    document.querySelectorAll('[data-vote]').forEach((b) => b.setAttribute('aria-pressed', String(!!p.vote && p.vote.winner === b.dataset.vote)));
    main.append(pane(p, 'A'), pane(p, 'B'));
    requestAnimationFrame(fit);
  };
  const vote = async (winner) => {
    const p = pairs[at];
    if (!p) return;
    const note = $('note').value.trim();
    const res = await fetch('/api/vote', { method: 'POST', body: JSON.stringify({ id: p.id, winner, note }) }).catch(() => null);
    if (!res || !res.ok) { $('progress').textContent = 'The vote was not saved. Reload and vote this pair again.'; return; }
    p.vote = { winner, note };
    at++;
    render();
  };
  document.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', () => vote(b.dataset.vote)));
  $('next').addEventListener('click', () => { at = Math.min(at + 1, pairs.length); render(); });
  $('prev').addEventListener('click', () => { at = Math.max(at - 1, 0); render(); });
  $('brief').addEventListener('click', (e) => e.currentTarget.classList.toggle('collapsed'));
  addEventListener('resize', fit);
  addEventListener('keydown', (e) => {
    if (e.target === $('note')) return;
    if (e.key === '1') vote('A');
    if (e.key === '2') vote('tie');
    if (e.key === '3') vote('B');
    if (e.key === 'ArrowRight') $('next').click();
    if (e.key === 'ArrowLeft') $('prev').click();
  });
  (async () => {
    pairs = await (await fetch('/api/pairs')).json();
    const open = pairs.findIndex((p) => !p.vote);
    at = open === -1 ? pairs.length : open;
    render();
  })();
</script>
</body>
</html>`;

const kind = (file) => {
  const t = MEDIA[path.extname(file).toLowerCase()];
  return t === 'text/html' ? 'html' : t.startsWith('video') ? 'video' : 'image';
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/') return send(res, 200, PAGE, 'text/html');
      if (url.pathname === '/api/pairs') {
        const list = await Promise.all(
          state.pairs.map(async (p) => ({ id: p.id, A: kind(p.A.file), B: kind(p.B.file), brief: await brief(p.name), vote: p.vote })),
        );
        return send(res, 200, list);
      }
      const file = url.pathname.match(/^\/file\/([a-f0-9]+)\/(A|B)$/);
      if (file) {
        const p = state.pairs.find((x) => x.id === file[1]);
        if (!p) return send(res, 404, 'not found', 'text/plain');
        const entry = p[file[2]];
        const full = path.join(entry.side === 'a' ? dirA : dirB, entry.file);
        return send(res, 200, await fs.readFile(full), MEDIA[path.extname(full).toLowerCase()]);
      }
      if (url.pathname === '/api/vote' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const { id, winner, note } = JSON.parse(body);
        const p = state.pairs.find((x) => x.id === id);
        if (!p || !['A', 'B', 'tie'].includes(winner)) return send(res, 400, { error: 'invalid vote' });
        p.vote = { winner, note: note ?? '', at: new Date().toISOString() };
        await save(state);
        return send(res, 200, { ok: true });
      }
      if (url.pathname === '/api/summary') {
        const s = summary(state);
        const done = s.voted === s.total;
        return send(res, 200, done ? s : { voted: s.voted, total: s.total, totals: {} });
      }
      send(res, 404, 'not found', 'text/plain');
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  })
  .listen(port, () => {
    console.log(`kero-blind on http://localhost:${port}  ${state.pairs.length} pairs, results in ${out}`);
    if (state.unpaired.length) console.log(`Without a pair, left out: ${state.unpaired.join(', ')}`);
  });
