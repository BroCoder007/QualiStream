// background/service_worker.js

const tabState = new Map(); // tabId -> { isStreaming, enhancementEnabled }

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.type === 'STREAM_STATUS_CHANGE') {
    const current = tabState.get(tabId) || { enhancementEnabled: false };
    tabState.set(tabId, { ...current, isStreaming: msg.isStreaming, videoInfo: msg.videoInfo });
    // Update badge
    chrome.action.setBadgeText({
      text: msg.isStreaming ? '▶' : '',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({ color: msg.isStreaming ? '#00C853' : '#757575', tabId });
  }
});

// Expose state to popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_TAB_STATE') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      sendResponse(tabState.get(tab?.id) || { isStreaming: false, enhancementEnabled: false });
    });
    return true; // keep channel open for async sendResponse
  }

  if (msg.type === 'SET_ENHANCEMENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return;
      const current = tabState.get(tab.id) || {};
      tabState.set(tab.id, { ...current, enhancementEnabled: msg.enabled });
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ENHANCEMENT', enabled: msg.enabled });
    });
  }
});
