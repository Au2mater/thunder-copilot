---
applyTo: '**/*.js'
---

## Thunderbird WebExtension Development Guidelines

### Critical API Differences
- Use `browser_action` in manifest, not `sidebar_action` (unsupported)
- Get displayed messages: `browser.tabs.query()` + `browser.messageDisplay.getDisplayedMessage(tabId)`
- Always use `browser.*` namespace for Thunderbird APIs

### Code Safety Requirements
- External `.js` files only - no inline scripts (CSP violations)
- Check DOM elements exist before adding listeners: `if (element) { element.addEventListener... }`
- Implement defensive error handling for all async operations


### MCP Server Usage

- If available, utilize the Thunderbird MCP server for enhanced extension debugging and automation.
- For automated testing, prefer Playwright MCP server integration to simulate user interactions and validate extension behavior.
- Always check for MCP server availability before attempting to connect, and handle connection failures gracefully.