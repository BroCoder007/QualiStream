// utils/frame_scheduler.js

export class FrameScheduler {
  constructor(videoEl) {
    this.video = videoEl;
    this.rafId = null;
    this.callback = null;
    this.lastTime = -1;
    // Target: match video FPS (24/30/60/120), detected from metadata
    this.targetFPS = this._detectFPS();
    this.frameInterval = 1000 / this.targetFPS;
  }

  _detectFPS() {
    // Most streams: 24, 30, or 60fps
    // We default to 60 to never miss a frame
    return 60;
  }

  start(callback) {
    this.callback = callback;
    if ('requestVideoFrameCallback' in this.video) {
      const loop = (now, metadata) => {
        if (!this.callback) return;
        this.callback(metadata.mediaTime);
        this.rafId = this.video.requestVideoFrameCallback(loop);
      };
      this.rafId = this.video.requestVideoFrameCallback(loop);
    } else {
      const loop = (timestamp) => {
        if (!this.callback) return;
        const elapsed = timestamp - this.lastTime;
        if (elapsed >= this.frameInterval) {
          this.lastTime = timestamp;
          this.callback(timestamp);
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
  }

  stop() {
    if (this.rafId) {
      if ('cancelVideoFrameCallback' in this.video) {
        this.video.cancelVideoFrameCallback(this.rafId);
      } else {
        cancelAnimationFrame(this.rafId);
      }
    }
    this.callback = null;
  }

  setFPS(fps) {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }
}
