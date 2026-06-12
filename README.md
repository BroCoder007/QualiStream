# Stream Quality Enhancer

Stream Quality Enhancer is a Manifest V3 (MV3) Chrome Extension that leverages local GPU acceleration (via WebGPU or WebGL) to visually enhance and upscale active video streams directly in the browser. It operates natively frame-by-frame without intercepting network streams, modifying the source, or consuming additional bandwidth.

## Features
- **GPU-Accelerated Upscaling:** Upscales videos (1x → 1.5–2x) efficiently using bicubic interpolation.
- **Adaptive Sharpening:** Employs a frequency domain unsharp mask to naturally boost high-frequency details.
- **Temporal Denoising:** Utilizes motion-aware frame blending to reduce noise without ghosting artifacts.
- **Smart Stream Detection:** Automatically detects active streaming `<video>` elements, identifying streams across popular platforms.
- **Low Latency Pipeline:** Ensures minimal frame processing time by strictly operating via WebGPU/WebGL overlay canvases without falling back to CPU processes.

## Architecture & Technologies
- **Manifest V3:** Adheres to Chrome's modern security constraints, utilizing fully-bundled assets.
- **WebGPU / WGSL:** The primary compute backbone executing the custom `bicubic.wgsl`, `sharpness.wgsl`, and `denoise.wgsl` shaders.
- **WebGL2 Fallback:** A reliable GLSL fallback pipeline using a Lanczos2 kernel for devices not yet supporting WebGPU.
- **Webpack & Babel:** Project bundler setup to comply with MV3's CSP (no `eval` or remote script loading).

## Installation

1. Clone or download the repository to your local machine.
2. Install the necessary development dependencies:
   ```bash
   npm install
   ```
3. Build the extension using Webpack:
   ```bash
   npm run build
   # (Alternatively, you can just run `npx webpack`)
   ```
4. Open Google Chrome and navigate to `chrome://extensions`.
5. Toggle **Developer mode** in the top right corner.
6. Click **Load unpacked** and select the `stream-quality-enhancer` directory.

## Usage

1. Navigate to a streaming site (e.g., YouTube, Twitch, Netflix).
2. The extension icon will display a green `▶` badge when an active stream is detected.
3. Click on the extension icon to open the popup.
4. Toggle **GPU Enhancement** to `ON`.
5. Adjust **Sharpness** and **Denoise** sliders to your preference.

## Troubleshooting

- **WebGPU Not Available:** If your browser does not support WebGPU, the extension will automatically default to the WebGL2 fallback. For Chrome, ensure WebGPU is enabled (sometimes requires `chrome://flags/#enable-unsafe-webgpu`).
- **Cannot Use Import Statement Outside a Module:** Ensure you are loading the bundled scripts properly. If utilizing unpacked directly via source, the page-injected script is explicitly set to `type="module"`.
- **Canvas Overlay Not Aligning:** Re-sizing the window generally resolves layout mismatches. Shadow DOM scenarios (e.g., Netflix) are continuously optimized in the detector algorithm.
