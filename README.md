<div align="center">

# Kero-stack

The design stack behind every interface I direct with AI agents.

<a href="https://x.com/uxKero"><img alt="Made by @uxKero" src="https://img.shields.io/badge/MADE%20BY-%40uxKero-000000.svg?style=for-the-badge&logo=x&labelColor=000000"></a> <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/LICENSE-MIT-000000.svg?style=for-the-badge&labelColor=000000"></a> <a href="skills"><img alt="Agent Skills format" src="https://img.shields.io/badge/FORMAT-AGENT%20SKILLS-000000.svg?style=for-the-badge&labelColor=000000"></a>

**English** · [Español](README.es.md)

</div>

<br>

Good AI design does not come from a better prompt. It comes from a loop: a person brings the direction, agents build, every screen is measured before anyone looks at it, choices are judged blind, and each correction becomes a rule the project keeps. Kero-stack is that loop, packaged as skills your agent loads by itself.

## Three entries

| From zero | Redesign | From a reference |
|:--|:--|:--|
| No product yet. Research what exists and why it fails, write the thesis in one sentence, list what the product does, then bring the direction and enter the loop. | The product exists. Survey what the code already says, bring the references and enter the loop at Direct. | Only a screenshot, a site or a Figma file. anydesign turns it into a design.md and the loop starts from there. |

## The loop

| Direct | Systematize | Build | Measure | Judge | Record |
|:--|:--|:--|:--|:--|:--|
| The person brings the idea and the references. | The reference becomes a design skill inside the project. | Agents build with craft rules and the project's own system. | Every screen is checked in a real browser. | Two options are compared without knowing which is which. | Each correction becomes a rule with its reason. |

## What is inside

Seven skills.

| Skill | What it does |
|:--|:--|
| [kero-method](skills/kero-method/SKILL.md) | The method itself: the three entries, roles, the loop, orchestrating agents, how to measure, how to iterate without breaking what works, and the taste principles behind it. It decides which skill comes next. |
| [kero-research](skills/kero-research/SKILL.md) | From zero: facts with their sources, the competition read through its users, the fact that changes the conversation, and a one sentence thesis. |
| [kero-scope](skills/kero-scope/SKILL.md) | The list of what the product does: code, feature, what it does. No phases, no owners, every feature traced to the thesis. |
| [kero-system](skills/kero-system/SKILL.md) | Turns a design.md, tokens or a running codebase into a design skill that lives in the project and overrules the code. |
| [kero-audit](skills/kero-audit/SKILL.md) | Measures rendered screens in Chrome: contrast on the painted color, text size, hit areas, keyboard focus, reduced motion, headings, icons, zoom, overflow and console errors. A screenshot per screen and an exit code for CI. |
| [kero-blind](skills/kero-blind/SKILL.md) | A local page to compare two sets of designs side by side, shuffled, with one line of why per vote. |
| [kero-orchestrate](skills/kero-orchestrate/SKILL.md) | Whether to split work across agents and how: self contained briefs, isolation, review with evidence. Optional delegation to native sub agents, Orca, Cursor, Codex, Grok and image or video tools. |

## Install

```bash
npx skills add uxKero/kero-stack
```

Or copy the folders inside `skills` where your agent reads skills, then restart it.

| Agent | Personal | Per project |
|:--|:--|:--|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Codex | `~/.agents/skills/` | `.agents/skills/` |
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` |

`kero-audit` runs in any browser tool that can evaluate JavaScript (Claude in Chrome, Chrome DevTools, agent-browser, the console) by injecting `scripts/checks.js`. With Playwright in the project it also walks keyboard focus, forces hover and focus states, checks reduced motion and takes screenshots:

```bash
npm i -D playwright-core
```

## The rest of the stack

The method calls these at the step where each one fits. Install the ones you need.

| Skill | Step | Install |
|:--|:--|:--|
| [anydesign](https://github.com/uxKero/anydesign) | Turns a screenshot, a website or a Figma file into a design.md with tokens and components. | `npx skills add uxKero/anydesign` |
| [BADESIGN](https://github.com/uxKero/badesign-skill) | Design judgment: composition, type, color, states, motion and the habits of generated interfaces. | `npx skills add uxKero/badesign-skill` |
| [Emil Kowalski's skills](https://github.com/emilkowalski/skills) | Motion and interaction craft from Vercel and Linear: building, reviewing and improving animations, native feel on phones, and picking the right UI library. By [@emilkowalski](https://x.com/emilkowalski). | `npx skills add emilkowalski/skills` |
| [typebien](https://github.com/uxKero/typebien) | Landing page copy that reads like a person wrote it. | `npx skills add uxKero/typebien` |
| [SAGA](https://github.com/uxKero/optimize-search-answers-agents) | Decides what has to be true and findable about the product before the page says it. | `npx skills add uxKero/optimize-search-answers-agents` |

## Use it

Tell your agent what you are making. From zero:

```text
I want to build an app for the shopping mall in my city. Start with the research.
```

Or bring your references for a redesign:

```text
Redesign the pricing page. Here are three references I like: <links or screenshots>.
```

Or build from a single reference:

```text
Build our landing from this Figma file: <link>.
```

<br>

<div align="center">

Made by [@uxKero](https://x.com/uxKero) under the [MIT License](LICENSE).

</div>
