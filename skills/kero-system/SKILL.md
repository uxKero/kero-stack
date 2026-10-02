---
name: kero-system
description: Turn a design.md, a set of tokens or an existing codebase into a design skill that lives inside the project and governs every screen. Use when a project gets its visual system, when the system changes, or when a design document has drifted from the code.
---

# Kero system

The design system of a project is a skill, not a document. It sits in the project, the agent finds it on its own, and it overrules the code: when a screen disagrees with it, the screen is fixed.

## Where it lives

- In the project skills folder of the agent in use: `.claude/skills/<project>-design/SKILL.md` for Claude Code, where `<project>` is the short name of the project in lowercase, `.agents/skills/` for Codex, `.cursor/skills/` for Cursor. When several agents share the project, keep one real copy; tools that turn links into silent copies leave two files that drift apart.
- The description names every trigger: touching any screen, component or token, choosing color, type, spacing, icons, motion, focus or states, and before a screen is called finished.
- An old `DESIGN.md` stays only as history, with a first line that says it is no longer the source.

## Where the values come from

- **From the code that is running**: the global stylesheet, the theme, the layout and the base components. Describe what exists, not what was intended.
- From the `design.md` and tokens of the reference when the code does not exist yet. Write down which values are still unconfirmed.
- Screens ask for roles, never for colors. When the palette lives in variables, trying a new one costs one file.

## Sections

Use the ones the project needs, in this order. Each rule carries its reason in one line.

1. **What the product is on screen.** The surfaces it has, who uses each one and in what conditions.
2. **The brand.** The one gesture that belongs only to this product, and where it is allowed to appear.
3. **Color.** Roles, the measured rule for text on each surface, where color goes and where it never goes.
4. **Type and numbers.** Faces, scale, weights, the face that carries figures (every digit distinct, tabular where values are compared) and the maximum width of running text.
5. **Space, shape and depth.** The spacing scale, the radius scale with the nesting rule (inner radius is the outer one minus the inset), and the elevation tokens, all lit from one direction.
6. **Images, icons and marks.** One icon set, sizes that follow the text beside them, how third party logos and photos sit.
7. **Navigation.** What stays, what collapses, where the primary action lives on each device.
8. **Motion.** What moves, how long, with which curve, and what happens under reduced motion.
9. **Focus, keyboard and touch.** The focus style per surface (text fields show their caret), hit areas, zoom left free.
10. **States.** Loading, empty, sparse, dense and error for every view that loads data.
11. **Writing.** Register, language, units, what the interface never says about itself.
12. **Automatic rejection.** What the person has rejected on sight, each with the reason they gave.
13. **Project traps.** Bugs and false readings already paid for, so nobody pays twice.
14. **Open decisions.** What the person has not decided yet. An agent does not decide these.
15. **Before saying it is done.** A short list of questions that the audit cannot answer.

## Keeping it true

- Every correction from the person becomes a rule in section 12 or 13, written as a principle with its reason, not as a quote.
- A rule that can be measured also goes into `kero-audit.json` (spacing scale, line length, minimum text, icon sizes), so it stops depending on someone reading it.
- When the code and the skill disagree and the code is right, the skill is updated in the same change.
- Long is fine for a project skill, because it holds facts about one product. General craft stays in `badesign-skill`.
