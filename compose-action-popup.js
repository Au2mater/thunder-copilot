  // Listen for overwrite-draft message from iframe
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'copilot-overwrite-draft') {
      await browser.runtime.sendMessage({ type: 'overwriteDraftWithCopilot', newBody: event.data.newBody });
      window.close();
    }
  });
// compose-action-popup.js
// Handles Copilot edit draft popup logic

document.addEventListener('DOMContentLoaded', () => {
  const editPrompt = document.getElementById('editPrompt');
  const submitBtn = document.getElementById('submitBtn');

  let draftOriginal = '';
  // Get current draft content from background
  browser.runtime.sendMessage({ type: 'getCurrentDraftForEdit' }).then(res => {
    if (res && res.ok) {
      draftOriginal = res.body || '';
    }
  });

  function openChatWindow() {
    const prompt = editPrompt.value.trim();
    if (!prompt) return;
    // Open index.html in a new window with draft, tool, and prompt
    const url = browser.runtime.getURL(`index.html?editDraft=1&draftBody=${encodeURIComponent(draftOriginal)}&prompt=${encodeURIComponent(prompt)}&editDraftTool=1`);
    window.open(url, '_blank', 'width=600,height=700,resizable=yes,scrollbars=yes');
    window.close();
  }

  submitBtn.addEventListener('click', openChatWindow);
  editPrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      openChatWindow();
    }
  });

  useAnswerBtn.addEventListener('click', async () => {
    // Overwrite draft in compose window
    await browser.runtime.sendMessage({
      type: 'overwriteDraftWithCopilot',
      newBody: draftEdited
    });
    window.close();
  });

  showDiffBtn.addEventListener('click', () => {
    // Simple diff (line by line)
    const orig = draftOriginal.split('\n');
    const edit = draftEdited.split('\n');
    let diff = '';
    for (let i = 0; i < Math.max(orig.length, edit.length); i++) {
      if (orig[i] !== edit[i]) {
        diff += `- ${orig[i] || ''}\n+ ${edit[i] || ''}\n`;
      } else {
        diff += `  ${orig[i] || ''}\n`;
      }
    }
    diffDiv.textContent = diff;
    diffDiv.style.display = 'block';
  });
});
