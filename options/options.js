// options/options.js
const DEFAULT_SETTINGS = {
  sharpness: 1.2,          // Sharpen strength (0–3)
  denoise: 0.3,            // Temporal blend factor (0–1)
  upscaleMode: 'bicubic',  // 'bicubic' | 'lanczos' | 'nearest'
  hdrTonemap: false,       // Enable HDR tonemapping (for HDR source streams)
  targetFPS: 'auto',       // 'auto' | 30 | 60
  gpuPreference: 'high-performance',  // 'high-performance' | 'low-power'
  autoEnableOnStream: false,          // Toggle on automatically when stream detected
  excludedDomains: [],                // Never enhance on these domains
};

// Render options UI dynamically (simplified for brevity)
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  const container = document.getElementById('settingsContainer');
  for (const [key, value] of Object.entries(settings)) {
    const label = document.createElement('label');
    label.textContent = `${key}: ${JSON.stringify(value)}`;
    container.appendChild(label);
  }
});
