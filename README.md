# Thunder Copilot 🤖
A modern AI-powered chat assistant extension for Mozilla Thunderbird

![Modern Chat Interface](https://img.shields.io/badge/UI-Modern%20Chat-blue)
![Thunderbird](https://img.shields.io/badge/Thunderbird-128%2B-orange)
![API](https://img.shields.io/badge/OpenAI-GPT--4-green)

## ✨ Features

- **💬 Modern Chat Interface** - Clean, expandable chat UI with context-aware conversations
- **📧 Smart Email Context** - Add current emails to conversation context with one click
- **🔑 Secure Settings** - Configure OpenAI API key in dedicated options page
- **🎯 Context Management** - Visual indicators for active email context
- **⚡ Real-time Validation** - Instant API key validation and error handling
- **📱 Responsive Design** - Optimized for Thunderbird's popup interface

## 🚀 Quick Start

### 1. Install the Extension

**Option A: Build and Install (Recommended)**
1. **Build the extension:**
   ```bash
   ./build.sh
   ```
   On Windows:
   ```powershell
   .\package_plugin.ps1
   ```
   This creates `MyScriptDirectory.xpi`

2. **Install in Thunderbird:**
   - Open Thunderbird
   - Go to **Tools** > **Add-ons and Themes**
   - Click the **gear icon** (⚙️) and select **"Install Add-on From File..."**
   - Select the `MyScriptDirectory.xpi` file
   - Accept any permission prompts

**Option B: Developer Installation**
1. Clone this repository
2. In Thunderbird, go to **Tools** > **Developer Tools** > **Debug Add-ons**
3. Click **"This Thunderbird"**
4. Click **"Load Temporary Add-on..."**
5. Select the `manifest.json` file from this directory

### 2. Configure API Key

1. **Open Settings:**
   - Go to **Tools** > **Add-ons and Themes**
   - Find **TB Copilot (starter)** in the list
   - Click the three dots (**...**) and select **Options**

2. **Add Your OpenAI API Key:**
   - Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create a new secret key (starts with "sk-")
   - Copy and paste it into the settings
   - Click **Save API Key**

### 3. Start Chatting

1. **Access the Chat:**
   - Click the **Copilot** button in Thunderbird's toolbar
   - Or find it in the menu dropdown

2. **Add Email Context:**
   - Select an email you want to analyze
   - Click **"Add context ▼"** → **"Current email"**
   - See the context indicator update

3. **Chat with AI:**
   - Type your question in the expandable text area
   - Example: "Summarize this email and suggest action items"
   - Press Enter or click the send button (➤)

## 🎯 New Chat Interface

The extension now features a **modern chat interface** with:

- **📝 Expandable Input** - Text area automatically resizes as you type
- **🔄 Context Management** - Visual indicators show when emails are in context
- **💬 Chat History** - View conversation history in a clean message format
- **⚠️ Smart Warnings** - Automatic prompts to set up API key when missing
- **🎨 Modern Design** - Clean, responsive UI optimized for productivity

## 📁 Project Structure

1. A concise research summary (how Thunderbird extensions are built and which APIs you can use for the features you asked for).
2. Design notes + recommended approaches (including realistic constraints — e.g. Thunderbird doesn’t expose a full high-level calendar WebExtension API today; workarounds).
3. A working starter “draft” extension (manifest + background/service-worker + sidebar UI) that:

   * adds a collapsible “Copilot” sidebar,
   * accepts & stores an OpenAI API key,
   * knows which message is currently displayed,
   * can search messages/contacts,
   * can create drafts (single and programmatically saved),
   * includes a scaffold / two options for creating calendar events (1 = generate ICS and open it for the user; 2 = notes + skeleton for using a WebExtension Experiment or CalDAV to add events programmatically).

All web-documentation links I used are cited inline so you can follow the official details.

---

# 1) Quick research summary — how Thunderbird extensions are built (essentials)

* Thunderbird extensions are **WebExtensions / MailExtensions** (the same general model as Firefox extensions with Thunderbird-specific APIs and UI elements). The project docs + how-tos are the authoritative source. ([developer.thunderbird.net][1])
* UI elements you can add include toolbar buttons, popups, and **sidebars** (via `sidebar_action` / `sidebarAction`). That is the right mechanism to add a persistent right-hand “Copilot” panel. ([developer.mozilla.org][2])
* Mail APIs:

  * `messageDisplay` API gives you access to currently-displayed messages (you can get the message the user is reading). Use `messageDisplay.getDisplayedMessages()` / `onMessagesDisplayed` to stay aware of the active message. ([webextension-api.thunderbird.net][3])
  * `messages` API + `mailTabs` let you query/search mailboxes (e.g., `messages.query`, `messages.list`, `mailTabs.getSelectedMessages`). Permissions like `messagesRead` are required. ([webextension-api.thunderbird.net][4])
  * `compose` API lets you open compose windows and *save drafts programmatically* (functions like `beginNew`, `setComposeDetails`, and `saveMessage` / `saveMessage(tabId, {mode:'draft'})`). You need `compose` and `compose.save` permissions. Note: `saveMessage` was added in modern Thunderbird releases (TB 102+). ([webextension-api.thunderbird.net][5])
* Contacts/addressBooks: there are WebExtension APIs to access address books/contacts (permissions such as `addressBooks` / `contacts`). ([developer.thunderbird.net][6])
* Calendar: **there is no official, simple high-level `browser.calendar.*` WebExtension API** broadly exposed today. Developers who need deep access to Thunderbird’s internal Calendar (Lightning) either:

  1. Use **WebExtension Experiments** to expose/implement privileged calendar functions that call Thunderbird internals (experiments can call internal modules but require very wide permissions and oddities). ([developer.thunderbird.net][7])
  2. Or the extension crafts standard iCalendar (`.ics`) data and adds it via user-visible flow (e.g., create `.ics` and open/import it), or talks directly to the calendar server (CalDAV) itself (requires credentials / OAuth / server API). Many calendar-related add-ons use one of these workarounds because the built-in WebExtension calendar surface is limited. ([services.addons.thunderbird.net][8])

**Bottom line (calendar):** creating/reading/editing events *automatically inside Thunderbird’s Calendar* is possible, but currently requires either a privileged Experiment API (more power, more user consent) or implementing CalDAV/ICS flows yourself. I’ll show both approaches in the draft plugin (ICS generation + Experiment scaffold).

---

# 2) Recommended architecture for your plugin (based on your bullets)

Goals: collapsible right-hand Copilot sidebar that can read current message, search mail/contacts/events, create drafts and create multiple events.

Design choices:

* **Sidebar (right) UI**: implement as `sidebar_action` (manifest + `sidebar.html`). This gives a native Thunderbird sidebar that the user can collapse/expand. Use a small toggle button if you also want a floating collapse control. ([developer.mozilla.org][2])
* **OpenAI key**: store in `browser.storage.local` tied to the extension options or the sidebar UI. Warn users storing keys locally has risks. Use `storage` permission.
* **Message awareness**: in sidebar code, call `browser.messageDisplay.getDisplayedMessages()` to get the currently-open message (or listen to `onMessagesDisplayed`) and call `browser.messages.get(messageId)` to fetch full details. ([webextension-api.thunderbird.net][3])
* **Search**: use `browser.messages.query()` (or `mailTabs` helpers) to search emails. Use `addressBooks` / `contacts` APIs for contacts. ([webextension-api.thunderbird.net][4])
* **Create drafts**: use `browser.compose.beginNew(details)` to open a compose tab prefilled, then use `browser.compose.saveMessage(tabId,{mode:'draft'})` to save programmatically (requires `compose.save`). If you prefer creating a draft without opening a window, there are limitations; the supported route is to create/modify a compose tab and `saveMessage`. ([webextension-api.thunderbird.net][5])
* **Create multiple calendar events**:

  * **Option A (recommended, simplest to ship):** generate `.ics` data for each event and either open them for the user to import or (if you can) use an Experiment to add them directly to the chosen calendar. ICS files can be attached to a draft or downloaded then imported. This works cross-server and is straightforward. ([addevent.com][9])
  * **Option B (power user / full integration):** implement a **WebExtension Experiment** that calls Thunderbird’s calendar internals to create events directly. This is more complex, requires privileged access and additional packaging considerations, and triggers an elevated permission prompt. Use this only when the extension absolutely must write events into the internal calendar without user interaction. ([developer.thunderbird.net][7])

---

# 3) Starter extension draft (files you can copy + tweak)

Below is a **production-ready starter** skeleton (Manifest V2, targets Thunderbird 128+, MV2 background scripts). It implements the sidebar UI, message awareness, OpenAI key storage, message search, contact search, and draft creation. For calendar creation I provide a robust `.ics` generator + a note & experiment stub.

> NOTE: this is a *starter* — you’ll want to expand UI styling, error handling, model prompting, and OpenAI network handling. The code uses only standard Thunderbird WebExtension APIs and indicates where to add an Experiment for calendar direct-write if you decide to go that route.

---

## File: `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "TB Copilot (starter)",
  "version": "0.1.0",
  "description": "Collapsible Copilot sidebar for Thunderbird — read current message, search, create drafts and generate calendar .ics",
  "icons": {
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "messagesRead",
    "messagesModify",
    "compose",
    "compose.save",
    "storage",
    "addressBooks",
    "accountsRead",
    "sidebarAction",
    "notifications"
  ],
  "sidebar_action": {
    "default_title": "Copilot",
    "default_panel": "sidebar.html",
    "preferred_width": 400
  },
  "host_permissions": [
    "https://api.openai.com/*"
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "copilot-starter@example.com",
      "strict_min_version": "128.0"
    }
  }
}
```

---

## File: `background.js` (service worker)

```javascript
// background.js
// Minimal background to receive messages from sidebar and do heavy-lifting.

self.addEventListener('install', () => {
  console.log('Copilot background installed');
});

// message handler from sidebar/options
browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === 'getDisplayedMessage') {
    // messageDisplay.getDisplayedMessages -> returns list of messages currently shown
    const displayed = await browser.messageDisplay.getDisplayedMessages();
    if (displayed && displayed.messages && displayed.messages.length) {
      const header = displayed.messages[0];
      const full = await browser.messages.get(header.id);
      return Promise.resolve({ ok: true, message: full });
    }
    return Promise.resolve({ ok: false, error: 'no message displayed' });
  }

  if (msg.type === 'searchMessages') {
    // Example search: {query: {subjectContains: "meeting"}}
    try {
      const result = await browser.messages.query(msg.query);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'createDraft') {
    // create a compose window prefilled and save it as a draft
    try {
      const composeTab = await browser.compose.beginNew(null, {
        subject: msg.subject || '',
        body: msg.body || '',
        to: msg.to || []
      });
      // wait a tick then save
      await browser.compose.saveMessage(composeTab.id, { mode: 'draft' });
      return { ok: true, composeTabId: composeTab.id };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'generateICS') {
    // msg.events: array of event objects -> returns a blob URL
    const ics = eventsToICS(msg.events);
    // create object URL so sidebar can download/import
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    return { ok: true, url, ics };
  }

  return null;
});

function eventsToICS(events) {
  // Very small ICS generator: events = [{uid, start, end, summary, description, location}]
  // start/end are ISO strings (UTC or local). This is minimal — expand for full RFC5545 support.
  function toICSDate(dt) {
    // returns YYYYMMDDTHHMMSSZ if dt ends with Z or convert local as naive
    const d = new Date(dt);
    const pad = n => n.toString().padStart(2, '0');
    return d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  let out = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Copilot//TB\r\nCALSCALE:GREGORIAN\r\n';
  for (const ev of events) {
    out += 'BEGIN:VEVENT\r\n';
    out += `UID:${ev.uid || (Date.now() + Math.random()).toString(36)}\r\n`;
    out += `DTSTAMP:${toICSDate(new Date().toISOString())}\r\n`;
    if (ev.start) out += `DTSTART:${toICSDate(ev.start)}\r\n`;
    if (ev.end) out += `DTEND:${toICSDate(ev.end)}\r\n`;
    out += `SUMMARY:${escapeICSText(ev.summary || '')}\r\n`;
    if (ev.location) out += `LOCATION:${escapeICSText(ev.location)}\r\n`;
    if (ev.description) out += `DESCRIPTION:${escapeICSText(ev.description)}\r\n`;
    out += 'END:VEVENT\r\n';
  }
  out += 'END:VCALENDAR\r\n';
  return out;
}

function escapeICSText(s) {
  return (s || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
```

---

## File: `sidebar.html`

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Copilot</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 8px; }
    #header { display:flex; gap:8px; align-items:center; }
    textarea { width:100%; min-height:80px; }
    .small { font-size:0.9rem; color: #666; }
  </style>
</head>
<body>
  <div id="header">
    <h3>Copilot</h3>
    <button id="toggle">Collapse</button>
  </div>

  <div>
    <label class="small">OpenAI API Key (stored locally)</label><br/>
    <input id="apiKey" placeholder="sk-..." style="width:100%"/>
    <button id="saveKey">Save key</button>
    <div id="keyStatus" class="small"></div>
  </div>

  <hr/>

  <div>
    <button id="readCurrent">Read current email</button>
    <pre id="messageSummary" class="small"></pre>
  </div>

  <hr/>

  <div>
    <label>Ask Copilot</label><br/>
    <textarea id="prompt" placeholder="Summarize the current email and propose calendar events"></textarea>
    <button id="ask">Ask (use key to call OpenAI)</button>
    <div id="aiResponse" class="small"></div>
  </div>

  <hr/>

  <div>
    <label>Search messages (subject contains)</label><br/>
    <input id="searchTerm" placeholder="meeting"/>
    <button id="searchBtn">Search</button>
    <pre id="searchResults" class="small"></pre>
  </div>

  <hr/>

  <div>
    <button id="createSampleDraft">Create sample draft</button>
  </div>

  <hr/>

  <div>
    <button id="genICS">Generate .ics for 2 sample events</button>
    <a id="downloadIcs" style="display:none">Download ICS</a>
  </div>

<script>
  // Sidebar script
  document.getElementById('saveKey').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim();
    await browser.storage.local.set({ openaiApiKey: key });
    document.getElementById('keyStatus').textContent = key ? 'Saved' : 'Cleared';
  });

  // load key
  (async () => {
    const s = await browser.storage.local.get('openaiApiKey');
    document.getElementById('apiKey').value = s.openaiApiKey || '';
  })();

  document.getElementById('readCurrent').addEventListener('click', async () => {
    const r = await browser.runtime.sendMessage({ type: 'getDisplayedMessage' });
    if (r.ok) {
      const m = r.message;
      const summary = `Subject: ${m.subject}\nFrom: ${m.author}\nDate: ${m.date}\n\n${m.parts?.map(p => p.body || '').join('\n').slice(0, 1000)}`;
      document.getElementById('messageSummary').textContent = summary;
    } else {
      document.getElementById('messageSummary').textContent = 'No message displayed';
    }
  });

  document.getElementById('searchBtn').addEventListener('click', async () => {
    const term = document.getElementById('searchTerm').value;
    const r = await browser.runtime.sendMessage({ type: 'searchMessages', query: { subjectContains: term, pageSize: 25 } });
    if (r.ok) {
      document.getElementById('searchResults').textContent = JSON.stringify(r.result.messages?.map(m => ({ id: m.id, subject: m.subject, author: m.author })) , null, 2);
    } else {
      document.getElementById('searchResults').textContent = 'Error: ' + r.error;
    }
  });

  document.getElementById('createSampleDraft').addEventListener('click', async () => {
    const r = await browser.runtime.sendMessage({ type: 'createDraft', subject: 'Draft from Copilot', body: 'This draft was created by Copilot.' });
    if (r.ok) alert('Draft created (composeTabId: ' + r.composeTabId + ')'); else alert('Error: ' + r.error);
  });

  document.getElementById('genICS').addEventListener('click', async () => {
    const events = [
      { uid: 'ev1', start: new Date().toISOString(), end: new Date(Date.now()+3600*1000).toISOString(), summary: 'Test meeting 1', description: 'Generated by Copilot', location: 'Zoom' },
      { uid: 'ev2', start: new Date(Date.now()+86400*1000).toISOString(), end: new Date(Date.now()+90000*1000).toISOString(), summary: 'Test meeting 2', description: 'Generated by Copilot', location: 'Office' }
    ];
    const r = await browser.runtime.sendMessage({ type: 'generateICS', events });
    if (r.ok) {
      const a = document.getElementById('downloadIcs');
      a.href = r.url;
      a.download = 'events.ics';
      a.style.display = 'inline-block';
      a.textContent = 'Download events.ics';
    } else {
      alert('ICS generation error');
    }
  });

  // Ask button - example call to OpenAI (uses fetch; user must have stored key)
  document.getElementById('ask').addEventListener('click', async () => {
    const s = await browser.storage.local.get('openaiApiKey');
    const key = s.openaiApiKey;
    if (!key) { document.getElementById('aiResponse').textContent = 'No API key saved.'; return; }
    const prompt = document.getElementById('prompt').value;
    document.getElementById('aiResponse').textContent = 'Calling OpenAI...';
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o', // replace as desired
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400
        })
      });
      const data = await resp.json();
      const text = (data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text)) || JSON.stringify(data);
      document.getElementById('aiResponse').textContent = text;
    } catch (err) {
      document.getElementById('aiResponse').textContent = 'OpenAI error: ' + err;
    }
  });

  // Collapse toggle (just hide body for simple "collapse" UX)
  document.getElementById('toggle').addEventListener('click', () => {
    const body = document.body;
    if (body.style.display === 'none') { body.style.display = ''; document.getElementById('toggle').textContent = 'Collapse'; }
    else { body.style.display = 'none'; document.getElementById('toggle').textContent = 'Expand'; }
  });
</script>
</body>
</html>
```

---

## Calendar: two realistic options explained in code/comments

**Option A — generate `.ics` (implemented in background.js)**

* The sidebar calls `generateICS` (I included `generateICS` above). The user downloads the `.ics` and imports into a calendar or you attach the `.ics` to an email to send invites. This is portable and needs no special Thunderbird internals.

**Option B — direct calendar manipulation (advanced)**

* Implement a **WebExtension Experiment** that exposes a method `calendar.addEvent(calendarId, icalComponent)` which calls Thunderbird’s calendar internals (`calICalendar` APIs). The Experiment requires writing XPCOM glue and a `schema`/implementation; it will force a privileged permission prompt in Thunderbird. See the Thunderbird Experiments docs for examples and restrictions. I can provide a concrete Experiment skeleton in the next step if you want to go that route. ([developer.thunderbird.net][7])

---

# 4) Important implementation notes, constraints & next steps

* **Permissions**: `compose.save` and `messagesRead` are required for drafts and reading messages. Experiments require an elevated permission and will show a scary prompt to users (“Have full, unrestricted access to Thunderbird and your computer”), so consider UX/trust. ([webextension-api.thunderbird.net][5])
* **Thunderbird versions**: I targeted Manifest V2 and APIs as available in modern Thunderbird (128+). If you need compatibility with older TB versions, you might need Manifest V2 variants. The webext examples repo contains both MV2 and MV2 variants. ([GitHub][10])
* **Security**: storing an OpenAI API key in `browser.storage.local` is convenient but local-storage only; inform users of risk. For a more secure approach use OAuth or a remote proxy that you control (but that introduces server work).
* **Calendar automation**: if you need to create *many* events automatically into Thunderbird calendar without user interaction, the Experiment route is the “native” way to do it inside the client. Alternatively, write events directly to the CalDAV server (if you have credentials / tokens) using CalDAV APIs or server-specific APIs (Nextcloud, Google Calendar REST, Microsoft Graph, etc.). That approach needs server/credential handling and mapping attendees, calendars, etc. ([addevent.com][9])

---

# 5) Where I’d help next (I can do these right now if you want)

* **Produce a full WebExtension Experiment skeleton** (schema + JS implementation) for one calendar operation (`addEvent` / `getEvents`) so you can call it from the sidebar — includes the *actual* privileged glue needed to talk to Thunderbird calendar internals. (This requires careful packaging and testing in developer Thunderbird.) ([webext-docs-staging.readthedocs.io][11])
* **Add richer UI** (message-aware prompts, selection-based actions, multi-event creation UI, and mass-creation flow).
* **Implement CalDAV connector** if you prefer writing to server-side calendars (Nextcloud/Google/Exchange) instead of Thunderbird internal calendar.

---

# Key sources I used (most load-bearing)

* Thunderbird Guide to MailExtensions (how to structure add-ons, UI elements, manifest guidance). ([developer.thunderbird.net][1])
* Thunderbird WebExtension API docs (compose API — beginNew, saveMessage; messageDisplay API) — used for exact method names and required permissions. ([webextension-api.thunderbird.net][5])
* WebExtension Experiments docs (how to add privileged APIs when built-in APIs aren’t enough). ([webext-docs-staging.readthedocs.io][11])
* Thunderbird webext examples + repo (concrete working examples for MV2/MV2). ([GitHub][10])

---

If you want, I can:

* produce the **Experiment skeleton** (schema + implementation) for direct calendar writes (I will include the necessary files and explain how to test it in Thunderbird’s developer environment), **or**
* expand the Copilot sidebar UI into a polished React/Tailwind single-file preview (I can put it in a canvas/code editor format), **or**
* deliver a fully packaged example `.xpi` (zipped extension) ready for sideloading (I can produce the files here and show a ZIP path to download).

```
thunder-copilot/
├── manifest.json       # Extension manifest (permissions, UI elements)
├── background.js       # Service worker (message handling, ICS generation)
├── sidebar.html        # Copilot sidebar UI and interactions
├── icons/              # Extension icons
│   ├── icon-48.png
│   └── icon-128.png
├── build.sh           # Build script to create .xpi package
└── README.md          # This documentation
```

## 🔧 Development

### Building from Source
```bash
# Make the build script executable
chmod +x build.sh

# Build the extension
./build.sh
```

### File Overview
- **`manifest.json`** - Defines extension permissions, UI elements, and metadata
- **`background.js`** - Service worker handling message communication and calendar ICS generation
- **`sidebar.html`** - Sidebar UI structure
- **`sidebar.js`** - Sidebar logic for email context management and AI chat
- **`options.html`** - Settings page for API key configuration
- **`options.js`** - Settings page logic
- **`icons/`** - Extension icons in PNG format

## 🌟 Extension Architecture

This is a **WebExtension/MailExtension** for Thunderbird using:
- **Manifest V2** targeting Thunderbird 128+
- **Sidebar UI** for persistent right-panel interface
- **Background scripts** for heavy-lifting operations
- **Standard Thunderbird APIs** for message access, composition, and search
- **ICS generation** for calendar integration (no privileged APIs required)

## 📚 Technical References

The implementation follows Thunderbird's official documentation:
- [Thunderbird MailExtensions Guide](https://developer.thunderbird.net/add-ons/mailextensions)
- [WebExtension APIs](https://webextension-api.thunderbird.net/)
- [Extension Examples](https://github.com/thunderbird/webext-examples)

## 🔧 Development Guidelines

### UI Architecture Notes
- **Popup vs Sidebar**: Currently configured as `browser_action.default_popup` (popup interface)
- **CSS Constraints**: Popup has size limits; sidebar CSS should account for ~400px width and 500-600px height
- **Responsive Design**: Always test in Thunderbird's popup context, not full browser

### Key Implementation Details
- **Modern Chat UI**: Uses flexbox layout with expandable textarea
- **Context Management**: Visual indicators and dropdown for email context
- **API Key Security**: Stored in `browser.storage.local` with validation
- **Error Handling**: Comprehensive error states and user feedback
- **Background Communication**: Uses `browser.runtime.sendMessage` for heavy operations

### Important Development Rules

#### 🚨 UI Display Issues Prevention
1. **Always set explicit dimensions** for popup interfaces:
   ```css
   body {
     width: 400px;
     min-height: 500px;
     max-height: 600px;
   }
   ```

2. **Test in actual Thunderbird popup**, not browser dev tools
3. **Use `box-sizing: border-box`** to prevent layout overflow
4. **Avoid `height: 100vh`** in popup contexts - use specific pixel values

#### 🔒 Security & Storage
- API keys stored in `browser.storage.local` only
- Validate API key format before storage: starts with "sk-", minimum length
- Show clear warnings when API key is missing
- Never log API keys to console
- **⚠️ CRITICAL**: Never commit `.env` files with API keys to version control

#### 🎨 UI/UX Standards
- Use system fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`
- Implement loading states for API calls
- Provide visual feedback for all user actions
- Keep context indicators always visible
- Auto-resize text inputs based on content

### Building & Testing

**Build Command:**
```bash
# Unix/Mac
./build.sh

# Windows
.\package_plugin.ps1
```

**Testing Checklist:**
- [ ] Popup opens and displays correctly
- [ ] API key validation works in options
- [ ] Email context can be added/removed
- [ ] Chat interface responds properly
- [ ] Error states display appropriately
- [ ] All buttons and interactions work

---

*Built with ❤️ for the Thunderbird community*
