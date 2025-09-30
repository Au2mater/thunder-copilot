// options.js - Settings page script

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await browser.storage.local.get('openaiApiKey');
  document.getElementById('apiKey').value = settings.openaiApiKey || '';
});

// Save settings when button is clicked
document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const statusDiv = document.getElementById('status');
  
  try {
    await browser.storage.local.set({ openaiApiKey: apiKey });
    
    statusDiv.textContent = apiKey ? 'Settings saved successfully!' : 'API key cleared.';
    statusDiv.className = 'status success';
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  } catch (error) {
    statusDiv.textContent = 'Error saving settings: ' + error.message;
    statusDiv.className = 'status error';
  }
});
