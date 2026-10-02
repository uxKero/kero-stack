---
name: kero-blind
description: Let a person judge two sets of designs side by side without knowing which is which. Use when choosing between two approaches, two models, two prompts or two versions of a skill, and whenever an agent is tempted to grade its own work.
---

# Kero blind

The agent that made a design is the worst judge of it, and a scoring model rewards what is easy to score. The person decides, without knowing which side is which, and writes one line about why.

## Prepare the sets

- Two folders, one per condition, with the same file name for the same brief: `a/checkout.html` and `b/checkout.html`. HTML, images and video are supported.
- Name the folders after the condition (`with-skill`, `baseline`). The names are only shown at the reveal.
- Optional: a folder of briefs with `checkout.md` next to each name, shown above the pair.
- Same brief, same viewport, same model settings on both sides. Change one thing only, or the vote measures nothing.
- Briefs used to tune a skill are not used to validate it. Keep a fresh set for the final vote.

## Run it

```bash
node <skill-dir>/scripts/blind.mjs with-skill baseline --briefs briefs --viewport 1440x900
```

It opens on `http://localhost:4747`. Sides are shuffled per pair and pairs are shuffled in order. Keys: 1 for A, 2 for a tie, 3 for B, arrows to move. Votes are saved on every click to `kero-blind.json` in the folder the command runs from, so the session can be closed and resumed; run `--reveal` from that same folder. The totals only appear once every pair is voted.

```bash
node <skill-dir>/scripts/blind.mjs --reveal
```

Prints the totals per folder and every note with the side it went to.

## Reading the votes

- The notes matter more than the count. Turn each recurring note into a general principle with its reason, never into a literal rule copied into a skill.
- A win that comes only from the other side failing badly (broken layout, unreadable text) is a floor, not a quality gain. Look at what won the close pairs.
- A tie is a result. Two ties in a row on the same brief mean the change did not matter there.
- Never tell the person which side was which before they finish.
