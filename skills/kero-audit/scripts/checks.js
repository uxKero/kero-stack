// kero-audit checks. Self-contained: paste it into a console or pass it to any
// browser tool's evaluate(). It returns the report and leaves it in window.__keroAudit.
// Options (all optional): window.KERO_AUDIT = { minText, icons, spacing, measure, touch }.
(() => {
  const DEV = 'nextjs-portal,vite-error-overlay,astro-dev-toolbar,[data-nextjs-toast],[data-nextjs-dev-tools-button]';
  const DISABLED = ':disabled,[aria-disabled="true"]';
  const inspect = ({ minText, icons, touch }) => {
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
        .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => {
      const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      }
      return true;
    };
    const opacity = (el) => {
      let o = 1;
      for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const background = (el) => {
      const layers = [];
      let overImage = false;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none') overImage = true;
        layers.unshift(cs.backgroundColor);
      }
      return { rgb: paint(layers), overImage };
    };
    const label = (el) =>
      (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.tagName)
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32);
    const active = (sel) => [...document.querySelectorAll(sel)].filter((e) => !e.closest(`[inert],${DEV}`) && visible(e));

    const textElements = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!node.textContent.trim() || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      if (el.closest(`[aria-hidden="true"],${DEV},${DISABLED}`) || !visible(el)) continue;
      textElements.add(el);
    }

    const lowContrast = [];
    const borderline = [];
    const smallText = [];
    let overImage = 0;
    for (const el of textElements) {
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.fontSize);
      const weight = Number(cs.fontWeight) || 400;
      if (px < minText) smallText.push({ text: label(el), px });
      const bg = background(el);
      if (bg.overImage) {
        overImage++;
        continue;
      }
      const ink = paint([`rgb(${bg.rgb.join(',')})`, cs.color]);
      const fg = paint([`rgb(${bg.rgb.join(',')})`, `rgba(${ink.join(',')},${opacity(el)})`]);
      const r = ratio(fg, bg.rgb);
      const large = px >= 24 || (px >= 18.66 && weight >= 700);
      const min = large ? 3 : 4.5;
      const item = { text: label(el), px, ratio: +r.toFixed(2), min };
      if (r < min) lowContrast.push(item);
      else if (r < min + 0.5) borderline.push(item);
    }

    const minTarget = touch ? 44 : 24;
    const smallTargets = active('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch]')
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (Math.min(r.width, r.height) >= minTarget) return false;
        const host = e.closest('label');
        if (host) {
          const h = host.getBoundingClientRect();
          if (Math.min(h.width, h.height) >= minTarget) return false;
        }
        return !(e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li'));
      })
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { text: label(e), w: Math.round(r.width), h: Math.round(r.height) };
      });

    const noTouchAction = touch
      ? [...new Set(active('a[href],button,label,input,select,[role=button]').filter((e) => getComputedStyle(e).touchAction === 'auto').map(label))]
      : [];

    const offScale = icons
      ? [...new Set(active('svg').filter((s) => !s.closest('[data-illustration]') && !s.hasAttribute('data-illustration')).map((s) => Number(s.getAttribute('width')) || Math.round(s.getBoundingClientRect().width)).filter((w) => w && w <= 64 && !icons.includes(w)))].sort((a, b) => a - b)
      : [];

    const unbalanced = active('h1,h2,h3')
      .filter((h) => {
        const cs = getComputedStyle(h);
        return !`${cs.textWrapStyle || ''} ${cs.textWrap || ''}`.match(/balance|pretty/);
      })
      .map(label);

    const clipped = (e) => {
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).overflowX !== 'visible') return true;
      }
      return false;
    };
    const viewWidth = document.documentElement.clientWidth;
    const overflowRoots = [];
    for (const e of document.querySelectorAll('body *')) {
      const r = e.getBoundingClientRect();
      if (!r.width || r.right <= viewWidth + 1 || getComputedStyle(e).position === 'fixed') continue;
      if (e.closest('[data-overflow-ok]') || clipped(e) || overflowRoots.some((o) => o.contains(e))) continue;
      overflowRoots.push(e);
    }
    const overflowing = overflowRoots
      .slice(0, 10)
      .map((e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}`);

    const viewportMeta = document.querySelector('meta[name="viewport"]')?.content || '';
    return {
      lowContrast,
      borderline,
      smallText,
      overImage,
      texts: textElements.size,
      smallTargets,
      noTouchAction,
      offScale,
      unbalanced,
      overflowing,
      zoomLocked: /maximum-scale\s*=\s*1(\.0)?\b|user-scalable\s*=\s*(no|0)/.test(viewportMeta),
      scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  };


  const inspectMore = ({ spacing, measureMin, measureMax }) => {
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
    const alpha = (c) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data[3] / 255;
    };
    const luminance = (rgb) =>
      rgb
        .map((c) => c / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => {
      const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      }
      return true;
    };
    const behind = (el) => {
      const layers = [];
      let overImage = false;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none') overImage = true;
        layers.unshift(cs.backgroundColor);
      }
      return { rgb: paint(layers), overImage };
    };
    const label = (el) =>
      (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.tagName)
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32);
    const usable = (e) => !e.closest(`[inert],[aria-hidden="true"],${DEV}`) && visible(e);
    const borderOf = (cs) => {
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        if (cs[`border${side}Style`] !== 'none' && parseFloat(cs[`border${side}Width`]) >= 1 && alpha(cs[`border${side}Color`]) > 0.05) return cs[`border${side}Color`];
      }
      return null;
    };

    const controlLow = [];
    let controlMeasured = 0;
    let controlTextOnly = 0;
    let controlNative = 0;
    let controlOverImage = 0;
    for (const el of document.querySelectorAll('button,input:not([type=hidden]),select,textarea,[role=button],[role=switch],[role=checkbox],[role=tab]')) {
      if (!usable(el) || el.closest(DISABLED)) continue;
      const cs = getComputedStyle(el);
      if (el.matches('input[type=checkbox],input[type=radio],input[type=range],input[type=color],input[type=file]') && cs.appearance !== 'none') {
        controlNative++;
        continue;
      }
      const around = behind(el.parentElement || document.body);
      if (around.overImage) {
        controlOverImage++;
        continue;
      }
      const base = `rgb(${around.rgb.join(',')})`;
      const border = borderOf(cs);
      const fill = alpha(cs.backgroundColor) > 0.05 ? cs.backgroundColor : null;
      const field = el.matches('input,select,textarea,[role=switch],[role=checkbox]');
      if (!field && el.textContent.trim()) {
        controlTextOnly++;
        continue;
      }
      controlMeasured++;
      const ownBg = paint([base, fill ?? 'transparent']);
      const best = Math.max(
        border ? ratio(paint([base, border]), around.rgb) : 1,
        fill ? ratio(ownBg, around.rgb) : 1,
        field ? 1 : ratio(paint([`rgb(${ownBg.join(',')})`, cs.color]), ownBg),
      );
      if (best < 3) controlLow.push({ text: label(el), ratio: +best.toFixed(2), min: 3, ...(field && !border && !fill ? { why: 'no boundary' } : {}) });
    }

    const painted = (cs) => alpha(cs.backgroundColor) > 0.05 || cs.backgroundImage !== 'none' || borderOf(cs) || cs.boxShadow !== 'none';
    const radiusOf = (el, cs) => {
      const r = el.getBoundingClientRect();
      const v = cs.borderTopLeftRadius;
      const px = v.endsWith('%') ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) || 0;
      return Math.min(px, Math.min(r.width, r.height) / 2);
    };
    const nestedOff = [];
    let nestedPairs = 0;
    const rounded = [...document.querySelectorAll('body *')].filter((e) => {
      if (e.closest('svg') || !usable(e)) return false;
      const cs = getComputedStyle(e);
      return radiusOf(e, cs) > 2 && painted(cs);
    });
    const roundedSet = new Set(rounded);
    for (const outer of rounded) {
      const ro = radiusOf(outer, getComputedStyle(outer));
      const or = outer.getBoundingClientRect();
      for (const inner of outer.querySelectorAll('*')) {
        if (!roundedSet.has(inner)) continue;
        const ir = inner.getBoundingClientRect();
        const inset = Math.min(ir.left - or.left, ir.top - or.top);
        if (inset < 0 || inset >= ro) continue;
        if (ir.right > or.right + 1 || ir.bottom > or.bottom + 1) continue;
        nestedPairs++;
        const ri = radiusOf(inner, getComputedStyle(inner));
        const expected = Math.max(0, ro - inset);
        if (ri > expected + 2) nestedOff.push({ text: label(inner), outer: Math.round(ro), inset: Math.round(inset), inner: Math.round(ri), expected: Math.round(expected) });
      }
    }

    const spacingUses = new Map();
    let spacingTotal = 0;
    const props = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap'];
    const onScale = (v) => (spacing ? spacing.some((s) => Math.abs(s - v) < 0.5) : Math.abs(v - 4 * Math.round(v / 4)) < 0.5);
    const autoMargin = (el, p, raw) => {
      const side = p === 'marginLeft' ? 'margin-left' : 'margin-right';
      const was = el.style.getPropertyValue(side);
      const priority = el.style.getPropertyPriority(side);
      el.style.setProperty(side, 'auto', 'important');
      const same = getComputedStyle(el)[p] === raw;
      el.style.setProperty(side, was, priority);
      if (!was) el.style.removeProperty(side);
      return same;
    };
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[data-spacing-ok],svg') || !usable(el)) continue;
      const cs = getComputedStyle(el);
      for (const p of props) {
        const raw = cs[p];
        if (!raw || raw === 'normal' || raw === 'auto') continue;
        const v = Math.abs(parseFloat(raw));
        if (!v || v <= 1) continue;
        if ((p === 'marginLeft' || p === 'marginRight') && !onScale(v) && autoMargin(el, p, raw)) continue;
        spacingTotal++;
        const key = Math.round(v * 10) / 10;
        spacingUses.set(key, (spacingUses.get(key) || 0) + 1);
      }
    }
    const spacingOff = [...spacingUses].filter(([v]) => !onScale(v)).sort((a, b) => b[1] - a[1]).map(([value, uses]) => ({ value, uses }));

    const measureLong = [];
    const measureShort = [];
    let measureBlocks = 0;
    for (const el of document.querySelectorAll('p,li')) {
      if (!usable(el) || el.querySelector('p,li,ul,ol,button,[role=button],a[href]:not(p a, li > a:only-child)') || el.closest('button,[role=button],nav')) continue;
      const only = el.children.length === 1 ? el.children[0] : null;
      if (only && only.matches('a[href]') && only.children.length > 1) continue;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text.length < 40) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = new Set([...range.getClientRects()].filter((r) => r.width > 1).map((r) => Math.round(r.top / 4))).size;
      if (lines <= 2) continue;
      measureBlocks++;
      const chars = Math.round(text.length / lines);
      const item = { text: label(el), chars, lines };
      if (chars > measureMax) measureLong.push(item);
      else if (chars < measureMin) measureShort.push(item);
    }

    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const actions = [...document.querySelectorAll('button,a[href],[role=button]')]
      .filter((e) => {
        if (!usable(e) || !e.textContent.trim()) return false;
        const r = e.getBoundingClientRect();
        return r.height <= 72 && r.width <= 420 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      })
      .map((e) => {
        const cs = getComputedStyle(e);
        if (alpha(cs.backgroundColor) < 0.9) return null;
        const around = behind(e.parentElement || document.body);
        const fill = paint([`rgb(${around.rgb.join(',')})`, cs.backgroundColor]);
        const mx = Math.max(...fill) / 255;
        const mn = Math.min(...fill) / 255;
        const sat = mx ? (mx - mn) / mx : 0;
        const contrast = ratio(fill, around.rgb);
        return { el: e, fill, score: contrast * (1 + sat), contrast };
      })
      .filter((a) => a && a.contrast >= 3);
    let primary = [];
    if (actions.length) {
      const top = actions.reduce((a, b) => (b.score > a.score ? b : a));
      primary = actions.filter((a) => a.fill.every((c, i) => Math.abs(c - top.fill[i]) <= 6)).map((a) => label(a.el));
    }

    return {
      controlContrast: { low: controlLow, measured: controlMeasured, textOnly: controlTextOnly, native: controlNative, overImage: controlOverImage },
      nestedRadii: { off: nestedOff, pairs: nestedPairs },
      spacingScale: { off: spacingOff, distinct: spacingUses.size, total: spacingTotal, scale: spacing ?? 'multiples of 4' },
      lineLength: { long: measureLong, short: measureShort, blocks: measureBlocks, min: measureMin, max: measureMax },
      primaryActions: primary.length > 1 ? primary : [],
    };
  };

  const opts = Object.assign({}, window.KERO_AUDIT || {});
  const minText = Number(opts.minText ?? 14);
  const toList = (v) => (v == null ? null : (Array.isArray(v) ? v : String(v).split(',')).map(Number).filter((n) => !Number.isNaN(n)));
  const icons = toList(opts.icons);
  const spacing = toList(opts.spacing);
  const [measureMin, measureMax] = toList(opts.measure) ?? [45, 80];
  const touch = opts.touch ?? (matchMedia('(pointer: coarse)').matches || document.documentElement.clientWidth < 1024);

  const r = inspect({ minText, icons, touch });
  const more = inspectMore({ spacing, measureMin, measureMax });
  const hard = [
    r.scrollX && 'horizontal scroll',
    r.zoomLocked && 'zoom locked',
    r.lowContrast.length && `${r.lowContrast.length} low contrast`,
    more.controlContrast.low.length && `${more.controlContrast.low.length} low control contrast`,
  ].filter(Boolean);
  const result = {
    url: location.href,
    viewport: `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
    minText,
    touch,
    hard,
    ...r,
    ...more,
    notMeasured: [
      'focus: needs real Tab presses to compare focused and idle',
      'stateContrast: needs forced hover and focus on each control',
      'moving: needs a reload with prefers-reduced-motion: reduce',
      'consoleErrors: needs to listen from page load',
      'screenshots and other viewports: need to drive the browser',
    ],
  };
  window.__keroAudit = result;
  return result;
})()
