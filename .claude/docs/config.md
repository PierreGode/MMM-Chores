---
description: MagicMirror config.js options, defaults, and voice assistant setup
---

# Configuration

## How settings work

Settings come from two places, merged at startup:

1. **`config.js`** — static options that require a MagicMirror restart to change. Required for things the server needs at boot (ports, API keys, auth).
2. **Admin Settings modal** — runtime settings persisted in `data.json` (`settings` object). When the admin saves settings, `node_helper.js` merges them into the live `settings` object, calls `saveData()`, and sends `SETTINGS_UPDATE` to the mirror frontend via socket notification. No restart needed.

When both sources define the same key, the **admin-saved value wins** at runtime (it's merged on top via `Object.assign` in the `SETTINGS_UPDATE` handler in `MMM-Chores.js`).

---

## MagicMirror `config.js` Options

Only a small set of options must be set here — things needed at server boot or that require secrets.

```javascript
{
  // Required / boot-time only
  adminPort: 5003,            // HTTP admin port (5004 for HTTPS)
  login: false,               // enable auth
  settings: "locked",         // "locked" | "unlocked" | "000000" (6-digit PIN)
  openaiApiKey: "sk-...",     // required for AI features
  pushoverApiKey: "...",      // required for Pushover notifications
  pushoverUser: "...",        // required for Pushover notifications
  language: "en",

  // Optional / also settable from admin UI
  updateInterval: 60000,      // ms between DOM refreshes
  showDays: 1,                // days ahead to show on mirror

  // User auth (only when login: true)
  users: [
    { username: "admin", password: "secret", permission: "write" },
    { username: "viewer", password: "viewer", permission: "read" },
    { username: "steve", password: "", permission: "regular" }  // empty = no password
  ],

  // Global level titles — set here to seed data.json on first boot.
  // The "Configure Level Titles" modal in admin has no save wiring, so config.js is the
  // only way to set these. Once seeded into data.json, the stored value takes priority.
  levelTitles: ["Junior", "Apprentice", "Journeyman", ...],  // 10 strings, one per 10-level band

  // Per-person overrides — also editable from admin (People → gift icon → Edit Rewards).
  // Admin-saved values are stored in data.json and win over config.js on next boot.
  customLevelTitles: { "PersonName": ["title1", ...] }
}
```

---

## Admin-Only Settings (persisted in `data.json`)

Configurable from the admin portal Settings modal. Stored in `data.json`, do not need to appear in `config.js`. Defaults shown.

### Display Settings

| Key | Default | Description |
|---|---|---|
| `showPast` | `false` | Show overdue incomplete tasks on mirror |
| `showAnalyticsOnMirror` | `false` | Show analytics charts on mirror |
| `groupPerUserOnMirror` | `false` | Group tasks by assignee on mirror |
| `showUnassignedOnMirror` | `false` | Show tasks with no assignee on mirror; adds inline assign dropdown |
| `showDeleteOnMirror` | `false` | Show delete button on mirror for past assigned incomplete tasks |
| `showLevelOnMirror` | `true` | Show level badge next to assignee name on mirror |
| `showCoinsOnMirror` | `true` | Show coin balance next to assignee when coin system is active |
| `showRewardsOnMirror` | `false` | Show rewards catalogue (name + cost) at top of mirror |
| `showRedeemedRewards` | `true` | Show redeemed rewards on mirror above chores (coin system only) |
| `showRewardsTab` | `true` | Show Rewards tab in admin dashboard |
| `textMirrorSize` | `"small"` | Mirror text size: `"small"` / `"medium"` / `"large"` |
| `dateFormatting` | `""` | Date format on mirror: `""` (none) / `"yyyy-mm-dd"` / `"mm-dd"` / `"mm-dd-yyyy"` / `"dd"` |
| `background` | `"forest.png"` | Background image: `""` (none) / `"forest.png"` / `"winter.png"` / `"summer.png"` / `"spring.png"` |

### Reward System

| Key | Default | Description |
|---|---|---|
| `useCoinSystem` | `false` | Use coin-based reward system instead of leveling |
| `levelingEnabled` | `true` | Enable level badges (only relevant when not using coin system) |
| `leveling.mode` | `"years"` | Leveling mode: `"years"` or `"chores"` |
| `leveling.yearsToMaxLevel` | `3` | Years to reach max level (years mode) |

Switching between level and coin systems is non-destructive. `migrateToLevelSystem()` preserves all coin balances; `migrateToPointSystem()` syncs them back. Safe to toggle at any time.

### AI Features

| Key | Default | Description |
|---|---|---|
| `useAI` | `true` | Enable AI features (task generation, chatbot) |
| `chatbotEnabled` | `false` | Show AI chatbot panel in admin dashboard |
| `chatbotTtsEnabled` | `false` | Enable text-to-speech responses |
| `chatbotVoice` | `"nova"` | TTS voice: `"nova"` / `"alloy"` / `"echo"` / `"fable"` / `"onyx"` / `"shimmer"` |

### Notifications

| Key | Default | Description |
|---|---|---|
| `pushoverEnabled` | `false` | Enable Pushover push notifications |
| `reminderTime` | `""` | Daily reminder time (HH:MM), sends Pushover with unfinished tasks |

### Advanced

| Key | Default | Description |
|---|---|---|
| `autoUpdate` | `false` | Auto `git pull` daily at 04:00 |

### Coin assignment rules

Task coin rules (`taskPointsRules` / `taskCoinRules`) are stored in the `coinStore` section of `data.json`, not in `settings`. They are managed exclusively from the admin UI (Settings → Coins System Settings → Task Coin Assignment). Do not set in `config.js`.

---

## Voice Assistant Setup

Requires HTTPS (browser security requirement for microphone access):
1. Run `generate_certs.sh` to create `certs/server.key` and `certs/server.crt`
2. Set `adminPort` to 5004 in `config.js`
3. Enable chatbot + audio in admin Settings → AI Features
4. Requires a valid `openaiApiKey` in `config.js` for GPT intent parsing and TTS
