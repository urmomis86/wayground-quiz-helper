// Background Service Worker for Quiz Answer Finder Extension

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Quiz Answer Finder with RL installed');
  
  // Initialize storage with defaults
  chrome.storage.local.get(['QAF_ENABLED'], (result) => {
    if (result.QAF_ENABLED === undefined) {
      chrome.storage.local.set({ QAF_ENABLED: true });
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request);
  
  if (request.action === 'captureAndAnswer') {
    // Handle vision-based question answering
    sendResponse({ success: false, message: 'Vision capture not implemented' });
    return true;
  }
  
  sendResponse({ success: true });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('[Background] Extension icon clicked on tab:', tab.url);
  // Open options page only when user clicks icon
  chrome.runtime.openOptionsPage();
});

console.log('[Background] Service worker loaded and active');
