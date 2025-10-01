# Thunder Copilot Debug Documentation

This document describes the debug functionality built into the Thunder Copilot extension. The debug tools help developers understand the state of Thunderbird windows, tabs, and messages.

## Debug Features

The extension includes a comprehensive debug panel that provides:

1. Real-time information about all windows and tabs in Thunderbird
2. Details about displayed and selected email messages
3. Testing tools for background script functions
4. Ability to copy debug logs for sharing

## Enabling Debug Mode

To enable debug mode:

1. Open the extension options page
2. Scroll down to the "Developer Options" section
3. Toggle the "Enable Debug Mode" switch
4. Click "Save" to apply changes

Once enabled, a "Debug" button will appear in the top right corner of the main extension interface.

## Debug UI Overview

The debug UI is divided into several sections:

### Summary Counts

At the top of the debug interface, you'll see count indicators for:
- Number of Windows
- Total Tabs
- Mail Tabs
- Message Display Tabs
- Selected Messages

### Windows Section

Shows details about each Thunderbird window, including:
- Window ID
- Window type (normal, popup, messageCompose)
- Window dimensions and position
- Window state
- Tabs contained in each window

### Tabs Section

Lists all tabs across all windows, with details such as:
- Tab ID
- Parent window ID
- Tab type (mail, messageDisplay, content, special)
- Active/highlighted status
- URL and title

### Mail Tabs Section

Shows specialized information about mail tabs:
- Tab configuration (layout, folder modes)
- Visibility settings for different panes
- Sort order and view settings
- Currently displayed folder

### Displayed Messages Section

Lists all messages currently being displayed in any tab:
- Which tab is displaying the message
- Message details (subject, sender, date)
- Message metadata (read status, size, etc.)

### Selected Messages Section

Shows all messages currently selected by the user:
- Which tab contains the selections
- Full details of each selected message

### Background Script Tests

Allows direct testing of key background script functions:
- `getCurrentEmail()` - Tests retrieving the current displayed email
- `getSelectedEmails()` - Tests retrieving selected emails

## Refresh Functionality

The debug panel includes a "Refresh All Data" button that updates all information to reflect the current state of Thunderbird.

## Copy Log Feature

The "Copy Debug Log" button generates a formatted text log of all debug information that can be pasted into issue reports or shared with developers.

## Technical Implementation

The debug functionality is implemented across several files:

- `debug.html` - The main debug UI
- `debug.js` - JavaScript that fetches and displays debug data
- `options.js` - Handles the debug mode toggle setting
- `background.js` - Provides API access to Thunderbird data
- `index.js` - Controls the debug button display based on settings

## Debug Mode Storage

Debug mode status is stored in `browser.storage.local` under the `debugMode` key. When enabled, the debug button will be visible in the extension UI.

## Common Issues

When using the debug tool, be aware of these common issues:

1. **Tab Type Inconsistencies**: Some tabs may report incorrect types depending on their state
2. **Missing Message Content**: Full message content may not be available for all messages
3. **API Permission Requirements**: Ensure the extension has appropriate permissions
4. **Performance**: Excessive refreshing of debug data may impact performance

## Use Cases

The debug panel is particularly useful for:

1. Understanding how Thunderbird represents different window/tab states
2. Diagnosing context-related issues (why certain emails aren't accessible)
3. Exploring the data structure of messages and folders
4. Verifying that background script functions return expected data

## Data Refresh Strategy

The debug panel does not automatically refresh. To see the latest data, click the "Refresh All Data" button. This approach prevents constant API polling and potential performance impacts.