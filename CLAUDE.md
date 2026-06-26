# MMM-Chores — CLAUDE.md

## Module Overview

MMM-Chores is a MagicMirror² module for household chore tracking. It consists of:
- A **frontend module** (`MMM-Chores.js`) rendered on the mirror
- A **backend worker** (`node_helper.js`) running an Express server
- A **web admin portal** (`public/admin.html` + `public/admin.js`) accessible via browser

## Architecture

```
MagicMirror Core
    ↕ Socket Notifications
MMM-Chores.js (frontend)
    ↕ Socket Notifications
node_helper.js (backend, port 5003 HTTP / 5004 HTTPS)
    ↕ REST API
public/admin.html + admin.js (admin portal)
    ↓ atomic writes
data.json + rewards.json (persistence)
```

## Key Files

| File | Purpose |
|---|---|
| `MMM-Chores.js` | Frontend: DOM rendering, socket handling, voice UI, analytics charts |
| `node_helper.js` | Backend: Express server, all business logic, data persistence, AI integration |
| `public/admin.html` | Admin portal HTML (Bootstrap 5) |
| `public/admin.js` | Admin portal JS (~158 KB) — all CRUD, settings, rewards UI |
| `public/admin.css` | Admin portal styling, light/dark theme |
| `public/lang.js` | i18n strings for 10 languages (en, sv, es, fr, de, it, nl, pl, zh, ar) |
| `MMM-Chores.css` | Mirror display styling |
| `data.json` | Runtime persistence: tasks, people, analyticsBoards, settings |
| `rewards.json` | Runtime persistence: coin system state (rewards, redemptions, peopleCoins) |
| `generate_certs.sh` | Generates self-signed SSL certs (required for voice assistant) |

## Data Model

### Task object (`data.json → tasks[]`)
```json
{
  "id": 1718784000000,
  "name": "Clean Kitchen",
  "date": "2026-06-20",
  "assignedTo": 123,
  "recurring": "weekly",
  "points": 5,
  "autoPointsRule": "Clean",
  "done": false,
  "created": "2026-06-19T10:30:00",
  "finished": null,
  "finishedShort": null,
  "order": 0,
  "deleted": false,
  "seriesId": "1718784000000",
  "seriesAnchor": 5
}
```

### Recurring task values
`none`, `daily`, `weekly`, `weekdays`, `weekends`, `monthly`, `yearly`, `every_X_days_Y`, `every_X_weeks_Y`, `first_monday_month`

## Communication Patterns

### Frontend → Backend (socket `sendSocketNotification`)
| Notification | Payload | Description |
|---|---|---|
| `INIT_SERVER` | config | Module startup, passes full config |
| `USER_TOGGLE_CHORE` | `{id, done}` | Task checkbox toggled on mirror |
| `VOICE_COMMAND` | `{transcript, context}` | Voice input for AI processing |

### Backend → Frontend (socket `sendSocketNotification`)
| Notification | Description |
|---|---|
| `CHORES_DATA` | Filtered tasks for mirror display |
| `TASKS_UPDATE` | Full tasks array (for analytics) |
| `PEOPLE_UPDATE` | People with levels/points |
| `SETTINGS_UPDATE` | Settings changed |
| `LEVEL_INFO` | Current leveling state |
| `ANALYTICS_UPDATE` | Selected board types |
| `REDEMPTIONS_UPDATE` | Pending coin redemptions |
| `VOICE_RESPONSE` | AI response text + action + audio |

### Admin Portal ↔ Backend (REST on port 5003)
- Tasks: `GET/POST/PUT/DELETE /api/tasks`, `PUT /api/tasks/reorder`
- People: `GET/POST/DELETE /api/people`
- Rewards: `GET/POST/PUT/DELETE /api/rewards`
- Redemptions: `GET/POST /api/redemptions`, `PUT /api/redemptions/:id/use`
- Settings: `GET/PUT /api/settings`
- Analytics: `GET/POST /api/analyticsBoards`
- AI: `POST /api/ai-chat`, `POST /api/ai-generate`
- Auth: `POST /api/login`, `GET /api/login`, `POST /api/logout`

## Critical Implementation Details

### Recurring task generation — locking pattern
`broadcastTasks()` calls `ensureRecurringInstancesUpToToday()` wrapped in a Promise-based lock (`withRecurringTaskLock()`). This prevents duplicate instance creation since `broadcastTasks()` is called from 16+ code paths concurrently. **Never call `createRecurringInstanceFromTask()` outside the lock.**

### Scheduled timers

Three self-rescheduling daily timers run in `node_helper.js`. Each computes the delay to the next target wall-clock time, sets a `setTimeout`, and reschedules itself from inside the callback.

| Function | Time | Purpose |
|---|---|---|
| `scheduleAutoUpdate()` | 04:00 | `git pull` if `settings.autoUpdate` is true |
| `scheduleReminder(self)` | `settings.reminderTime` | Pushover notification for unfinished tasks |
| `scheduleMidnightBroadcast(self)` | 00:01 | `broadcastTasks()` so recurring instances are created at day rollover without user interaction |

All three are started from the module `start()` method and re-registered on `INIT_SERVER` (mirror reload). Timer handles are stored in module-level `let` vars (`autoUpdateTimer`, `reminderTimer`, `midnightBroadcastTimer`) so they can be cleared before rescheduling.

### Atomic file writes
All saves go through `writeDataFileAtomic()`:
1. Write to temp file with random suffix
2. `fsync()` to flush
3. Atomic rename to `data.json`

Load fallback: if `data.json` is corrupt, falls back to `data.json.bak`.

### Coin system vs leveling system
These are mutually exclusive display modes (`usePointSystem` config flag). Both persist independently — coin data lives in `rewards.json`, level data is computed from task history in `data.json`. Points are awarded via `awardPointsForTask()` and revoked via `revokePointsForTask()` (stores `awardedPoints` on the task for accurate revocation).

### Task completion creating next recurring instance
When a recurring task is marked done, `node_helper.js` creates the NEXT instance only if its date is in the future. This happens inside `PUT /api/tasks/:id`, **not** in `ensureRecurringInstancesUpToToday()`.

### Never call the REST API directly from the frontend module
`MMM-Chores.js` runs in the browser and has no access to `this.internalToken`, the server-side auth token that `node_helper.js` attaches to its own HTTP requests when `login` is enabled. Any `fetch()` call from the frontend will fail with 403 on authenticated installs — silently, since the mirror never shows API errors.

**Rule:** all write operations from the mirror must go through a socket notification handled by `node_helper.js`. See `USER_TOGGLE_CHORE` → `handleUserToggle` as the canonical example. The handler builds the request body, attaches `x-auth-token` when needed, and calls the REST API via `fetchFn`. The resulting `broadcastTasks()` call at the end of the PUT handler refreshes all clients automatically.

### Unassigned tasks on mirror
Controlled by `showUnassignedOnMirror` (default `false`). When `true`, tasks with no `assignedTo` value are included in the mirror display regardless of `groupPerUserOnMirror`. Each unassigned task renders a touch-friendly `<select class="assign-select">` dropdown (right-aligned inside the flex list item). On selection, `assignTask()` calls `PUT /api/tasks/:id`. For recurring tasks, the PUT body also sets `recurring: "none"` and `seriesId: null` so only that instance is detached from the series — future instances remain unassigned. The setting is persisted in `data.json` via the admin portal settings save flow (`admin.js` → `PUT /api/settings` → `node_helper.js` settings merge).

### Authentication
Token-based, in-memory sessions (24-hour TTL). Three permission levels:
- `write` — full admin access
- `read` — view only
- `regular` — sees only own tasks and own settings
- `screen` — fullscreen display mode

Per-user settings stored as `{username}.json` files and merged with global settings at request time.

## Configuration (MagicMirror `config.js`)

Key options with defaults:

```javascript
{
  updateInterval: 60000,      // ms between DOM refreshes
  adminPort: 5003,            // HTTP admin port (5004 for HTTPS)
  showDays: 1,                // days ahead to show
  showPast: false,            // show overdue incomplete tasks
  groupPerUserOnMirror: false, // group tasks by assignee
  showUnassignedOnMirror: false, // show tasks with no assignee; adds inline assign dropdown per task
  showAnalyticsOnMirror: false,
  leveling: { enabled: true, mode: "years", yearsToMaxLevel: 3 },
  usePointSystem: false,      // coin system (mutually exclusive with leveling)
  login: false,               // enable auth
  settings: "locked",         // locked | unlocked | "000000" (PIN)
  useAI: true,
  openaiApiKey: "sk-...",
  voiceAssistant: { enabled: false },
  autoUpdate: false,          // git pull daily at 04:00
  language: "en"
}
```

## Dependencies

**npm** (see `package.json`):
- `express` 4.18.2
- `body-parser` 1.20.1
- `openai` 5.0.1

**CDN** (loaded in `admin.html`):
- Bootstrap 5.3.0
- Bootstrap Icons 1.10.5
- Chart.js 4.3.0

**Node.js built-ins**: `fs`, `path`, `https`, `child_process`

## No Automated Tests

There is no test suite. The `postinstall` script only creates an initial `data.json`. Data integrity relies on atomic writes and backup files, not tests.

## Function Documentation Conventions

New functions (and existing functions investigated during a session) should be documented with JSDoc-style block comments (`/** ... */`) directly above the `function` keyword. The codebase follows this pattern consistently for all non-trivial functions.

### Required fields

| Field | Format | Purpose |
|---|---|---|
| One-line description | First line after `/**` | What the function does |
| Extended description | Paragraph(s) after the one-liner | Why it exists, when to use it, context |
| `@param` | `@param {Type} name - description` | Each parameter |
| `@returns` | `@returns {Type} - description` | Return value |
| Usage example | Indented code block | Show correct (and incorrect) call patterns |

### Optional but encouraged

- **Algorithm** block: step-by-step walkthrough for complex logic
- **CAPS warnings**: e.g. `MUST ONLY be called within withRecurringTaskLock()`
- **Side Effects** section: list global state mutations (e.g. `tasks.push(...)`, `saveData()`)
- **Callers** section: list every call site for functions with strict calling constraints

### Example skeleton

```javascript
/**
 * functionName(param1, param2)
 *
 * One-line summary of what it does.
 *
 * Extended explanation: why it exists, invariants it maintains, constraints.
 *
 * @param {String} param1 - description
 * @param {Object} param2 - description
 * @returns {Boolean} - description
 *
 * Example:
 *   // WRONG:
 *   functionName(x, y);
 *
 *   // RIGHT:
 *   await withRecurringTaskLock(() => functionName(x, y));
 */
function functionName(param1, param2) {
```

### When to document

- **Always**: any new function added during a session
- **Opportunistically**: any existing function investigated during a session that lacks a doc block
- Do NOT add doc blocks to trivial one-liners or anonymous callbacks

## Voice Assistant Setup

Requires HTTPS (browser security requirement for microphone access):
1. Run `generate_certs.sh` to create `certs/server.key` and `certs/server.crt`
2. Set `adminPort` to 5004 in config
3. Enable `voiceAssistant.enabled: true`
4. Requires a valid `openaiApiKey` for GPT intent parsing and TTS

## Common Gotchas

- `broadcastTasks()` saves data — calling it without the lock causes duplicate recurring tasks
- Recurring task instances for the current day are created at 00:01 by `scheduleMidnightBroadcast()` — no user interaction required. Before this timer was added, instances only appeared after the first user action post-midnight
- The admin portal polls no endpoint on its own; it relies on socket notifications pushed from backend after any change
- `seriesAnchor` controls drag sort order for all instances in a recurring series — changing order on one instance changes all
- `showDays: 1` only shows today; overdue tasks only appear if `showPast: true`
- Analytics DOM updates come via socket, not the `updateInterval` timer (to avoid flickering)
