// popup/popup.js

const toggle = document.getElementById('enhancementToggle');
const statusBadge = document.getElementById('streamStatus');
const gpuInfo = document.getElementById('gpuInfo');
const sharpSlider = document.getElementById('sharpness');
const sharpVal = document.getElementById('sharpVal');
const denoiseSlider = document.getElementById('denoise');
const denoiseVal = document.getElementById('denoiseVal');

// Load current state from service worker
chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (state) => {
  if (!state) return;

  if (state.isStreaming) {
    statusBadge.textContent = `Streaming: ${state.videoInfo?.width}×${state.videoInfo?.height}`;
    statusBadge.className = 'badge badge--on';
    toggle.disabled = false;
  }

  toggle.checked = state.enhancementEnabled;
});

// Load saved settings
chrome.storage.sync.get(['sharpness', 'denoise'], (settings) => {
  if (settings.sharpness) {
    sharpSlider.value = settings.sharpness;
    sharpVal.textContent = settings.sharpness;
  }
  if (settings.denoise) {
    denoiseSlider.value = settings.denoise;
    denoiseVal.textContent = settings.denoise;
  }
});

// Toggle enhancement
toggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'SET_ENHANCEMENT', enabled: toggle.checked });
});

// Sliders
sharpSlider.addEventListener('input', () => {
  sharpVal.textContent = sharpSlider.value;
  chrome.storage.sync.set({ sharpness: parseFloat(sharpSlider.value) });
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', sharpness: parseFloat(sharpSlider.value) }).catch(() => {});
    }
  });
});

denoiseSlider.addEventListener('input', () => {
  denoiseVal.textContent = denoiseSlider.value;
  chrome.storage.sync.set({ denoise: parseFloat(denoiseSlider.value) });
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', denoise: parseFloat(denoiseSlider.value) }).catch(() => {});
    }
  });
});

document.getElementById('optionsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
