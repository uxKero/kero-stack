#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

if (has('help')) {
  console.log(`kero-audit

  node audit.mjs [--url http://localhost:3000] [--routes /,/pricing] [--viewports 390x844,1440x900]
                 [--min-text 14] [--icons 16,20,24] [--spacing 4,8,12,16,24,32,48,64] [--measure 45,80]
                 [--states-max 40] [--out audit] [--config kero-audit.json] [--json]

Without --url it looks for a dev server on 3000, 3001, 3002, 4321, 5173 and 8080.`);
  process.exit(0);
}

const configPath = flag('config', 'kero-audit.json');
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};

const list = (v) => (Array.isArray(v) ? v : String(v).split(',')).map((s) => String(s).trim()).filter(Boolean);
const parseViewport = (v) => {
  if (typeof v === 'object') return { width: v.width, height: v.height };
  const [width, height] = v.split('x').map(Number);
  return { width, height };
};

const findServer = async () => {
  for (const p of [3000, 3001, 3002, 4321, 5173, 8080]) {
    try {
      const r = await fetch(`http://localhost:${p}/`, { signal: AbortSignal.timeout(1500) });
      if (r.status < 500) return `http://localhost:${p}`;
    } catch {}
  }
  console.error('No server found on 3000, 3001, 3002, 4321, 5173 or 8080. Start the dev server or pass --url.');
  process.exit(2);
};

const base = (flag('url') ?? config.url ?? (await findServer())).replace(/\/$/, '');
const routes = list(flag('routes') ?? config.routes ?? ['/']).map((r) => {
  if (/^[A-Za-z]:[\\/]/.test(r)) {
    console.error(`Route "${r}" was turned into a Windows path by the shell. In Git Bash write routes without the leading slash: home,pricing.`);
    process.exit(2);
  }
  return r.startsWith('/') ? r : `/${r === 'home' ? '' : r}`;
});
const verbose = has('verbose');
const viewports = list(flag('viewports') ?? config.viewports ?? ['390x844']).map(parseViewport);
const minText = Number(flag('min-text') ?? config.minText ?? 14);
const icons = flag('icons') ?? config.icons ? list(flag('icons') ?? config.icons).map(Number) : null;
const out = flag('out') ?? config.out ?? 'audit';
const spacingRaw = flag('spacing') ?? config.spacing;
const spacing = spacingRaw ? list(spacingRaw).map(Number) : null;
const [measureMin, measureMax] = list(flag('measure') ?? config.measure ?? '45,80').map(Number);
const statesMax = Number(flag('states-max') ?? config.statesMax ?? 40);
const asJson = has('json');

const loadPlaywright = async () => {
  const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
  for (const name of ['playwright', 'playwright-core']) {
    for (const resolve of [() => pathToFileURL(fromProject.resolve(name)).href, () => name]) {
      try {
        const m = await import(resolve());
        const chromium = m.chromium ?? m.default?.chromium;
        if (chromium) return chromium;
      } catch {}
    }
  }
  console.error('Playwright is missing. Run: npm i -D playwright-core');
  process.exit(2);
};

const chromium = await loadPlaywright();
const browser = await chromium.launch({ channel: 'chrome' }).catch(() =>
  chromium.launch().catch(() => {
    console.error('No browser found. Install Chrome, or download Chromium with: npx playwright install chromium');
    process.exit(2);
  }),
);
mkdirSync(out, { recursive: true });

const checks = readFileSync(new URL('./checks.js', import.meta.url), 'utf8');

const DEV = 'nextjs-portal,vite-error-overlay,astro-dev-toolbar,[data-nextjs-toast],[data-nextjs-dev-tools-button]';

const slug = (route) => (route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/[^\w-]+/g, '-'));

const measureState = ({ i, state }) => {
  let opacity = 1;
  for (let n = document.querySelector(`[data-kero-i="${i}"]`); n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
  const el = document.querySelector(`[data-kero-i="${i}"]`);
  if (!el) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const paint = (layers) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    for (const c of layers) {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
    }
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const luminance = (rgb) =>
    rgb
      .map((c) => c / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((a, c, k) => a + c * [0.2126, 0.7152, 0.0722][k], 0);
  const ratio = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const behind = (n0) => {
    const layers = [];
    for (let n = n0; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return null;
      layers.unshift(cs.backgroundColor);
    }
    return paint(layers);
  };
  const text = (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 32);
  const out = [];
  const cs = getComputedStyle(el);
  const bg = behind(el);
  if (bg && el.textContent.trim()) {
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && (Number(cs.fontWeight) || 400) >= 700);
    const min = large ? 3 : 4.5;
    const ink = paint([`rgb(${bg.join(',')})`, cs.color]);
    const r = ratio(paint([`rgb(${bg.join(',')})`, `rgba(${ink.join(',')},${opacity})`]), bg);
    if (r < min) out.push({ text, state, part: 'text', ratio: +r.toFixed(2), min });
  }
  if (state === 'focus' && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
    const around = behind(el.parentElement || document.body);
    if (around) {
      const r = ratio(paint([`rgb(${around.join(',')})`, cs.outlineColor]), around);
      if (r < 3) out.push({ text, state, part: 'focus ring', ratio: +r.toFixed(2), min: 3 });
    }
  }
  return out;
};

const stateWalk = async (page, max) => {
  const n = await page.evaluate(({ max, DEV }) => {
    const ok = (e) => {
      if (e.closest(`[inert],[aria-hidden="true"],:disabled,[aria-disabled="true"],${DEV}`)) return false;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      for (let x = e; x; x = x.parentElement) {
        const cs = getComputedStyle(x);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      }
      return true;
    };
    const els = [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch]')].filter(ok).slice(0, max);
    els.forEach((e, i) => e.setAttribute('data-kero-i', i));
    return els.length;
  }, { max, DEV });
  const low = [];
  let measured = 0;
  const still = await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  for (let i = 0; i < n; i++) {
    const sel = `[data-kero-i="${i}"]`;
    for (const state of ['hover', 'focus']) {
      try {
        if (state === 'hover') await page.hover(sel, { timeout: 1200 });
        else {
          await page.mouse.move(0, 0);
          await page.focus(sel, { timeout: 1200 });
        }
      } catch {
        continue;
      }
      await page.waitForTimeout(140);
      const r = await page.evaluate(measureState, { i, state });
      if (!r) continue;
      measured++;
      low.push(...r);
    }
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur?.());
  }
  await still.evaluate((el) => el.remove());
  return { low, measured, controls: n };
};

const focusWalk = async (page) => {
  const missing = [];
  let walked = 0;
  const seen = new Set();
  const still = await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const x = await page.evaluate((DEV) => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (el.closest(DEV)) return { id: el.outerHTML.slice(0, 120), dev: true };
      const chain = [];
      for (let n = el, d = 0; n && d < 3; d++, n = n.parentElement) chain.push(n);
      const read = () =>
        chain.map((n) => {
          const cs = getComputedStyle(n);
          return {
            outline: cs.outlineStyle !== 'none' && (parseFloat(cs.outlineWidth) || 0) > 0,
            look: `${cs.boxShadow}|${cs.backgroundColor}|${cs.borderColor}|${cs.color}`,
          };
        });
      const focused = read();
      el.blur();
      const resting = read();
      el.focus();
      let ok = el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable]');
      if (!ok) ok = focused.some((f, i) => f.outline || f.look !== resting[i].look);
      const id = el.outerHTML.slice(0, 120);
      return { id, text: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 32), ok };
    }, DEV);
    if (!x || seen.has(x.id)) break;
    seen.add(x.id);
    if (x.dev) continue;
    walked++;
    if (!x.ok) missing.push(x.text);
  }
  await still.evaluate((el) => el.remove());
  return { walked, missing };
};

const stillMoving = (page) =>
  page.evaluate(
    (DEV) =>
      [...document.querySelectorAll('body *')].filter((e) => {
        if (e.closest(DEV)) return false;
        const cs = getComputedStyle(e);
        const t = Math.max(...cs.transitionDuration.split(',').map(parseFloat));
        const a = cs.animationName !== 'none' && Math.max(...cs.animationDuration.split(',').map(parseFloat)) > 0.05;
        return t > 0.05 || a;
      }).length,
    DEV,
  );

const report = [];
const errors = [];
let failed = false;

for (const viewport of viewports) {
  const touch = viewport.width < 1024;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${page.url()} pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(`${page.url()} console: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/favicon.ico') && errors.push(`HTTP ${r.status()} ${r.url()}`));

  for (const route of routes) {
    const name = `${slug(route)}-${viewport.width}`;
    const response = await page.goto(base + route, { waitUntil: 'networkidle' }).catch((e) => ({ error: e.message }));
    if (response?.error || (response && response.status() >= 400)) {
      report.push({ route, viewport: `${viewport.width}x${viewport.height}`, error: response.error?.split('\n')[0] ?? `HTTP ${response.status()}` });
      failed = true;
      continue;
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const shot = path.join(out, `${name}.png`);
    await page.screenshot({ path: shot });

    await page.evaluate((o) => (window.KERO_AUDIT = o), { minText, icons, spacing, measure: [measureMin, measureMax], touch });
    const { hard: _staticHard, notMeasured: _notMeasured, url: _url, viewport: _vp, minText: _mt, touch: _t, ...checked } = await page.evaluate(checks);
    const r = checked;
    const more = checked;
    const focus = await focusWalk(page);
    const states = await stateWalk(page, statesMax);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    const moving = await stillMoving(page);
    await page.emulateMedia({ reducedMotion: null });

    const hard = [
      r.scrollX && 'horizontal scroll',
      r.zoomLocked && 'zoom locked',
      r.lowContrast.length && `${r.lowContrast.length} low contrast`,
      more.controlContrast.low.length && `${more.controlContrast.low.length} low control contrast`,
      states.low.length && `${states.low.length} low state contrast`,
    ].filter(Boolean);
    if (hard.length) failed = true;

    report.push({ route, viewport: `${viewport.width}x${viewport.height}`, screenshot: shot, hard, ...r, ...more, stateContrast: states, focus, moving });
  }
  await context.close();
}
await browser.close();

writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, minText, report, errors }, null, 2));

if (asJson) {
  console.log(JSON.stringify({ base, report, errors }, null, 2));
} else {
  const show = (tag, items) => {
    const counts = new Map();
    for (const i of items) {
      const k = typeof i === 'string' ? i : JSON.stringify(i);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    for (const [k, n] of counts) console.log(`    ${tag.padEnd(12)} ${k}${n > 1 ? `  x${n}` : ''}`);
  };
  console.log(`kero-audit  ${base}  min text ${minText}px\n`);
  for (const r of report) {
    const head = `${r.route} @ ${r.viewport}`;
    if (r.error) {
      console.log(`${head}\n    ERROR ${r.error}\n`);
      continue;
    }
    console.log(head + (r.hard.length ? `   FAIL: ${r.hard.join(', ')}` : '   ok'));
    console.log(
      [
        `contrast ${r.lowContrast.length} low, ${r.borderline.length} borderline of ${r.texts - r.overImage} texts${r.overImage ? ` (${r.overImage} over images, not measured)` : ''}`,
        `text under ${minText}px ${r.smallText.length}`,
        `small targets ${r.smallTargets.length}`,
        `focus missing ${new Set(r.focus.missing).size} of ${r.focus.walked} walked`,
        `moving under reduced motion ${r.moving}`,
        `headings unbalanced ${r.unbalanced.length}`,
        icons ? `icons off scale ${r.offScale.length}` : null,
        r.noTouchAction.length ? `no touch-action ${r.noTouchAction.length}` : null,
        `control contrast ${r.controlContrast.low.length} low of ${r.controlContrast.measured} controls (${r.controlContrast.textOnly} named by their text and ${r.controlContrast.native} native, not required)`,
        `state contrast ${r.stateContrast.low.length} low of ${r.stateContrast.measured} states on ${r.stateContrast.controls} controls`,
        `nested radii ${r.nestedRadii.off.length} off of ${r.nestedRadii.pairs} pairs`,
        `spacing off scale ${r.spacingScale.off.length} of ${r.spacingScale.distinct} values (${r.spacingScale.off.reduce((a, o) => a + o.uses, 0)} of ${r.spacingScale.total} uses)`,
        `line length ${r.lineLength.long.length} over ${r.lineLength.max}, ${r.lineLength.short.length} under ${r.lineLength.min} of ${r.lineLength.blocks} blocks`,
        r.primaryActions.length ? `primary actions ${r.primaryActions.length} look primary at once (warning)` : 'primary actions 1 or none',
        r.overflowing.length ? `overflowing ${r.overflowing.length}` : null,
      ]
        .filter(Boolean)
        .map((s) => '  ' + s)
        .join('\n'),
    );
    show('low', r.lowContrast);
    if (verbose) show('borderline', r.borderline);
    show('small text', r.smallText);
    show('target', r.smallTargets);
    show('no focus', r.focus.missing);
    show('heading', r.unbalanced);
    show('overflow', r.overflowing);
    show('control', r.controlContrast.low);
    show('state', r.stateContrast.low);
    show('radius', r.nestedRadii.off);
    if (r.spacingScale.off.length) console.log(`    spacing      ${r.spacingScale.off.slice(0, 12).map((o) => `${o.value}px x${o.uses}`).join(', ')}${r.spacingScale.off.length > 12 ? ', ...' : ''}`);
    show('long line', r.lineLength.long);
    show('short line', r.lineLength.short);
    if (r.primaryActions.length) console.log(`    primary      ${r.primaryActions.join(' | ')}`);
    if (r.offScale.length) console.log(`    icons        ${JSON.stringify(r.offScale)}`);
    console.log(`    screenshot   ${r.screenshot}\n`);
  }
  console.log(errors.length ? `console errors ${errors.length}` : 'console errors 0');
  show('error', errors);
  if (!report.some((r) => !r.error && r.focus.walked)) console.log('\nNo element received focus on any route. The focus check did not look at anything.');
}

process.exit(failed ? 1 : 0);
