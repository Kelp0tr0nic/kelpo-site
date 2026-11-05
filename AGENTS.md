# AGENTS.md

Instructions for AI agents working in this repo. `docs/SPEC.md` defines what to build. This file defines how to work.

## Start of every task

1. Read sections 1 to 5 of `docs/SPEC.md`, the current milestone in section 7, and the requirements assigned to you.
2. Work only on assigned requirement IDs or M0 items. If neither was assigned, ask before starting.
3. Run `git status`. If there are changes you didn't make, stop and ask.
4. Create a branch from an up-to-date `main`.

If memory or an earlier summary conflicts with the repo, the repo wins.

## Git workflow

- Never commit directly to `main`, force-push, or bypass hooks or CI.
- Use one branch and one PR per batch: `feat/<requirement-ids>-<short-name>`.
- Use `spike/m0-<topic>` for M0 work. Spike code is not merged. Keep the spike branch, and open a separate PR containing only `docs/spikes/m0-<topic>.md` and any proposed changes to `docs/SPEC.md`.
- Open the PR, then report CI status. **Never merge it.**
- Do not change a decision in section 4 of the spec unless the owner asked you to or M0 findings require it. Explain any such change in the PR.

## Rules for changes

- Make the smallest change that satisfies the requirement. Do not refactor unrelated code.
- Follow the dependency direction in section 3 of the spec.
- Check the official docs for the installed version before using a library API.
- Ask before adding a production dependency the spec does not name.
- Do not weaken, skip, or delete a test or check to make it pass.
- Never edit a migration that has been merged. Add a new one.
- Keep graphics libraries out of non-lab bundles and editor code out of public pages.

## Commands

The repo is not scaffolded yet. When a task adds or changes a script, list the exact command here in the same PR.

| Purpose | Command |
|---|---|
| Start locally | TBD |
| Type check | TBD |
| Lint and format | TBD |
| Test | TBD |
| Build | TBD |

## Definition of done

A requirement is done only when all of these are true:

- Its behavior has been verified by running it, and tests cover it where practical.
- All checks available in the repo pass.
- `docs/SPEC.md` is updated in the same PR: checkbox, header if needed, and a changelog row saying how it was verified.
- The PR lists the requirement IDs, what changed, how it was verified, and anything left undone.

Use `[~]` if work is partial. Never mark `[x]` based on code that has not been run. For visual requirements, attach screenshots and leave the final judgment to the owner.

## Stop and ask

Stop and report if:

- A requirement is ambiguous or conflicts with the spec.
- The same failure survives two different attempts at a fix.
- The task needs credentials, payment, or an account you don't have.
- A change would delete data or touch anything outside this repo.

Report what you tried and what you need. Do not work around the problem or describe unperformed work as done.

## Secrets and production

- Never read, print, or commit secrets. Only `.env.example` belongs in git.
- Do not access production servers, databases, or storage. Only CI deploys.
- Use local or test services for all development and testing.

These tasks belong to the owner:

- Buying the domain and hosting, and changing DNS
- Creating production credentials
- Creating the owner account and registering passkeys
- Choosing the visual direction of a theme
- Reviewing and merging PRs

## Subagents

Use subagents for research, code review, and investigation. Implementation should happen one task at a time unless each agent has its own git worktree. Check a subagent's reported results yourself before relying on them.

## Final report

End each task with:

- The PR link and CI status
- Requirement IDs completed and left incomplete
- How the work was verified
- Any decisions or actions needed from the owner
