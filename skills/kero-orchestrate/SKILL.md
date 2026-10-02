---
name: kero-orchestrate
description: Decide whether to split work across agents and, when it pays, how. Use before delegating anything, when a task is large enough to parallelize, when running sub agents, Orca workers or other tools (Cursor, Codex, Grok, Gemini, image and video generators), and when integrating what they return. Delegation is always optional; the default is one agent doing the work well.
---

# Kero orchestrate

One agent doing the work well is the default. Splitting is a tool for when it measurably helps: independent pieces, output too large for one context, or a tool that does one thing much better. Every split costs tokens, latency and a merge, and parallel agents make implicit decisions that can collide.

## Decide first

- **Do it directly** when the change is small, when there is back and forth with the person, when every piece needs the same heavy context, or when latency matters. Delegating a five minute task costs more than doing it.
- **Split** when pieces are independent (no shared files or state, fixing one does not fix another), when research would flood the main context, or when a specialist tool clearly wins.
- **Scale effort to the task**: a single agent with a few calls for a fact, two to four workers for a comparison, more only for wide research or many independent files. A multi agent run uses many times the tokens of one agent.

## The brief

Every brief is self contained; the worker has none of this conversation. It names:

- **Goal and why**, in two lines.
- **Scope**: the files or areas it owns, and what it must not touch.
- **The project skill** and the rules that apply, by path.
- **Acceptance**: an observable check (a test, a command output, a screenshot, an audit run) and what counts as done.
- **Return**: the exact shape of the report, short, with paths to artifacts instead of their content, ending in one status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT` or `BLOCKED`.

Constraints are stated in the negative when they matter ("do not raise timeouts", "do not change the public API").

## Running workers

- **Launch every independent worker at once**, then wait. Waiting between launches serializes work that was meant to be parallel.
- **Isolate writers.** Two workers never edit the same checkout: use worktrees (`isolation: worktree` in Claude Code, `cursor-agent -w`, Orca `--worktree`) or split by file ownership.
- **Pick the model on purpose.** A fast, cheap model for mechanical or high volume work; the most capable one for design, judgment and final review. After the run, check which model actually ran.
- **Long work is launched and checked apart.** Never block a session waiting inside the command that does the work. A timeout or an empty wait is a checkpoint, not a failure; only positive proof that a process ended justifies stopping or retrying it.
- **Keep a progress file** for runs longer than one sitting, so a compacted context can resume instead of restarting.

## Receiving work

- **Do not trust the summary.** Read the diff, open the artifact, run the acceptance check. "Done" from a worker is a claim, not evidence.
- **Review in a fresh context**: first against the brief (did it do what was asked, only that), then for quality. Flag only what affects correctness or the requirements.
- **After merging parallel work, run the whole check again.** Two correct pieces can be wrong together.
- **On failure, resume before restarting.** Retry the same worker once or twice with the missing context; after that, hand it to a fresh worker with a more capable model.
- The coordinator does not quietly fix a worker's output. It sends the correction back or does it openly and says so.

## Who to delegate to

Use what is installed and allowed; skip the rest without stopping. Before calling an external tool, check it exists (`--help` or `--version`). Anything that spends money, acts on real accounts or opens windows on the person's machine is confirmed with them first.

| Need | First choice | Optional |
|:--|:--|:--|
| Parallel research or code inside the session | Native sub agents: Claude Code (`.claude/agents/*.md`), Codex (`.codex/agents/*.toml`), Cursor (`.cursor/agents/*.md`) | |
| Parallel workers, each in its own worktree, supervised from one place; task graphs, decision gates | Orca, the workspace this stack is built in. Check `orca status`; then load `orca skills get orchestration` for supervised runs, or `orca skills get orca-cli` to hand a task to an agent in its own worktree. Install the skills with `orca skills install --skill orchestration --skill orca-cli`. Without Orca, native sub agents with worktrees | |
| Independent coding in its own worktree | | Cursor CLI: `cursor-agent -p --output-format json -w <name> "<brief>"`; Cursor cloud agents through its API for work that ends in a PR |
| A second opinion or a different model on code | | `codex exec "<brief>" -C <dir> --json` (GPT-6 Astra and GPT-5.x where available); `grok -p "<brief>" --output-format json`; `gemini -p "<brief>" --output-format json` |
| Images | | OpenAI Images API (`gpt-image-2.5-*`); Higgsfield CLI (`higgsfield generate create <model> --prompt ... --wait --json`, check `generate cost` first) |
| Video | | Higgsfield CLI |
| Errands on real accounts (forms, returns, bookings) | | Grok Bot. It has no API: write the task as one clear message for the person to give it. Never let it pay without the person's confirmation |

Flags change between releases; when a command fails, read its `--help` before guessing. External agents get the same brief, the same isolation and the same review as native ones.

## Never

- Delegate to avoid reading the code. The coordinator understands the change it is splitting.
- Leave a worker undecided at the end: reuse it, keep it with a reason, or release it.
- Make the person a messenger between agents. If a handoff is needed, measure the risk; when there is none, do it and say what was touched.
- Report a parallel run as faster or better without the numbers to show it.
