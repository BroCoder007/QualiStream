// gpu_pipeline/shaders/bicubic.wgsl
// Bicubic interpolation — smoother than bilinear, sharper output

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var<uniform> params: UpscaleParams;

struct UpscaleParams {
  srcSize: vec2<f32>,
  dstSize: vec2<f32>,
  sharpness: f32,
}

fn cubic(v: f32) -> f32 {
  let a = -0.75;
  let absV = abs(v);
  if absV <= 1.0 {
    return (a + 2.0) * absV * absV * absV - (a + 3.0) * absV * absV + 1.0;
  } else if absV < 2.0 {
    return a * absV * absV * absV - 5.0 * a * absV * absV + 8.0 * a * absV - 4.0 * a;
  }
  return 0.0;
}

fn bicubicSample(uv: vec2<f32>) -> vec4<f32> {
  let texelSize = 1.0 / params.srcSize;
  let pos = uv * params.srcSize - 0.5;
  let i = floor(pos);
  let f = pos - i;

  var result = vec4<f32>(0.0);
  for (var m: i32 = -1; m <= 2; m++) {
    for (var n: i32 = -1; n <= 2; n++) {
      let weight = cubic(f32(m) - f.x) * cubic(f.y - f32(n));
      let sampleUV = (i + vec2<f32>(f32(m), f32(n)) + 0.5) / params.srcSize;
      result += textureSample(inputTexture, texSampler, sampleUV) * weight;
    }
  }
  return clamp(result, vec4<f32>(0.0), vec4<f32>(1.0));
}

@fragment
fn main(@builtin(position) fragPos: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragPos.xy / params.dstSize;
  return bicubicSample(uv);
}
