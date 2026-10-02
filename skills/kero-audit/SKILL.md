---
name: kero-audit
description: Measure rendered screens in a real browser before anyone looks at them, with any browser tool or with Playwright. Contrast on the painted color, control and state contrast, text size, hit areas, keyboard focus, reduced motion, nested radii, spacing scale, line length, competing primary actions, heading balance, icon scale, zoom, overflow and console errors, with a screenshot per screen. Use after any change to a web interface and before saying it is done.
---

# Kero audit

What can be measured is not asked. The measurements live in `scripts/checks.js`, a self-contained script that runs inside any page, so the audit works with whatever browser tool the agent has. Every fault comes with its denominator.

## Any browser tool

Open the page at the real viewport, wait for fonts, then evaluate the contents of `scripts/checks.js` in the page: browser console, Claude in Chrome, Chrome DevTools MCP, agent-browser, Puppeteer or any `evaluate` call. The script is one expression, so the call returns the report as JSON, and it also stays in `window.__keroAudit`.

Options are optional; set them before evaluating:

```js
window.KERO_AUDIT = { minText: 14, icons: [16, 20, 24], spacing: [4, 8, 12, 16, 24, 32], measure: [45, 80] };
```

`hard` lists what fails WCAG AA or breaks the page. `notMeasured` lists what needs the browser driven and was not checked: keyboard focus, hover and focus state contrast, reduced motion and console errors. Report them as not checked, never as zero, or do them by hand.

## With Playwright

Start the dev server, then from the project root:

```bash
node <skill-dir>/scripts/audit.mjs --routes /,/pricing,/settings --viewports 390x844,1440x900
```

It injects the same `checks.js` and adds what needs a driven browser: it walks the keyboard, forces hover and focus on each control, reloads with reduced motion, collects console errors, loops routes and viewports and saves a screenshot of each.

In Git Bash on Windows, write routes without the leading slash (`home,pricing,settings`, where `home` is `/`) and the script path as `C:/...`, because the shell rewrites a leading `/` into a Windows path. Do not use `MSYS_NO_PATHCONV=1`: it also stops the shell from fixing a `/c/...` script path, and Node cannot find the file.

It needs `playwright` or `playwright-core` in the project (`npm i -D playwright-core`). It uses the installed Chrome. Without Chrome it needs Playwright's Chromium, which `playwright-core` does not download: run `npx playwright install chromium` once.

Options, also readable from a config file (`kero-audit.json` in the folder the command runs from, or the one given with `--config`) with the same names in camelCase:

| Option | Default | Meaning |
|:--|:--|:--|
| `--url` | first server found on 3000, 3001, 3002, 4321, 5173, 8080 | Base URL. Pass it whenever more than one server is running. |
| `--routes` | `/` | Comma separated paths. |
| `--viewports` | `390x844` | Comma separated `WIDTHxHEIGHT`. Under 1024 wide counts as touch. |
| `--min-text` | `14` | Smallest text size allowed, in px. |
| `--icons` | off | Allowed icon widths. SVGs up to 64px count as icons; mark smaller drawings with `data-illustration`. |
| `--spacing` | multiples of 4 | Allowed margin, padding and gap values in px. |
| `--measure` | `45,80` | Characters per line allowed in running text. |
| `--states-max` | `40` | How many controls get hovered and focused. |
| `--out` | `audit` | Folder for screenshots and `report.json`. |
| `--config` | `kero-audit.json` | Config file to read the options from. Flags win over it. |
| `--json` | off | Print the full report as JSON. |
| `--verbose` | off | List borderline contrast one by one. |

With Playwright, the exit code is 1 when a hard fault appears (text, control or state contrast below WCAG AA, horizontal scroll, zoom locked, a route that fails to load) and 0 otherwise, so it can gate a commit or a CI step.

## What it measures, and how

- **Contrast on the painted color.** Every background layer up the tree and the text color are painted onto a 1 by 1 canvas and read back as pixels, with the text faded by the opacity of the element and its ancestors. Parsing computed colors is wrong for `oklab`, `color-mix` and alpha, and makes good palettes look broken. Text over an image is counted apart and not measured. Disabled controls are left out, as WCAG exempts them.
- **Borderline contrast.** Passing by less than 0.5 is counted separately and listed with `--verbose`. Two shades of one hue that barely pass still read badly.
- **Focus by walking the keyboard.** It presses Tab, compares each element focused and at rest, and accepts a ring drawn on the element or up to two ancestors. Text fields pass on their caret. The report says how many elements were walked, because zero faults over zero elements means nothing was checked.
- **Hit areas** of 44px on touch viewports and 24px with a pointer, counting a wrapping label as the target. Inline links inside running text are skipped.
- **Touch action**, on touch viewports: controls left at `touch-action: auto` are listed, as a warning. `manipulation` removes the double-tap zoom wait on taps.
- **Reduced motion.** The page is reloaded with `prefers-reduced-motion: reduce` and every element with a transition or animation still running is counted.
- **Control contrast (WCAG 1.4.11).** Fields, switches, checkboxes and icon-only buttons need 3:1 for their border, fill or icon against what surrounds them, on the painted color. Buttons named by their own text are counted apart: WCAG does not require a boundary there.
- **State contrast.** Each control is hovered and then focused; text must keep its minimum in both states and a focus outline needs 3:1. Transitions are frozen while focus and states are read, so the check sees the final state, not a frame in the middle of an animation.
- **Nested radii.** A rounded element inside another, closer to the edge than the outer radius, should have at most the outer radius minus that inset (2px of tolerance).
- **Spacing scale.** Every margin, padding and gap is collected; values off the scale are listed with how often they appear. Margins that behave as `auto` (centering, pushing a flex item) are not spacing and are skipped. Mark other exceptions with `data-spacing-ok`.
- **Line length.** Paragraphs and list items longer than two lines report their characters per line against the allowed range. Cards and navigation are left out.
- **Primary actions**, as a warning: more than one button-sized action in the first screen with the strongest solid fill.
- **Headings** without `text-wrap: balance` or `pretty`, **icons** outside the declared scale, **overflow** past the viewport (content inside its own scroll container is fine), **zoom** locked in the viewport meta, and **console errors**.

## Reading the result

- Development overlays (Next.js, Vite, Astro) are ignored. Still, audit a production build when one is at hand.
- Fix hard faults first, then borderline contrast and small targets, then the rest.
- Open the screenshots. The audit catches what breaks rules, not what looks wrong; that is the person's eye.
- Before trusting a clean run, check the base URL it printed. A clean run against the wrong server is the most expensive false positive there is.
- When a rule of the project can be measured and is not here, add it to the project's copy of the script and write it in the project's design skill (`kero-system`).
