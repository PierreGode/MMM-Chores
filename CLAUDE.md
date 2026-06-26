# MMM-Chores — CLAUDE.md

## Docs

Detailed reference lives in `.claude/docs/`. Load the relevant file(s) before starting work:

| File | Load when working on… |
|---|---|
| [`.claude/docs/architecture.md`](.claude/docs/architecture.md) | File layout, data model, socket notifications, REST API |
| [`.claude/docs/implementation.md`](.claude/docs/implementation.md) | Locking, timers, atomic writes, auth, coin/leveling system |
| [`.claude/docs/config.md`](.claude/docs/config.md) | `config.js` options, voice assistant setup |
| [`.claude/docs/conventions.md`](.claude/docs/conventions.md) | JSDoc skeleton & field reference, dependencies, test notes |

## Always-On Rules

### Never call the REST API directly from the frontend module
`MMM-Chores.js` runs in the browser and has no access to `this.internalToken`. Any `fetch()` from the frontend fails silently with 403 on authenticated installs. All write operations from the mirror **must** go through a socket notification handled by `node_helper.js`. See `USER_TOGGLE_CHORE` → `handleUserToggle` as the canonical example.

### JSDoc all non-trivial functions
Document new functions — and existing functions you investigate — with a JSDoc block directly above `function`. Skip trivial one-liners and anonymous callbacks. For the required fields, optional sections, and a copy-paste skeleton, see [`.claude/docs/conventions.md`](.claude/docs/conventions.md).

### Self-document changes
When you discover, add, or change something material, update the relevant `.claude/docs/` file so the next session starts with accurate context:

- New socket notification → row in `architecture.md`
- New REST endpoint → row in `architecture.md`
- New config option → entry in `config.md`
- New critical invariant or gotcha → entry in `implementation.md`
- New dependency → entry in `conventions.md`
- New data model field → update Task object in `architecture.md`
- New timer → row in timers table in `implementation.md`

Keep additions concise — one row or bullet per item. Do not rewrite sections wholesale unless the existing content is wrong.
