# QualiStream

QualiStream is a Chromium Manifest V3 extension for adjusting the appearance of HTML video on web pages. It applies a configurable sharpening filter plus brightness, contrast and saturation adjustments to video elements in the active tab. Settings are per tab and stay available during the browser session, including across service-worker restarts.

It does not change the source stream or recover detail that was never captured. A sharper or more saturated image is not always a better image; reduce a slider if you see halos or unnatural colors.

## Install from source

1. Clone this repository and check out the branch containing the changes.
2. In Chrome 102 or later, open `chrome://extensions`. In a compatible Edge version, open `edge://extensions`.
3. Turn on **Developer mode**, choose **Load unpacked**, and select the repository folder containing `manifest.json`.
4. Open or reload a normal HTTP(S) webpage with video. Click the QualiStream extension icon, enable enhancement, and adjust the sliders.

No npm installation or build is required to load this version: the manifest references the source files directly. The repository contains older `dist`, `gpu_pipeline`, `options`, and build-related files from the previous prototype; they are not used by the current manifest. After pulling changes, use **Reload** on the extensions page and reload existing video tabs. Remove or disable the extension from the same page when finished.

## Controls

- **Enable enhancement** applies settings to detected HTML video elements in the active tab, including accessible iframe documents and open shadow roots. Disable it to restore the page's previous inline video filter. If the page replaces its own filter while enhancement is active, that newer value is preserved where possible.
- **Sharpness** controls a 3×3 SVG convolution filter. Set it to zero to omit the sharpening stage.
- **Brightness**, **contrast**, and **saturation** adjust appearance with CSS filters. Reset returns to the defaults.
- The status reports the number of detected video elements and filters applied across accessible frames. It reports DOM changes, not proof that every player actually displays the effect. Start playback or reload if nothing is detected.

Settings are local to a browser session and tab. They are cleared when the extension is reloaded, updated, disabled, or the browser restarts; settings are also removed when the tab closes. Settings are not shared between tabs or synced across devices.

## Compatibility and limitations

QualiStream can only affect HTML video elements in webpages where its content script can run. It does not enhance native desktop applications, mobile apps, browser internal pages, extension pages, arbitrary canvas-based players or videos inside closed shadow roots. Some embedded frames may be inaccessible. Local files require the browser's separate **Allow access to file URLs** setting and are not included in this version's HTTP(S)-only content script matching.

Protected video and hardware overlays may ignore filters or display differently; compatibility varies by browser, player and operating system. No content protection is bypassed. Fullscreen behavior and subtitles vary by player: filters are applied to the video element, so separate captions and controls are not intentionally filtered. Test the specific player you care about.

The browser chooses how to render SVG and CSS filters and may use GPU acceleration or software rendering. This version does not implement WebGPU, WebGL upscaling, AI super-resolution, temporal denoising, HDR tonemapping or source-resolution changes. GPU use and performance have not been benchmarked. Complex filters can increase power use or reduce frame rate; set sharpness to zero or disable the extension if playback suffers.

## Permissions and privacy

- HTTP(S) site access lets the extension find and adjust video elements in regular webpages, including frames. The browser can display a broad site-access warning.
- `webNavigation` is used to find the active tab's frames so the popup can communicate with each accessible frame. The browser may describe this permission as access to browsing history.
- `storage` holds per-tab settings in extension session storage.

The extension code does not transmit video, browsing history or settings to a server. It does not read video pixels. The broad site access and frame enumeration are used for functionality, but you should review the source and grant permissions only if you trust the extension.

## Troubleshooting

- **No HTML video found:** start playback and reopen the popup. Reload tabs opened before the extension was installed. Some players render into a canvas or closed shadow root and cannot be detected.
- **This page cannot be accessed:** browser internal pages, extension pages and other restricted pages do not permit ordinary content scripts. Try a regular HTTP(S) page.
- **Filters applied but picture does not change:** the player, protected video path, frame restrictions or hardware overlay may ignore filters. There is no universal workaround.
- **Playback slows down:** reduce sharpness or turn enhancement off. Hardware acceleration is chosen by the browser and is not guaranteed.
- **The page's appearance does not restore as expected:** disable enhancement and reload the page. The extension tries not to overwrite a filter the page changed while enhancement was active.

## Development and verification

Node.js 18 or later is needed only to run the automated unit tests:

```bash
npm test
```

To exercise the detector in a browser without installing the extension, run `python -m http.server 8770` in the repository, open `http://127.0.0.1:8770/tests/fixture.html`, and use the fixture's Enable/Disable buttons. The fixture uses a simulated extension connection and a generated test video; it does not test extension permissions or real streaming services.

The automated tests cover settings, frame-message aggregation, filter application and restoration. Real-world playback compatibility, protected streams, hardware acceleration and performance still require testing on the intended browser, GPU and streaming services.
