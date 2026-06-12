// gpu_pipeline/shaders/sharpness.wgsl
// Unsharp mask — detects edges, boosts high-frequency detail

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> uParams: SharpenParams;

struct SharpenParams {
  texelSize: vec2<f32>,
  strength: f32,  // 0.0 = none, 1.5 = strong
  threshold: f32, // ignore tiny edges (noise guard)
}

@fragment
fn main(@builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let center = textureSample(inputTex, samp, uv);

  // 3x3 blur for unsharp mask
  var blurred = vec4<f32>(0.0);
  let kernel = array<f32, 9>(
    1.0, 2.0, 1.0,
    2.0, 4.0, 2.0,
    1.0, 2.0, 1.0
  );
  var idx = 0u;
  for (var dy: i32 = -1; dy <= 1; dy++) {
    for (var dx: i32 = -1; dx <= 1; dx++) {
      let offset = vec2<f32>(f32(dx), f32(dy)) * uParams.texelSize;
      blurred += textureSample(inputTex, samp, uv + offset) * kernel[idx] / 16.0;
      idx++;
    }
  }

  let diff = center - blurred;
  let luminance = dot(diff.rgb, vec3<f32>(0.299, 0.587, 0.114));

  // Adaptive: only sharpen where the signal is strong enough
  let mask = smoothstep(uParams.threshold, uParams.threshold * 3.0, abs(luminance));
  return center + diff * uParams.strength * mask;
}
