# Understanding Displayed Messages in Thunderbird

## Overview

In Thunderbird's WebExtension API, "displayed messages" refer to email messages that are currently visible/open in a tab or pane. This document explains how displayed messages relate to tabs and windows in Thunderbird.

## Displayed Messages vs. Tabs

A displayed message is not the same as a tab. The relationship works as follows:

1. **Messages can be displayed in multiple tab types:**
   - `mail` tabs (the main mail interface with folder pane, message list, and preview pane)
   - `messageDisplay` tabs (dedicated tabs showing a single message)
   - Some special tabs may also display messages in certain contexts

2. **One tab can display one message at a time:**
   - In a `mail` tab, the currently selected message in the preview pane is the "displayed message"
   - In a `messageDisplay` tab, the entire tab shows one message

## API Access

To access displayed messages, use the `browser.messageDisplay` API:

```javascript
// Get the displayed message in a specific tab
const message = await browser.messageDisplay.getDisplayedMessage(tabId);

// Listen for display changes
browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
  console.log(`Message "${message.subject}" displayed in tab ${tab.id}`);
});
```

## Important Properties

When working with displayed messages, the following properties are particularly useful:

1. **Message Properties:**
   - `id`: Unique identifier for the message
   - `subject`: Email subject line
   - `author`: Sender's email address or name
   - `recipients`, `ccList`, `bccList`: Recipients of the email
   - `date`: When the email was sent
   - `folder`: The folder containing the message

2. **Related Tab Information:**
   - `tabId`: The ID of the tab displaying the message
   - `tabType`: Type of tab (`mail`, `messageDisplay`, etc.)

## Key Differences from Selected Messages

Do not confuse displayed messages with selected messages:

- **Displayed Messages**: Messages that are currently visible/open in tabs
- **Selected Messages**: Messages that are highlighted/checked in the message list of a mail tab

A message can be selected without being displayed (if multiple messages are selected but only one is previewed), and a message can be displayed without being selected (if opened in a separate `messageDisplay` tab).

## Cross-Window Access Challenges

When accessing displayed messages from extension windows/popups, special care is needed:

1. **Window Context Issues**:
   - Extension popups run in their own window context
   - Direct queries using `currentWindow: true` will not find messages in the main Thunderbird window
   - Need to query across all windows to find displayed messages

2. **Robust Implementation**:
   ```javascript
   async function getDisplayedEmailFromAnyWindow() {
     // Check if we're in a popup window
     const currentWindow = await browser.windows.getCurrent();
     
     // Determine which windows to search
     let relevantWindows;
     if (currentWindow.type === 'popup') {
       // We're in a popup, search all normal windows
       const allWindows = await browser.windows.getAll();
       relevantWindows = allWindows.filter(win => win.type === 'normal');
     } else {
       // We're in a normal window, just use current
       relevantWindows = [currentWindow];
     }
     
     // For each window, check active tabs
     for (const window of relevantWindows) {
       const tabs = await browser.tabs.query({ 
         windowId: window.id,
         active: true
       });
       
       // Check messageDisplay tabs first
       for (const tab of tabs.filter(t => t.type === 'messageDisplay')) {
         try {
           const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
           if (message) return message;
         } catch (e) { /* continue to next tab */ }
       }
       
       // Then check mail tabs
       for (const tab of tabs.filter(t => t.type === 'mail')) {
         try {
           const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
           if (message) return message;
         } catch (e) { /* continue to next tab */ }
       }
     }
     
     return null;
   }
   ```

## Tab Type Priority

When looking for displayed messages, prioritize tab types in this order:

1. `messageDisplay` tabs (dedicated to showing a single message)
2. `mail` tabs (main mail interface with preview pane)
3. Other tab types as a last resort

## Practical Use Cases

1. **Context-aware extensions**: Access the content of the message the user is currently viewing
2. **Message actions**: Perform actions on the currently displayed message
3. **UI enhancements**: Add features to the message view based on message content

## Debugging Tips

When debugging displayed messages:

1. Check both `mail` tabs and `messageDisplay` tabs for displayed messages
2. Remember that a `mail` tab may have a selected message that is displayed in the preview pane
3. A user can have multiple messages displayed at once across different tabs
4. Check window contexts when accessing from popups/standalone windows
5. Use proper error handling when querying tabs that might not have displayed messages

## Example: Getting All Displayed Messages

```javascript
async function getAllDisplayedMessages() {
  // Get all tabs that might display messages
  const tabs = await browser.tabs.query({});
  const messageTabs = tabs.filter(tab => tab.type === 'messageDisplay' || tab.type === 'mail');
  
  let displayedMessages = [];
  
  for (const tab of messageTabs) {
    try {
      const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
      if (message) {
        displayedMessages.push({
          tabId: tab.id,
          tabType: tab.type,
          message
        });
      }
    } catch (err) {
      // Skip tabs without displayed messages
    }
  }
  
  return displayedMessages;
}
```

This approach collects all messages that are currently visible to the user across all applicable tabs.