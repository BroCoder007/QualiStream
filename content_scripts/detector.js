// content_scripts/detector.js

const STREAM_MIME_TYPES = [
  'application/x-mpegURL',
  'application/dash+xml',
  'video/mp4',
  'video/webm'
];

const KNOWN_STREAMING_DOMAINS = [
  'youtube.com', 'twitch.tv', 'netflix.com', 'primevideo.com',
  'disneyplus.com', 'hbomax.com', 'hulu.com', 'peacocktv.com',
  'paramountplus.com', 'crunchyroll.com', 'vimeo.com', 'dailymotion.com'
];

function isStreamingDomain() {
  return KNOWN_STREAMING_DOMAINS.some(d => location.hostname.includes(d));
}

function isLivelyVideo(video) {
  if (!video || video.tagName !== 'VIDEO') return false;
  const isPlaying = !video.paused && !video.ended && video.readyState >= 2;
  return isPlaying;
}

function findActiveVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  // Prefer largest visible video (most likely the main player)
  return videos
    .filter(v => v.offsetWidth > 100 && v.offsetHeight > 100)
    .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))
    .find(isLivelyVideo) || null;
}

// Poll and report stream state to service worker
let lastStreamState = false;

function checkAndReport() {
  const video = findActiveVideo();
  const isStreaming = !!video;
  if (isStreaming !== lastStreamState) {
    lastStreamState = isStreaming;
    chrome.runtime.sendMessage({
      type: 'STREAM_STATUS_CHANGE',
      isStreaming,
      videoInfo: video ? {
        width: video.videoWidth,
        height: video.videoHeight,
        src: video.currentSrc
      } : null
    });
  }
}

// Observe DOM mutations for dynamically loaded players (SPAs)
const observer = new MutationObserver(() => checkAndReport());
observer.observe(document.body, { childList: true, subtree: true });

// Poll every 2 seconds as a safety net
setInterval(checkAndReport, 2000);
checkAndReport();

// Listen for enhancement toggle from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_ENHANCEMENT') {
    if (msg.enabled) {
      injectEnhancer();
    } else {
      removeEnhancer();
    }
  }
});

function injectEnhancer() {
  const video = findActiveVideo();
  if (!video) return;
  // Inject the enhancer script into the page's JS context
  const script = document.createElement('script');
  script.type = 'module';
  const selector = getUniqueSelector(video);
  script.src = chrome.runtime.getURL('gpu_pipeline/webgpu_upscaler.js') + '?videoSelector=' + encodeURIComponent(selector);
  document.documentElement.appendChild(script);
}

function removeEnhancer() {
  window.postMessage({ type: 'SQE_DISABLE' }, '*');
  document.getElementById('sqe-canvas-overlay')?.remove();
}

function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.className) return `video.${[...el.classList].join('.')}`;
  return 'video';
}
