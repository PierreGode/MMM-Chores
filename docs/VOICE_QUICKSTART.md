# Voice Assistant - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd ~/MagicMirror/modules/MMM-Chores
npm install openai
```

### 2. Update Config

Edit `~/MagicMirror/config/config.js`:

```javascript
{
  module: "MMM-Chores",
  config: {
    openaiApiKey: "sk-your-key-here",
    voiceAssistant: {
      enabled: true,
      language: "en-US",
      ttsEnabled: true
    }
  }
}
```

### 3. Restart MagicMirror

```bash
pm2 restart MagicMirror
```

### 4. Test It!

- Open your mirror interface
- Click the 🎤 Voice button
- Say: **"What are my chores today?"**
- Listen for response

## Using on iPhone

1. Open Safari → Navigate to `http://your-mirror-ip:8080`
2. Tap Share → **Add to Home Screen**
3. Open from home screen
4. Allow microphone access
5. Tap 🎤 button and speak

## Common Commands

| Say This | It Does |
|----------|---------|
| "What are my chores today?" | Lists today's tasks |
| "Mark laundry as done" | Completes a task |
| "How many coins do I have?" | Shows your points |
| "Show me Emma's tasks" | Lists tasks for Emma |
| "What tasks are due this week?" | Shows upcoming tasks |

## Troubleshooting

**No microphone button?**
- Set `voiceAssistant.enabled: true`
- Check browser console for errors

**Commands not working?**
- Verify `openaiApiKey` is valid
- Check internet connection
- Restart the module

**Can't hear responses?**
- Set `ttsEnabled: true`
- Check device volume
- iOS: Check ring/silent switch

## Need Help?

See full documentation: [VOICE_ASSISTANT.md](VOICE_ASSISTANT.md)
