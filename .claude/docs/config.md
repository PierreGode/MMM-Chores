---
description: MagicMirror config.js options, defaults, and voice assistant setup
---

# Configuration

## MagicMirror `config.js` Options

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

## Voice Assistant Setup

Requires HTTPS (browser security requirement for microphone access):
1. Run `generate_certs.sh` to create `certs/server.key` and `certs/server.crt`
2. Set `adminPort` to 5004 in config
3. Enable `voiceAssistant.enabled: true`
4. Requires a valid `openaiApiKey` for GPT intent parsing and TTS
