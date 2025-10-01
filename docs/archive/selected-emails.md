# Understanding Selected Emails in Thunderbird

## Overview

In Thunderbird's WebExtension API, "selected emails" refer to messages that are highlighted or checked in a mail tab's message list. This document explains how selected emails relate to mail tabs and windows, and how to properly access them.

## Selected Emails vs. Displayed Messages

Selected emails are different from displayed messages:

1. **Selected Emails**: 
   - Messages highlighted/checked in the message list of a mail tab
   - Can select multiple messages at once
   - Accessed via `browser.mailTabs.getSelectedMessages(tabId)`
   - Primarily available in mail tabs

2. **Displayed Messages**:
   - Message currently visible/open in a tab or preview pane
   - Usually one message per tab
   - Accessed via `browser.messageDisplay.getDisplayedMessage(tabId)`
   - Available in mail tabs and messageDisplay tabs

## Active Tabs vs. All Tabs

When retrieving selected emails, it's important to distinguish between:

1. **Active Tabs Only**: 
   - Only considers emails selected in currently active/focused mail tabs
   - More contextual - matches what the user is currently looking at
   - Ignores selections in background tabs or other windows
   - Preferred for most extension features

2. **All Tabs**:
   - Considers all selected emails across all mail tabs in all windows
   - Shows everything selected regardless of current focus
   - May include selections the user isn't currently engaging with
   - Useful for bulk operations or global features

## API Access Across Windows

A key challenge with selected emails is that they may be in a different window than your extension's UI:

1. **Main Thunderbird Window**:
   - Contains mail tabs where users select messages
   - Selection state is maintained here

2. **Extension Windows/Popups**:
   - When your extension opens a popup window
   - Needs to query the main window to find selections

## Proper Cross-Window Selection Access

To reliably access selected emails from active tabs only:

```javascript
async function getSelectedEmailsFromActiveTabs() {
  // Get all windows
  const allWindows = await browser.windows.getAll();
  const normalWindows = allWindows.filter(win => win.type === 'normal');
  
  // Find focused window if any
  const focusedWindow = normalWindows.find(win => win.focused);
  
  let activeTabs = [];
  if (focusedWindow) {
    // If there's a focused window, check its active mail tabs
    activeTabs = await browser.mailTabs.query({ 
      active: true, 
      windowId: focusedWindow.id 
    });
  } else if (normalWindows.length > 0) {
    // If no focused window, check active tabs in all normal windows
    for (const win of normalWindows) {
      const tabs = await browser.mailTabs.query({ 
        active: true, 
        windowId: win.id 
      });
      activeTabs.push(...tabs);
    }
  }
  
  // Get selected emails from active tabs
  let selectedEmails = [];
  for (const tab of activeTabs) {
    try {
      const selected = await browser.mailTabs.getSelectedMessages(tab.id);
      if (selected?.messages?.length > 0) {
        selectedEmails.push(...selected.messages.map(msg => ({
          id: msg.id,
          subject: msg.subject,
          author: msg.author,
          date: msg.date,
          tabId: tab.id
        })));
      }
    } catch (err) {
      console.error(`Error getting selected messages from tab ${tab.id}:`, err);
    }
  }
  
  return selectedEmails;
}
```

## Important Properties of Selected Emails

When working with selected emails, the following properties are particularly useful:

1. **Message Properties**:
   - `id`: Unique identifier for the message
   - `subject`: Email subject line
   - `author`: Sender's email address or name
   - `date`: When the email was sent
   - `folder`: The folder containing the message

2. **Tab Information**:
   - `tabId`: The ID of the mail tab where messages are selected

## Selection Context Parameters

When requesting selected emails through message handlers, you can use parameters to control the behavior:

```javascript
// Active tabs only (default) - only get selections from currently active tabs
browser.runtime.sendMessage({
  type: 'getSelectedEmails',
  activeTabsOnly: true  // Can omit as this is the default
});

// All tabs - get all selected emails regardless of active state
browser.runtime.sendMessage({
  type: 'getSelectedEmails',
  activeTabsOnly: false
});
```

This flexibility allows your extension to choose the most appropriate context for each use case.

## Selection State Considerations

Key points about message selection in Thunderbird:

1. **Selection Persistence**:
   - Selection state is maintained per mail tab
   - Selections persist until changed by the user or programmatically

2. **Selection Changes**:
   - Listen for selection changes with `browser.mailTabs.onSelectedMessagesChanged`
   - Selection can change when the user clicks different messages or uses keyboard shortcuts

3. **Multiple Mail Tabs**:
   - Each mail tab maintains its own selection state
   - Need to check all mail tabs to find all selected messages

## Debugging Tips

When debugging selected email issues:

1. Check if your code is running in a popup/standalone window (and therefore in a different window context)
2. Verify which tabs are considered "active" in your current context
3. Use proper error handling when accessing mail tabs
4. Remember that mail tabs only exist in normal windows, not in popup windows
5. Consider logging the window ID, tab ID, and active state to understand the context

## Common Issues and Solutions

1. **No emails found when clearly selected**
   - Check if you're querying the correct tab type (mail tabs only)
   - Verify the tab is active if using activeTabsOnly=true
   - Ensure you're looking in the correct window

2. **Getting selections from wrong tab**
   - Focus might be in a different window than expected
   - Multiple mail tabs might be open, but only one is active

3. **Selection state not updating**
   - Thunderbird doesn't fire events for all selection changes
   - May need to manually query again when user actions suggest selection changes

## Example: Testing Selected Emails

```javascript
// Example test function for debug purposes
async function testSelectedEmails() {
  try {
    // Check if we're in a standalone window
    const currentWindow = await browser.windows.getCurrent();
    console.log('Current window type:', currentWindow.type);
    
    // Get all mail tabs
    const allMailTabs = await browser.mailTabs.query({});
    console.log('Found mail tabs:', allMailTabs.length);
    
    // Check each mail tab for selected messages
    for (const tab of allMailTabs) {
      try {
        const selected = await browser.mailTabs.getSelectedMessages(tab.id);
        if (selected && selected.messages && selected.messages.length > 0) {
          console.log(`Tab ${tab.id} has ${selected.messages.length} selected messages`);
        } else {
          console.log(`Tab ${tab.id} has no selected messages`);
        }
      } catch (error) {
        console.error(`Error checking tab ${tab.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error testing selected emails:', error);
  }
}
```

This robust approach ensures that your extension can access selected emails from any context, including standalone windows.