// background/service_worker.js

const tabState = new Map(); // tabId -> { isStreaming, enhancementEnabled }

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.type === 'STREAM_STATUS_CHANGE') {
    const current = tabState.get(tabId) || { enhancementEnabled: false, frames: {} };
    current.frames = current.frames || {};
    current.frames[sender.frameId] = msg.isStreaming;
    
    // It's streaming if ANY frame is streaming
    const isStreaming = Object.values(current.frames).some(v => v);
    // Keep the videoInfo if we are streaming, prioritize the active one
    const videoInfo = msg.isStreaming ? msg.videoInfo : current.videoInfo;
    
    tabState.set(tabId, { ...current, isStreaming, videoInfo });
    // Update badge
    chrome.action.setBadgeText({
      text: isStreaming ? '▶' : '',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({ color: isStreaming ? '#00C853' : '#757575', tabId });
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
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ENHANCEMENT', enabled: msg.enabled }).catch(() => {});
    });
  }
});
