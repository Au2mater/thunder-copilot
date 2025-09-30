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