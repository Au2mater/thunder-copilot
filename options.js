// options.js - Enhanced settings page script

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const keyIndicator = document.getElementById('keyIndicator');

// Validate API key format
function validateApiKey(key) {
  if (!key) return { valid: false, message: 'Please enter an API key' };
  if (!key.startsWith('sk-')) return { valid: false, message: 'API key should start with "sk-"' };
  if (key.length < 40) return { valid: false, message: 'API key appears to be too short' };
  return { valid: true, message: 'API key format looks correct' };
}

// Update key indicator
function updateKeyIndicator() {
  const key = apiKeyInput.value.trim();
  const validation = validateApiKey(key);
  
  if (!key) {
    keyIndicator.textContent = '';
    apiKeyInput.style.borderColor = '#e1e5e9';
  } else if (validation.valid) {
    keyIndicator.textContent = '✅';
    apiKeyInput.style.borderColor = '#28a745';
  } else {
    keyIndicator.textContent = '❌';
    apiKeyInput.style.borderColor = '#dc3545';
  }
}

// Real-time validation
apiKeyInput.addEventListener('input', updateKeyIndicator);

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await browser.storage.local.get('openaiApiKey');
    if (settings.openaiApiKey) {
      apiKeyInput.value = settings.openaiApiKey;
      updateKeyIndicator();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading saved settings', 'error');
  }
});

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 4000);
  }
}

// Save settings when button is clicked
saveBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const validation = validateApiKey(apiKey);
  
  if (apiKey && !validation.valid) {
    showStatus(validation.message, 'error');
    return;
  }
  
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    
    await browser.storage.local.set({ openaiApiKey: apiKey });
    
    if (apiKey) {
      showStatus('✅ API key saved successfully! You can now use AI features.', 'success');
    } else {
      showStatus('🗑️ API key cleared.', 'success');
    }
    
    updateKeyIndicator();
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('❌ Error saving settings: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save API Key';
  }
});

// Enter key to save
apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    saveBtn.click();
  }
});
