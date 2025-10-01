# Debug Tools Documentation

The Thunder Copilot extension includes a debugging interface that allows developers to inspect Thunderbird's state, including windows, tabs, displayed messages, and selected messages. This tool is essential for understanding the context in which the extension is operating and diagnosing issues.

## Accessing the Debug Tools

There are two ways to access the debug tools:

1. **From the Extension UI**: When debug mode is enabled in the options, a Debug button appears in the top-right corner of the extension's main interface.
2. **Directly from the Extension URL**: Open `moz-extension://{extension-id}/debug.html`

## Debug Interface

The debug interface provides a comprehensive view of Thunderbird's current state, including:

1. **Windows**: All open Thunderbird windows and their properties
2. **Tabs**: All tabs across all windows
3. **Mail Tabs**: Specialized mail folder tabs with additional properties
4. **Displayed Messages**: Messages currently being displayed in message tabs or mail tabs
5. **Selected Messages**: Messages selected by the user in mail tabs

Each section can be expanded or collapsed for easier navigation.

## JSON Debug Data Format

When using "Copy Debug Log (JSON)", the tool generates a valid JSON object with the following structure:

```json
{
  "time": "2025-10-01T16:46:52.878Z",
  "windows": [
    {
      "id": 1,
      "focused": false,
      "type": "normal",
      "title": "Window Title",
      "tabs": [
        {
          "id": 1,
          "active": true,
          "type": "mail",
          "url": "...",
          "title": "Tab Title"
        }
      ]
    }
  ],
  "tabs": [
    {
      "id": 1,
      "windowId": 1,
      "active": true,
      "type": "mail",
      "url": "..."
    }
  ],
  "mailTabs": [
    {
      "windowId": 1,
      "active": true,
      "id": 1,
      "folderPaneVisible": true,
      "displayedFolder": {
        "id": "account1://INBOX",
        "name": "Inbox"
      }
    }
  ],
  "displayedMessages": [
    {
      "tabId": 1,
      "tabType": "mail",
      "message": {
        "id": 18,
        "subject": "Message Subject",
        "author": "sender@example.com"
      }
    }
  ],
  "selectedMessages": [
    {
      "tabId": 1,
      "messages": [
        {
          "id": 18,
          "subject": "Message Subject",
          "author": "sender@example.com"
        }
      ]
    }
  ]
}
```

This format makes it easy to programmatically analyze the extension's behavior and Thunderbird's state.

## Using Debug Data

The debug data can be used for several purposes:

1. **Diagnosing Issues**: Identify unexpected window or tab configurations
2. **Understanding Context**: See which messages are displayed/selected
3. **API Testing**: Verify the behavior of Thunderbird WebExtension APIs
4. **Development**: Reference for implementing features that interact with Thunderbird

## Background API Tests

The debug interface also includes buttons to test specific background script functions:

1. **Test Get Current Email**: Tests the `getCurrentDisplayedEmailForContext` function
2. **Test Get Selected Emails**: Tests the `getCurrentSelectedEmailsForContext` function

These tests are useful for verifying that the context-gathering functions work correctly.

## Integration with ThunderbirdAPI Wrapper

The debug data structure aligns with the object formats used in the `thunderbird-api.js` wrapper, making it easier to correlate the raw API data with the structured responses from the wrapper.

## Tips for Effective Debugging

1. **Refresh Before Copying**: Always click "Refresh All Data" before copying the debug log to ensure up-to-date information.
2. **Focus on Relevant Sections**: Expand only the sections you're interested in to reduce visual clutter.
3. **Compare Before/After States**: Take snapshots before and after performing actions to see what changed.
4. **Look for Active Tab**: Check the `active: true` property to identify the current tab.
5. **Verify Window Types**: Pay attention to the `type` property of windows to understand their purpose.