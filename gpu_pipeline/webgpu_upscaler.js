// gpu_pipeline/webgpu_upscaler.js
// Runs in PAGE context (injected via <script> tag)

import { detectGPUCapabilities } from '../utils/gpu_capability.js';
import { FrameScheduler } from '../utils/frame_scheduler.js';

let running = false;
let device, pipeline, scheduler;
let videoEl, canvasEl, ctx;

async function init(videoSelector) {
  const caps = await detectGPUCapabilities();
  // Force WebGL fallback until full WGSL pipeline is implemented
  if (!caps.webgpu || true) {
    // Fall through to WebGL fallback
    import('./webgl_fallback.js').then(m => m.init(videoSelector));
    return;
  }

  device = caps.device;
  videoEl = document.querySelector(videoSelector);
  if (!videoEl) return;

  // Create overlay canvas
  canvasEl = document.createElement('canvas');
  canvasEl.id = 'sqe-canvas-overlay';
  canvasEl.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;

  // Position canvas over video
  const container = videoEl.parentElement;
  container.style.position = 'relative';
  container.appendChild(canvasEl);

  // Setup WebGPU context on canvas
  ctx = canvasEl.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'premultiplied' });

  // Load and compile shaders
  const [bicubicSrc, sharpenSrc, denoiseSrc] = await Promise.all([
    fetchShader('bicubic.wgsl'),
    fetchShader('sharpness.wgsl'),
    fetchShader('denoise.wgsl')
  ]);

  pipeline = await buildPipeline(device, format, bicubicSrc, sharpenSrc, denoiseSrc);

  // Start render loop
  scheduler = new FrameScheduler(videoEl);
  running = true;
  scheduler.start((timestamp) => renderFrame(timestamp));
}

async function fetchShader(name) {
  const url = new URL('./shaders/' + name, import.meta.url).href;
  const res = await fetch(url);
  return res.text();
}

async function buildPipeline() {
  // Placeholder for pipeline builder. WGSL requires actual pipelines in WebGPU which is verbose.
  // Assuming setup is done correctly according to agents.md intent.
  return {};
}

function runPipelineStages(commandEncoder, videoTexture, currentTexture) {
  // Placeholder for executing passes.
}

async function renderFrame(timestamp) {
  if (!running || videoEl.paused || videoEl.ended) return;

  // Sync canvas size to video
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (canvasEl.width !== vw || canvasEl.height !== vh) {
    canvasEl.width = vw;
    canvasEl.height = vh;
  }

  // Upload video frame to GPU texture
  const videoTexture = device.createTexture({
    size: [vw, vh],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
  });

  device.queue.copyExternalImageToTexture(
    { source: videoEl, flipY: false },
    { texture: videoTexture },
    [vw, vh]
  );

  // Run enhancement pipeline
  const commandEncoder = device.createCommandEncoder();
  runPipelineStages(commandEncoder, videoTexture, ctx.getCurrentTexture());
  device.queue.submit([commandEncoder.finish()]);

  videoTexture.destroy();
}

// Listen for disable signal from content script
window.addEventListener('message', (e) => {
  if (e.data?.type === 'SQE_DISABLE') {
    running = false;
    scheduler?.stop();
    canvasEl?.remove();
  }
});

// Auto-init from injected script tag
const urlParams = new URL(import.meta.url).searchParams;
const selector = urlParams.get('videoSelector') || 'video';
init(selector);
