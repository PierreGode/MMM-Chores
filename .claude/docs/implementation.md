---
description: Critical implementation details — locking, timers, atomic writes, coin system, auth, frontend API rule
---

# Implementation Details

## Recurring Task Generation — Locking Pattern

`broadcastTasks()` calls `ensureRecurringInstancesUpToToday()` wrapped in a Promise-based lock (`withRecurringTaskLock()`). This prevents duplicate instance creation since `broadcastTasks()` is called from 16+ code paths concurrently.

**MUST ONLY call `createRecurringInstanceFromTask()` inside the lock.**

## Scheduled Timers

Three self-rescheduling daily timers run in `node_helper.js`. Each computes the delay to the next target wall-clock time, sets a `setTimeout`, and reschedules itself from inside the callback.

| Function | Time | Purpose |
|---|---|---|
| `scheduleAutoUpdate()` | 04:00 | `git pull` if `settings.autoUpdate` is true |
| `scheduleReminder(self)` | `settings.reminderTime` | Pushover notification for unfinished tasks |
| `scheduleMidnightBroadcast(self)` | 00:01 | `broadcastTasks()` so recurring instances are created at day rollover |

All three are started from `start()` and re-registered on `INIT_SERVER` (mirror reload). Timer handles are stored in module-level `let` vars (`autoUpdateTimer`, `reminderTimer`, `midnightBroadcastTimer`) so they can be cleared before rescheduling.

## Atomic File Writes

All saves go through `writeDataFileAtomic()`:
1. Write to temp file with random suffix
2. `fsync()` to flush
3. Atomic rename to `data.json`

Load fallback: if `data.json` is corrupt, falls back to `data.json.bak`.

## Coin System vs Leveling System

Mutually exclusive display modes (`usePointSystem` config flag). Both persist independently — coin data lives in `rewards.json`, level data is computed from task history in `data.json`. Points are awarded via `awardPointsForTask()` and revoked via `revokePointsForTask()` (stores `awardedPoints` on the task for accurate revocation).

## Task Completion Creating Next Recurring Instance

When a recurring task is marked done, `node_helper.js` creates the NEXT instance only if its date is in the future. This happens inside `PUT /api/tasks/:id`, **not** in `ensureRecurringInstancesUpToToday()`.

## Never Call the REST API Directly from the Frontend Module

`MMM-Chores.js` runs in the browser and has no access to `this.internalToken` — the server-side auth token that `node_helper.js` attaches to its own HTTP requests when `login` is enabled. Any `fetch()` call from the frontend will fail with 403 on authenticated installs, silently (the mirror never shows API errors).

**Rule:** all write operations from the mirror must go through a socket notification handled by `node_helper.js`. See `USER_TOGGLE_CHORE` → `handleUserToggle` as the canonical example. The handler builds the request body, attaches `x-auth-token` when needed, and calls the REST API via `fetchFn`. The resulting `broadcastTasks()` call at the end of the PUT handler refreshes all clients automatically.

## Unassigned Tasks on Mirror

Controlled by `showUnassignedOnMirror` (default `false`). When `true`, tasks with no `assignedTo` are included regardless of `groupPerUserOnMirror`. Each unassigned task renders a touch-friendly `<select class="assign-select">` dropdown. On selection, `assignTask()` calls `PUT /api/tasks/:id`. For recurring tasks, the PUT body also sets `recurring: "none"` and `seriesId: null` so only that instance is detached — future instances remain unassigned.

## Authentication

Token-based, in-memory sessions (24-hour TTL). Four permission levels:
- `write` — full admin access
- `read` — view only
- `regular` — sees only own tasks and own settings
- `screen` — fullscreen display mode

Per-user settings stored as `{username}.json` files and merged with global settings at request time.

## Common Gotchas

- `broadcastTasks()` saves data — calling it without the lock causes duplicate recurring tasks
- Recurring task instances for the current day are created at 00:01 by `scheduleMidnightBroadcast()` — no user interaction required
- The admin portal polls no endpoint on its own; it relies on socket notifications pushed from backend after any change
- `seriesAnchor` controls drag sort order for all instances in a recurring series — changing order on one instance changes all
- `showDays: 1` only shows today; overdue tasks only appear if `showPast: true`
- Analytics DOM updates come via socket, not the `updateInterval` timer (to avoid flickering)
