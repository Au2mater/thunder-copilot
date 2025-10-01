// compose-inject-button.js
// Injects an Edit Draft button into Thunderbird compose windows

(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectEditDraftButton);
  } else {
    injectEditDraftButton();
  }

  function injectEditDraftButton() {
    // Avoid duplicate buttons
    if (document.getElementById('copilot-edit-draft-btn')) return;

    // Find compose toolbar (fallback to body if not found)
    const toolbar = document.querySelector('toolbar, .toolbar, #composeToolbar2, body');
    if (!toolbar) return;

    // Create button
    const btn = document.createElement('button');
    btn.id = 'copilot-edit-draft-btn';
    btn.textContent = 'Edit with Copilot';
    btn.style.marginLeft = '8px';
    btn.style.background = '#4b8bf4';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '3px';
    btn.style.padding = '4px 10px';
    btn.style.cursor = 'pointer';

    // Create input (hidden by default)
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Describe your edit...';
    input.id = 'copilot-edit-draft-input';
    input.style.display = 'none';
    input.style.marginLeft = '8px';
    input.style.width = '250px';

    // Show input when button clicked
    btn.addEventListener('click', () => {
      input.style.display = input.style.display === 'none' ? 'inline-block' : 'none';
      if (input.style.display !== 'none') input.focus();
    });

    // Handle input submit (Enter key)
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        // Send message to background to open Copilot edit window
        browser.runtime.sendMessage({
          type: 'openCopilotEditDraft',
          editPrompt: input.value.trim()
        });
        input.value = '';
        input.style.display = 'none';
      }
    });

    toolbar.appendChild(btn);
    toolbar.appendChild(input);
  }
})();
