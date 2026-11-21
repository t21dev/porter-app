# Agent instructions

## Build artifact cleanup (disk space)

Rust/Tauri build output in this repo grows into tens of GB and Cargo never prunes it.
Clean it up **only once testing is done**. Never clean up partway through a task.

### When to clean up
Run the cleanup **only when all of these are true**:
1. The task's work is finished. No more code changes are planned in this session.
2. The relevant tests/builds have run and **passed**. If anything is failing, leave the
   artifacts in place: they are needed to debug and rebuilding them takes many minutes.
3. The user hasn't asked for a build output they still need to collect, such as an installer
   or bundle under `target/release/bundle`. If one exists, ask before deleting it.

Do **not** clean up between iterations, after a single test run, or "just to be tidy".
Rebuilding from scratch is slow.

### How to clean up
First stop any running `tauri dev` / `cargo` / app processes, because Windows locks files in use. Then:

```powershell
cargo clean --manifest-path src-tauri/Cargo.toml
```

Agent worktrees under `.claude/worktrees/`: once their work is merged, run `git -C <worktree> status`.
If it shows no uncommitted changes, run `git worktree remove <path>`. Never force-remove a worktree that has uncommitted changes.

Afterwards, tell the user what was removed and roughly how much space was freed.

## Design

Every UI change follows [DESIGN.md](DESIGN.md): its colour tokens, type
scale, spacing, components and motion. Colours come only from the tokens,
never raw hex or hsl in components. Reuse a pattern listed under Components
before writing a new one, and check new UI in every theme the app has.

If a change needs something DESIGN.md does not cover, add it to DESIGN.md in
the same change, so the two never disagree.

## Commits

Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
