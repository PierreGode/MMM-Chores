---
description: Module overview, file map, data model, and communication patterns
---

# Architecture

## Module Overview

MMM-Chores is a MagicMirror² module for household chore tracking. It consists of:
- A **frontend module** (`MMM-Chores.js`) rendered on the mirror
- A **backend worker** (`node_helper.js`) running an Express server
- A **web admin portal** (`public/admin.html` + `public/admin.js`) accessible via browser

## Structure

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
