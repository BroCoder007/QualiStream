// utils/gpu_capability.js

export async function detectGPUCapabilities() {
  const caps = {
    webgpu: false,
    webgl2: false,
    webgl1: false,
    adapterInfo: null,
    maxTextureSize: 0
  };

  // WebGPU check (preferred — direct GPU compute shaders)
  if ('gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const device = await adapter.requestDevice();
        caps.webgpu = true;
        caps.adapterInfo = await adapter.requestAdapterInfo?.() || {};
        caps.device = device;
        caps.maxTextureSize = device.limits.maxTextureDimension2D;
      }
    } catch (e) {
      console.warn('[SQE] WebGPU not available:', e.message);
    }
  }

  // WebGL2 check (fallback)
  if (!caps.webgpu) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      caps.webgl2 = true;
      caps.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    } else {
      const gl1 = canvas.getContext('webgl');
      if (gl1) caps.webgl1 = true;
    }
  }

  return caps;
}
