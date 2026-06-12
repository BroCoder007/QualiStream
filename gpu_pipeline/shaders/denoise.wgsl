// gpu_pipeline/shaders/denoise.wgsl
// Blend current frame with previous — reduces noise across time
// Uses motion detection to avoid ghosting on fast-moving content

@group(0) @binding(0) var currentFrame: texture_2d<f32>;
@group(0) @binding(1) var previousFrame: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var<uniform> uParams: DenoiseParams;

struct DenoiseParams {
  blendFactor: f32,        // 0.0 = full current, 0.5 = 50/50 blend
  motionThreshold: f32,    // pixel diff threshold for detecting motion
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let current = textureSample(currentFrame, samp, uv);
  let previous = textureSample(previousFrame, samp, uv);

  // Detect motion by pixel color delta
  let delta = length(current.rgb - previous.rgb);
  // High motion = use current frame mostly; low motion = blend more aggressively
  let motionBlend = smoothstep(uParams.motionThreshold * 0.5, uParams.motionThreshold * 1.5, delta);
  let blend = mix(uParams.blendFactor, 0.0, motionBlend);

  return mix(current, previous, blend);
}
