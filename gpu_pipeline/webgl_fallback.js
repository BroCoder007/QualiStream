// gpu_pipeline/webgl_fallback.js

export function init(videoSelector) {
  const video = document.querySelector(videoSelector);
  if (!video) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'sqe-canvas-overlay';
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  video.parentElement.style.position = 'relative';
  video.parentElement.appendChild(canvas);

  const gl = canvas.getContext('webgl2');
  if (!gl) { canvas.remove(); return; }

  // Compile shaders
  const vertSrc = `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;

  const fragSrc = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 fragColor;
    uniform sampler2D u_video;
    uniform vec2 u_texelSize;
    uniform float u_sharpness;

    // Lanczos2 kernel
    float sinc(float x) { return x == 0.0 ? 1.0 : sin(3.14159 * x) / (3.14159 * x); }
    float lanczos(float x) { return sinc(x) * sinc(x / 2.0); }

    void main() {
      vec2 pos = v_uv / u_texelSize - 0.5;
      vec2 i = floor(pos);
      vec2 f = pos - i;
      vec4 result = vec4(0.0);
      float totalWeight = 0.0;
      for (int m = -1; m <= 2; m++) {
        for (int n = -1; n <= 2; n++) {
          float w = lanczos(f.x - float(m)) * lanczos(f.y - float(n));
          vec2 sampleUV = (i + vec2(float(m), float(n)) + 0.5) * u_texelSize;
          result += texture(u_video, sampleUV) * w;
          totalWeight += w;
        }
      }
      result /= totalWeight;

      // Quick sharpen
      vec4 center = texture(u_video, v_uv);
      vec4 blur = (
        texture(u_video, v_uv + vec2(-u_texelSize.x, 0.0)) +
        texture(u_video, v_uv + vec2(u_texelSize.x, 0.0)) +
        texture(u_video, v_uv + vec2(0.0, -u_texelSize.y)) +
        texture(u_video, v_uv + vec2(0.0, u_texelSize.y))
      ) / 4.0;
      fragColor = clamp(result + (center - blur) * u_sharpness, 0.0, 1.0);
    }`;

  const prog = compileProgram(gl, vertSrc, fragSrc);
  gl.useProgram(prog);

  // Fullscreen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uTexelSize = gl.getUniformLocation(prog, 'u_texelSize');
  const uSharpness = gl.getUniformLocation(prog, 'u_sharpness');

  let rafId;
  function render(now, metadata) {
    if (video.paused || video.ended) {
      if ('requestVideoFrameCallback' in video) {
        rafId = video.requestVideoFrameCallback(render);
      } else {
        rafId = requestAnimationFrame(render);
      }
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    } catch(e) {
      console.warn("Failed to read video frame (CORS/timing issue)", e);
    }
    gl.uniform2f(uTexelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    gl.uniform1f(uSharpness, 1.2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    if ('requestVideoFrameCallback' in video) {
      rafId = video.requestVideoFrameCallback(render);
    } else {
      rafId = requestAnimationFrame(render);
    }
  }

  if ('requestVideoFrameCallback' in video) {
    rafId = video.requestVideoFrameCallback(render);
  } else {
    rafId = requestAnimationFrame(render);
  }

  window.addEventListener('message', e => {
    if (e.data?.type === 'SQE_DISABLE') {
      if ('cancelVideoFrameCallback' in video) {
        video.cancelVideoFrameCallback(rafId);
      } else {
        cancelAnimationFrame(rafId);
      }
      canvas.remove();
    }
  });
}

function compileProgram(gl, vertSrc, fragSrc) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  return prog;
}
