# Window Management in Thunder Copilot

This document describes how Thunder Copilot manages different types of windows and their behaviors within Thunderbird.

## Window Types

Thunder Copilot interacts with several types of Thunderbird windows:

1. **Main Window**: The primary Thunderbird window containing mail folders and messages
2. **Standalone Chat Window**: A popup window that hosts the Copilot chat interface
3. **Composer Window**: The email composition window
4. **Debug Window**: A specialized window for extension debugging

## Window Identification

Windows in Thunderbird have these key properties:

```javascript
{
  id: 1,             // Unique numeric identifier
  type: "normal",    // Window type (normal, popup, messageCompose)
  focused: true,     // Whether the window has focus
  state: "normal"    // Window state (normal, maximized, minimized)
}
```

## Window Creation

Different windows are created using specific methods:

### Standalone Chat Window

```javascript
// Open a standalone chat window
browser.windows.create({
  url: browser.runtime.getURL(`index.html?standalone=1${contextParams}`),
  type: 'popup',
  width: 600,
  height: 700
});
```

### Debug Window

```javascript
// Open the debug window
browser.windows.create({
  url: browser.runtime.getURL('debug.html'),
  type: 'popup',
  width: 900,
  height: 700
});
```

## Window Communication

Communication between windows happens through:

1. **URL Parameters**: Passing data via URL query strings
2. **Browser Messages**: Using `browser.runtime.sendMessage`
3. **Window Messaging**: Using `window.postMessage` for parent/child windows

### URL Parameter Communication

```javascript
// Constructing URL with parameters
const url = `index.html?standalone=1&currentEmail=${encodeURIComponent(JSON.stringify(currentEmail))}`;

// Reading parameters in the receiving window
const urlParams = new URLSearchParams(window.location.search);
const emailParam = urlParams.get('currentEmail');
```

### Background Script Communication

```javascript
// Sending a message to background script
browser.runtime.sendMessage({ 
  type: 'getContextForChat' 
}).then(response => {
  // Handle response
});

// Receiving in background script
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'getContextForChat') {
    // Process and return data
    return Promise.resolve(contextData);
  }
});
```

## Window Detection Logic

The extension uses different logic to detect the current window environment:

```javascript
// Check if we're in a standalone window (not popup/iframe)
if (window.opener == null && window.top === window) {
  // This is a standalone window
}

// Check if we're in an iframe
if (window.parent !== window) {
  // This is an iframe
  window.parent.postMessage({ type: 'message-type', data: {} }, '*');
}
```

## Window Opening Strategies

### Browser Action (Toolbar Button)

When the extension's toolbar button is clicked, it:
1. Captures current context (current/selected emails)
2. Constructs URL parameters with this context
3. Opens a standalone popup window with the chat interface

```javascript
browser.browserAction.onClicked.addListener(async () => {
  // Capture context
  const contextParams = await captureContext();
  
  // Open window with context
  const url = browser.runtime.getURL(`index.html?standalone=1${contextParams}`);
  browser.windows.create({ url, type: 'popup', width: 600, height: 700 });
});
```

### Compose Action (Composer Toolbar)

When the button in the composer toolbar is clicked, it:
1. Captures the current draft content
2. Opens a specialized interface for editing the draft

## Window Closing Behavior

Windows can be closed programmatically:

```javascript
// Self-close a window
window.close();

// Close specific window by ID
browser.windows.remove(windowId);
```

## Debug Window

The debug window is a specialized tool that:
1. Lists all current Thunderbird windows
2. Shows tabs within each window
3. Provides detailed information about window properties

This window helps diagnose issues with window creation, focus, and context passing.

## Best Practices

1. **Window Type Selection**: Use appropriate window types for different use cases:
   - `popup` for standalone chat windows
   - `normal` for larger windows that should behave like regular applications

2. **Window Size Management**: Set reasonable default sizes but allow user resizing:
   - Chat windows: 600×700
   - Debug windows: 900×700

3. **Window Context Awareness**: Always check what type of window is running your code:
   ```javascript
   if (window.opener == null && window.top === window) {
     // Standalone window logic
   }
   ```

4. **Window Closure**: Provide explicit close options in UI rather than relying on browser controls

5. **Window Focus**: Be careful about stealing focus from the user's current task