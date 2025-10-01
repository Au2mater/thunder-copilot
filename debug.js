// Debug functionality for Thunder Copilot extension

document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const refreshBtn = document.getElementById('refreshBtn');
  const copyLogBtn = document.getElementById('copyLogBtn');
  // Update button text to indicate it produces JSON
  if (copyLogBtn) {
    copyLogBtn.textContent = 'Copy Debug Log (JSON)';
  }
  const lastRefreshTime = document.getElementById('lastRefreshTime');
  
  // Count elements
  const windowCount = document.getElementById('windowCount');
  const tabCount = document.getElementById('tabCount');
  const mailTabCount = document.getElementById('mailTabCount');
  const messageDisplayCount = document.getElementById('messageDisplayCount');
  const selectedMessagesCount = document.getElementById('selectedMessagesCount');
  const userTabCount = document.getElementById('userTabCount');
  
  // Output elements
  const windowsOutput = document.getElementById('windowsOutput');
  const tabsOutput = document.getElementById('tabsOutput');
  const mailTabsOutput = document.getElementById('mailTabsOutput');
  const displayedMessagesOutput = document.getElementById('displayedMessagesOutput');
  const selectedMessagesOutput = document.getElementById('selectedMessagesOutput');
  const userTabsOutput = document.getElementById('userTabsOutput');
  const backgroundTestOutput = document.getElementById('backgroundTestOutput');
  
  // Toggle sections
  const toggleSections = [
    { toggle: document.getElementById('toggleWindows'), output: windowsOutput },
    { toggle: document.getElementById('toggleTabs'), output: tabsOutput },
    { toggle: document.getElementById('toggleMailTabs'), output: mailTabsOutput },
    { toggle: document.getElementById('toggleDisplayedMessages'), output: displayedMessagesOutput },
    { toggle: document.getElementById('toggleSelectedMessages'), output: selectedMessagesOutput },
    { toggle: document.getElementById('toggleUserTabs'), output: userTabsOutput },
    { toggle: document.getElementById('toggleBackgroundTests'), output: backgroundTestOutput }
  ];
  
  // Background test buttons
  const testGetCurrentEmailBtn = document.getElementById('testGetCurrentEmailBtn');
  const testGetSelectedEmailsBtn = document.getElementById('testGetSelectedEmailsBtn');
  
  // Set up section toggles
  toggleSections.forEach(section => {
    section.toggle.addEventListener('click', () => {
      section.output.style.display = section.output.style.display === 'none' ? 'block' : 'none';
    });
  });
  
  // Refresh all data
  refreshBtn.addEventListener('click', refreshAllData);
  
  // Copy log button
  copyLogBtn.addEventListener('click', () => {
    try {
      // Parse each section from text to JSON
      let windows = JSON.parse(windowsOutput.textContent);
      let tabs = JSON.parse(tabsOutput.textContent);
      let mailTabs = JSON.parse(mailTabsOutput.textContent);
      let displayedMessages = JSON.parse(displayedMessagesOutput.textContent);
      let selectedMessages = JSON.parse(selectedMessagesOutput.textContent);
      
      // Create a single JSON object with all data
      const debugData = {
        time: new Date().toISOString(),
        windows: windows,
        tabs: tabs,
        mailTabs: mailTabs,
        displayedMessages: displayedMessages,
        selectedMessages: selectedMessages
      };
      
      // Format as proper JSON
      const jsonContent = JSON.stringify(debugData, null, 2);
      
      // Copy to clipboard
      navigator.clipboard.writeText(jsonContent).then(() => {
        copyLogBtn.textContent = 'Copied JSON!';
        setTimeout(() => {
          copyLogBtn.textContent = 'Copy Debug Log (JSON)';
        }, 2000);
      });
    } catch (error) {
      console.error('Error creating JSON debug log:', error);
      copyLogBtn.textContent = 'Error!';
      setTimeout(() => {
        copyLogBtn.textContent = 'Copy Debug Log (JSON)';
      }, 2000);
    }
  });
  
  // Test background functions
  testGetCurrentEmailBtn.addEventListener('click', async () => {
    try {
      backgroundTestOutput.textContent = 'Testing getCurrentEmail()...\n';
      const result = await browser.runtime.sendMessage({ 
        type: 'getCurrentDisplayedEmailForContext',
        fromStandaloneWindow: true 
      });
      
      if (result && result.ok && result.message) {
        backgroundTestOutput.textContent += `Success! Found email: ${result.message.subject}\n`;
        backgroundTestOutput.textContent += JSON.stringify(result.message, null, 2);
      } else {
        backgroundTestOutput.textContent += `No email found or error: ${result ? result.error || 'Unknown error' : 'No response'}\n`;
      }
    } catch (error) {
      backgroundTestOutput.textContent += `Error: ${error.message}\n`;
    }
  });
  
  testGetSelectedEmailsBtn.addEventListener('click', async () => {
    try {
      backgroundTestOutput.textContent = 'Testing getSelectedEmails()...\n';
      backgroundTestOutput.textContent += 'Checking active tabs only (default behavior):\n';
      
      const result = await browser.runtime.sendMessage({ 
        type: 'getCurrentSelectedEmailsForContext',
        fromStandaloneWindow: true,
        activeTabsOnly: true // Only get from active tabs (this is the default)
      });
      
      if (result && result.ok) {
        if (result.messages && result.messages.length > 0) {
          backgroundTestOutput.textContent += `Success! Found ${result.messages.length} selected emails in active tabs\n`;
          backgroundTestOutput.textContent += JSON.stringify(result.messages, null, 2);
          backgroundTestOutput.textContent += '\n\n';
        } else {
          backgroundTestOutput.textContent += 'No emails are currently selected in active tabs\n\n';
        }
        
        // Also check all tabs for comparison
        backgroundTestOutput.textContent += 'Checking all tabs (including non-active):\n';
        const allTabsResult = await browser.runtime.sendMessage({ 
          type: 'getCurrentSelectedEmailsForContext',
          fromStandaloneWindow: true,
          activeTabsOnly: false // Get from all tabs
        });
        
        if (allTabsResult && allTabsResult.ok) {
          if (allTabsResult.messages && allTabsResult.messages.length > 0) {
            backgroundTestOutput.textContent += `Found ${allTabsResult.messages.length} selected emails across all tabs\n`;
            backgroundTestOutput.textContent += JSON.stringify(allTabsResult.messages, null, 2);
          } else {
            backgroundTestOutput.textContent += 'No emails are selected in any tab\n';
          }
        }
      } else {
        backgroundTestOutput.textContent += `Error: ${result ? result.error || 'Unknown error' : 'No response'}\n`;
      }
    } catch (error) {
      backgroundTestOutput.textContent += `Error: ${error.message}\n`;
    }
  });
  
  // Helper to format JSON output
  function formatJSON(obj) {
    try {
      // Handle circular references by using a replacer function
      const seen = new WeakSet();
      const replacer = (key, value) => {
        // If value is an object and not null
        if (typeof value === 'object' && value !== null) {
          // Check for circular reference
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      };
      
      return JSON.stringify(obj, replacer, 2);
    } catch (e) {
      console.error('JSON formatting error:', e, obj);
      // Return empty object instead of error text to maintain valid JSON
      return '{}';
    }
  }
  
  // Helper to format date
  function formatDateString() {
    const now = new Date();
    return now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0');
  }
  
  // Update refresh time
  function updateRefreshTime() {
    lastRefreshTime.textContent = `Last refreshed: ${formatDateString()}`;
  }
  
  // Get all windows
  async function getWindowsInfo() {
    try {
      const allWindows = await browser.windows.getAll({ populate: true });
      windowsOutput.textContent = formatJSON(allWindows);
      windowCount.textContent = allWindows.length;
      return allWindows;
    } catch (error) {
      windowsOutput.textContent = `Error getting windows: ${error.message}`;
      windowCount.textContent = '?';
      return [];
    }
  }
  
  // Get all tabs
  async function getTabsInfo() {
    try {
      const allTabs = await browser.tabs.query({});
      tabsOutput.textContent = formatJSON(allTabs);
      tabCount.textContent = allTabs.length;
      
      // Count tab types
      const mailTabs = allTabs.filter(tab => tab.type === 'mail');
      // We'll update messageDisplayCount in getDisplayedMessagesInfo() with the actual displayed messages count
      // This just sets the mail tab count
      mailTabCount.textContent = mailTabs.length;
      
      return allTabs;
    } catch (error) {
      tabsOutput.textContent = `Error getting tabs: ${error.message}`;
      tabCount.textContent = '?';
      mailTabCount.textContent = '?';
      // We'll handle messageDisplayCount in getDisplayedMessagesInfo()
      return [];
    }
  }
  
  // Get mail tabs
  async function getMailTabsInfo() {
    try {
      const allMailTabs = await browser.mailTabs.query({});
      mailTabsOutput.textContent = formatJSON(allMailTabs);
      return allMailTabs;
    } catch (error) {
      mailTabsOutput.textContent = `Error getting mail tabs: ${error.message}`;
      return [];
    }
  }
  
  // Get displayed messages
  async function getDisplayedMessagesInfo() {
    try {
      displayedMessagesOutput.textContent = 'Fetching displayed messages...\n';
      const tabs = await browser.tabs.query({});
      const messageTabs = tabs.filter(tab => tab.type === 'messageDisplay' || tab.type === 'mail');
      
      if (messageTabs.length === 0) {
        displayedMessagesOutput.textContent = 'No message display tabs found';
        messageDisplayCount.textContent = '0';
        return [];
      }
      
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
          // Just skip tabs that don't have displayed messages
        }
      }
      
      if (displayedMessages.length === 0) {
        displayedMessagesOutput.textContent = 'No displayed messages found';
        messageDisplayCount.textContent = '0';
      } else {
        displayedMessagesOutput.textContent = formatJSON(displayedMessages);
        // Update the count to show the actual number of displayed messages
        messageDisplayCount.textContent = displayedMessages.length;
      }
      
      return displayedMessages;
    } catch (error) {
      displayedMessagesOutput.textContent = `Error getting displayed messages: ${error.message}`;
      messageDisplayCount.textContent = '?';
      return [];
    }
  }
  
  // Get selected messages
  async function getSelectedMessagesInfo() {
    try {
      selectedMessagesOutput.textContent = 'Fetching selected messages...\n';
      const mailTabs = await browser.mailTabs.query({});
      
      if (mailTabs.length === 0) {
        selectedMessagesOutput.textContent = 'No mail tabs found';
        selectedMessagesCount.textContent = '0';
        return [];
      }
      
      let selectedMessages = [];
      
      for (const tab of mailTabs) {
        try {
          const selected = await browser.mailTabs.getSelectedMessages(tab.id);
          if (selected && selected.messages && selected.messages.length > 0) {
            selectedMessages.push({
              tabId: tab.id,
              messages: selected.messages
            });
          }
        } catch (err) {
          // Just skip tabs that throw errors
        }
      }
      
      if (selectedMessages.length === 0) {
        selectedMessagesOutput.textContent = 'No selected messages found';
        selectedMessagesCount.textContent = '0';
      } else {
        const totalCount = selectedMessages.reduce((acc, item) => acc + item.messages.length, 0);
        selectedMessagesCount.textContent = totalCount;
        selectedMessagesOutput.textContent = formatJSON(selectedMessages);
      }
      
      return selectedMessages;
    } catch (error) {
      selectedMessagesOutput.textContent = `Error getting selected messages: ${error.message}`;
      selectedMessagesCount.textContent = '?';
      return [];
    }
  }
  
  // Analyze property statistics
  function analyzePropertyStats(data) {
    // Create stat containers
    const stats = document.getElementById('propertyStatsOutput');
    if (!stats) return;
    
    // Clear previous stats
    stats.innerHTML = '';
    
    // Windows by type
    const windowsByType = {};
    data.windows.forEach(win => {
      const type = win.type || 'unknown';
      windowsByType[type] = (windowsByType[type] || 0) + 1;
    });
    
    // Windows with title
    const windowsWithTitle = data.windows.filter(win => win.title).length;
    
    // Windows with title "Mozilla Thunderbird" (phantom windows)
    const phantomWindows = data.windows.filter(win => 
      win.title === "Mozilla Thunderbird" && 
      win.tabs?.length === 1 && 
      win.tabs[0]?.url === "about:blank"
    );
    const mozillaThunderbirdWindows = phantomWindows.length;
    
    // Pre-calculate window mappings for tab analysis
    const windowMap = {};
    data.windows.forEach(win => {
      windowMap[win.id] = win;
    });
    
    // Tabs by type
    const tabsByType = {};
    data.tabs.forEach(tab => {
      const type = tab.type || 'unknown';
      tabsByType[type] = (tabsByType[type] || 0) + 1;
    });
    
    // Tabs with title
    const tabsWithTitle = data.tabs.filter(tab => tab.title).length;
    
    // Create stats HTML
    let statsHtml = '<h3>Window & Tab Statistics</h3>';
    
    statsHtml += '<div class="stat-section"><h4>Windows by Type</h4><ul>';
    for (const [type, count] of Object.entries(windowsByType)) {
      statsHtml += `<li><strong>${type}:</strong> ${count}</li>`;
    }
    statsHtml += `<li><strong>With title:</strong> ${windowsWithTitle} of ${data.windows.length}</li>`;
    statsHtml += `<li><strong>With title "Mozilla Thunderbird" (phantom):</strong> ${mozillaThunderbirdWindows}</li>`;
    statsHtml += '</ul></div>';
    
    statsHtml += '<div class="stat-section"><h4>Tabs by Type</h4><ul>';
    for (const [type, count] of Object.entries(tabsByType)) {
      statsHtml += `<li><strong>${type}:</strong> ${count}</li>`;
    }
    statsHtml += `<li><strong>With title:</strong> ${tabsWithTitle} of ${data.tabs.length}</li>`;
    statsHtml += '</ul></div>';
    
    // Displayed Messages section
    statsHtml += '<div class="stat-section"><h4>Displayed Messages</h4><ul>';
    
    // Group displayed messages by tab type
    const msgByTabType = {};
    if (data.displayedMessages && data.displayedMessages.length > 0) {
      data.displayedMessages.forEach(item => {
        const tabType = item.tabType || 'unknown';
        msgByTabType[tabType] = (msgByTabType[tabType] || 0) + 1;
      });
      
      statsHtml += `<li><strong>Total displayed messages:</strong> ${data.displayedMessages.length}</li>`;
      
      // Count by tab type
      for (const [type, count] of Object.entries(msgByTabType)) {
        statsHtml += `<li><strong>In ${type} tabs:</strong> ${count}</li>`;
      }
      
      // List each displayed message with details
      statsHtml += `<li class="separator" style="border-top: 1px solid #ddd; margin: 10px 0;"></li>`;
      data.displayedMessages.forEach(item => {
        const msg = item.message;
        const tab = data.tabs.find(t => t.id === item.tabId);
        const window = tab ? data.windows.find(w => w.id === tab.windowId) : null;
        const windowTitle = window ? window.title : 'Unknown window';
        
        statsHtml += `<li>
          <strong>${msg.subject || 'No subject'}</strong> 
          <ul>
            <li>From: ${msg.author}</li>
            <li>Tab type: ${item.tabType}</li>
            <li>Window: ${windowTitle}</li>
            <li>Folder: ${msg.folder?.name || 'Unknown'}</li>
          </ul>
        </li>`;
      });
    } else {
      statsHtml += '<li><strong>No displayed messages found</strong></li>';
    }
    statsHtml += '</ul></div>';
    
    // User Visible Tabs section
    statsHtml += '<div class="stat-section"><h4>User Visible Tabs</h4>';
    
    // Get IDs of phantom windows to filter out their tabs
    const phantomWindowIds = phantomWindows.map(win => win.id);
    
    // Get tabs that are user-relevant (not in phantom windows)
    // Exclude 'special' tabs as per requirement
    const userRelevantTabTypes = ['mail', 'messageDisplay', 'calendar', 'tasks', 'messageCompose'];
    const userVisibleTabs = data.tabs.filter(tab => 
      userRelevantTabTypes.includes(tab.type) && 
      !phantomWindowIds.includes(tab.windowId)
    );
    
    // Group tabs by window
    const tabsByWindow = {};
    userVisibleTabs.forEach(tab => {
      if (!tabsByWindow[tab.windowId]) {
        tabsByWindow[tab.windowId] = [];
      }
      tabsByWindow[tab.windowId].push(tab);
    });
    
    // Show tab statistics
    statsHtml += `<ul>`;
    statsHtml += `<li><strong>API Tabs Total:</strong> ${data.tabs.length}</li>`;
    statsHtml += `<li><strong>Phantom Window Tabs:</strong> ${data.tabs.filter(tab => phantomWindowIds.includes(tab.windowId)).length}</li>`;
    statsHtml += `<li><strong>User Visible Tabs:</strong> ${userVisibleTabs.length}</li>`;
    statsHtml += `<li class="separator" style="border-top: 1px solid #ddd; margin: 10px 0;"></li>`;
    
    // For each window with user visible tabs
    for (const [windowId, tabs] of Object.entries(tabsByWindow)) {
      // Find the window object
      const window = data.windows.find(w => w.id === parseInt(windowId));
      if (window) {
        statsHtml += `<li><strong>Window:</strong> ${window.title || 'Untitled'} (${window.type}, id: ${window.id})</li>`;
        statsHtml += `<ul>`;
        
        // Sort tabs by index
        const sortedTabs = [...tabs].sort((a, b) => a.index - b.index);
        
        // List tabs in this window
        for (const tab of sortedTabs) {
          // For messageCompose tabs, they're typically displayed as separate windows to the user
          const specialNote = tab.type === 'messageCompose' ? ' (appears as separate window to user)' : '';
          statsHtml += `<li>${tab.title || 'Untitled'} (${tab.type}, id: ${tab.id}, index: ${tab.index})${specialNote}</li>`;
        }
        statsHtml += `</ul>`;
      }
    }
    
    statsHtml += '</ul></div>';
    
    statsHtml += '<div class="stat-section"><h4>User Visible Windows</h4><ul>';
    const visibleWindowTypes = ['normal', 'messageCompose', 'popup'];
    const userVisibleWindows = data.windows.filter(win => 
      visibleWindowTypes.includes(win.type) && 
      win.title && 
      !win.title.startsWith("hidden") &&
      !(win.title === "Mozilla Thunderbird" && 
        win.tabs?.length === 1 && 
        win.tabs[0]?.url === "about:blank")
    );
    
    // Count actually visible windows (what the user sees)
    const actuallyVisibleCount = userVisibleWindows.length;
    
    statsHtml += `<li><strong>API Windows:</strong> ${data.windows.length} total</li>`;
    statsHtml += `<li><strong>Phantom Windows:</strong> ${mozillaThunderbirdWindows} (hidden "Mozilla Thunderbird" windows)</li>`;
    statsHtml += `<li><strong>Visible Windows:</strong> ${actuallyVisibleCount}</li>`;
    statsHtml += `<li class="separator" style="border-top: 1px solid #ddd; margin: 10px 0;"></li>`;
    
    // List visible windows
    for (const win of userVisibleWindows) {
      // These windows are already filtered above, so they should all be visible
      // No need to check for phantom windows again
      statsHtml += `<li>
        <strong>${win.title}</strong> 
        (${win.type}, id: ${win.id})
      </li>`;
    }
    statsHtml += '</ul></div>';
    
    // Add to DOM
    stats.innerHTML = statsHtml;
  }

  // Get user relevant tabs
  function getUserRelevantTabs(windows, tabs) {
    // Get IDs of phantom windows to filter out their tabs
    const phantomWindowIds = windows
      .filter(win => 
        win.title === "Mozilla Thunderbird" && 
        win.tabs?.length === 1 && 
        win.tabs[0]?.url === "about:blank"
      )
      .map(win => win.id);
    
    // Get tabs that are user-relevant (not in phantom windows)
    // Exclude 'special' tabs as per requirement
    const userRelevantTabTypes = ['mail', 'messageDisplay', 'calendar', 'tasks', 'messageCompose'];
    const userVisibleTabs = tabs.filter(tab => 
      userRelevantTabTypes.includes(tab.type) && 
      !phantomWindowIds.includes(tab.windowId)
    );
    
    // Format the output
    if (userVisibleTabs.length === 0) {
      return { html: 'No user-relevant tabs found', count: 0 };
    }
    
    // Group tabs by window
    const tabsByWindow = {};
    userVisibleTabs.forEach(tab => {
      if (!tabsByWindow[tab.windowId]) {
        tabsByWindow[tab.windowId] = [];
      }
      tabsByWindow[tab.windowId].push(tab);
    });
    
    let html = '';
    
    // For each window with user visible tabs
    for (const [windowId, windowTabs] of Object.entries(tabsByWindow)) {
      // Find the window object
      const window = windows.find(w => w.id === parseInt(windowId));
      if (window) {
        html += `<div class="tab-window">`;
        html += `<h4>Window: ${window.title || 'Untitled'} (${window.type}, id: ${window.id})</h4>`;
        html += `<ul class="tab-list">`;
        
        // Sort tabs by index
        const sortedTabs = [...windowTabs].sort((a, b) => a.index - b.index);
        
        // List tabs in this window
        for (const tab of sortedTabs) {
          // For messageCompose tabs, they're typically displayed as separate windows to the user
          const specialNote = tab.type === 'messageCompose' ? ' (appears as separate window to user)' : '';
          
          html += `<li>
            ${tab.title || 'Untitled'} (${tab.type}, id: ${tab.id}, index: ${tab.index})${specialNote}
          </li>`;
        }
        html += `</ul>`;
        html += `</div>`;
      }
    }
    
    return { html, count: userVisibleTabs.length };
  }

  // Refresh all data
  async function refreshAllData() {
    try {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
      
      const results = await Promise.all([
        getWindowsInfo(),
        getTabsInfo(),
        getMailTabsInfo(),
        getDisplayedMessagesInfo(),
        getSelectedMessagesInfo()
      ]);
      
      // Analyze property stats
      const data = {
        windows: results[0],
        tabs: results[1],
        mailTabs: results[2],
        displayedMessages: results[3],
        selectedMessages: results[4]
      };
      analyzePropertyStats(data);
      
      // Update user-relevant tabs section
      const userTabs = getUserRelevantTabs(data.windows, data.tabs);
      userTabsOutput.innerHTML = userTabs.html;
      userTabCount.textContent = userTabs.count;
      
      updateRefreshTime();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh All Data';
    }
  }
  
  // Initial data load
  refreshAllData();
});