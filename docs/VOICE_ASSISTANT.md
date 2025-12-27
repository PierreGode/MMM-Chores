# Voice Assistant for MMM-Chores

## Overview

The voice assistant feature enables hands-free interaction with your chores system using natural language voice commands. It works on:
- **Windows laptops** (Chrome, Edge)
- **iPhone** (Safari - iOS 14.5+)
- **Android phones** (Chrome)
- **iPad/tablets** (Safari/Chrome)

## How It Works

### Architecture

```
User speaks → Browser (Web Speech API) → Transcription
    ↓
Node.js backend → OpenAI GPT-4 → Intent parsing
    ↓
Action execution (mark done, list tasks, etc.)
    ↓
Response generation → Text-to-Speech → User hears response
```

### Key Features

- **Voice Activity Detection**: Browser-native speech recognition
- **Natural Language Understanding**: GPT-4 parses intent from transcription
- **Contextual Responses**: AI understands your tasks, people, and system state
- **Cross-Platform**: Works on iPhone, Android, Windows via web browsers
- **Privacy-Friendly**: Only transcription sent to OpenAI, not audio
- **Multilingual**: Supports multiple languages via configuration

## Configuration

Add to your `config.js`:

```javascript
{
  module: "MMM-Chores",
  position: "top_left",
  config: {
    openaiApiKey: "sk-...",  // Required for voice assistant
    voiceAssistant: {
      enabled: true,
      language: "en-US",        // en-US, sv-SE, es-ES, etc.
      continuous: false,        // Keep listening after command
      interimResults: false,    // Show partial transcriptions
      maxAlternatives: 1,
      ttsEnabled: true,         // Speak responses back
      ttsVoice: "default",      // Or specific voice name
      ttsRate: 1.0,             // Speech speed (0.1 - 10)
      ttsPitch: 1.0,            // Voice pitch (0 - 2)
      showTranscription: true,  // Display what was heard
      wakeWord: null            // Optional: "hey chores"
    }
  }
}
```

## Supported Commands

### Task Management

- **"What are my chores today?"**
  - Lists tasks due today
  
- **"Show me all tasks for this week"**
  - Lists tasks for the next 7 days
  
- **"What tasks does Emma have?"**
  - Lists tasks for specific person
  
- **"Mark laundry as done"**
  - Completes a task by name
  
- **"I finished the dishes"**
  - Natural completion command
  
- **"Mark vacuum as incomplete"**
  - Unmarks a completed task

### Stats & Progress

- **"How many coins does John have?"**
  - Reports points balance
  
- **"Show me Emma's stats"**
  - Shows completed tasks and points
  
- **"Who's winning this week?"**
  - Leaderboard query

### Rewards (Point System)

- **"What rewards can I get?"**
  - Lists available rewards
  
- **"I want to redeem ice cream"**
  - Redeems a reward by name

## Usage on Different Devices

### iPhone/iPad (Safari)

1. Open Safari and navigate to your mirror URL
2. Grant microphone permission when prompted
3. Tap the 🎤 Voice button
4. Speak your command
5. Wait for response

**Add to Home Screen** (recommended):
- Tap Share → Add to Home Screen
- Opens like a native app
- Faster access, no browser chrome

### Android (Chrome)

1. Open Chrome and navigate to your mirror URL
2. Grant microphone permission
3. Tap the 🎤 Voice button
4. Speak your command

**Install as PWA**:
- Menu → Install App
- Acts like native app

### Windows Laptop

1. Open Chrome/Edge
2. Click 🎤 Voice button or use wake word (if configured)
3. Speak command
4. System responds via speakers/headphones

## Troubleshooting

### "Microphone not available"
- **iOS**: Check Settings → Safari → Microphone → Allow
- **Android**: Settings → Apps → Chrome → Permissions → Microphone
- **Windows**: System Settings → Privacy → Microphone → Allow Chrome

### "Voice commands not working"
- Ensure `openaiApiKey` is set in config
- Check browser console for errors
- Verify internet connection
- Try simpler commands first

### "Can't hear responses"
- Check device volume
- Ensure `ttsEnabled: true` in config
- iOS: Check silent/ring switch
- Try a different voice (`ttsVoice` setting)

### "Wrong language recognized"
- Set `language` to your locale (e.g., "sv-SE" for Swedish)
- Speak clearly and at normal pace
- Reduce background noise

## Privacy & Security

- **Audio never sent to servers**: Web Speech API processes locally on device
- **Only text transcription** sent to OpenAI for intent parsing
- **No audio recording** stored anywhere
- **OpenAI API**: Standard privacy policy applies to transcription text
- **Local storage**: No voice data stored locally

## Advanced Configuration

### Custom Wake Word (Experimental)

```javascript
voiceAssistant: {
  enabled: true,
  wakeWord: "hey chores",
  continuous: true  // Required for wake word
}
```

### Multiple Languages

```javascript
voiceAssistant: {
  enabled: true,
  language: "sv-SE",  // Swedish
  ttsVoice: "Google svenska"
}
```

### Voice Selection (iOS)

Available voices vary by device:
- **English**: Samantha, Alex, Victoria
- **Swedish**: Alva
- **Spanish**: Monica, Paulina

List available voices:
```javascript
speechSynthesis.getVoices().forEach(voice => console.log(voice.name));
```

## Future Enhancements

Planned features:
- Wake word detection
- Conversation memory (multi-turn dialogs)
- Task creation via voice
- Scheduling: "Remind me to do laundry tomorrow"
- Integration with Siri Shortcuts (iOS)
- Google Assistant Actions (Android)
- Alexa Skill

## Technical Details

### Browser Compatibility

| Browser | Platform | Support |
|---------|----------|---------|
| Safari | iOS 14.5+ | ✅ Full |
| Safari | macOS | ✅ Full |
| Chrome | Android | ✅ Full |
| Chrome | Windows | ✅ Full |
| Edge | Windows | ✅ Full |
| Firefox | All | ⚠️ Limited |

### API Usage

**Web Speech API** (free, on-device):
- Speech recognition: Browser built-in
- Text-to-speech: Browser built-in

**OpenAI API** (paid):
- GPT-4 for intent parsing: ~$0.01 per command
- Average cost: < $1/month for typical family usage

## Examples

### Example Conversation

```
User: "What are my chores today?"
Assistant: "You have 3 tasks: dishes, vacuum, and laundry."

User: "Mark dishes as done"
Assistant: "Marked 'dishes' as complete. You earned 10 coins!"

User: "How many coins do I have?"
Assistant: "You have 45 coins."
```

### Multilingual Example (Swedish)

```
User: "Vilka uppgifter har jag idag?"
Assistant: "Du har 3 uppgifter: disk, dammsugning och tvätt."

User: "Markera disk som klar"
Assistant: "Markerade 'disk' som slutförd. Du fick 10 mynt!"
```

## Support

For issues or feature requests:
1. Check [GitHub Issues](https://github.com/yourrepo/MMM-Chores/issues)
2. Review browser console logs
3. Test with simple commands first
4. Verify microphone permissions

---

**Note**: Voice assistant requires the `openai` npm package:
```bash
cd ~/MagicMirror/modules/MMM-Chores
npm install openai
```
