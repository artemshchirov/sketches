#include "../../library/glsl/utils/shadertoy.glsl"
#define PI 3.1415926535897932384626433832795
vec3 palette(float t) {
  vec3 a = vec3(0.748, 0.358, 1.178);
  vec3 b = vec3(0.786, 0.523, 0.401);
  vec3 c = vec3(1.163, 0.471, 0.678);
  vec3 d = vec3(4.554, 2.698, 1.898);
  return a + b * cos(6.283185 * (c * t + d));
}
float noise(float x, float scale) {
  float rand = fract(sin(floor(x)) * 100000.0);
  return floor(rand * scale) / scale;
}
float sdfBox(in vec2 p, in vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy; // [0, 0] - bottom left, [1, 1] - top right
  float gridSize = 10.;
  float t = iTime / 2.0; // 2 second half cycle 
  float pulse = fract(t);
  float easeOut = 1. - pow(1. - pulse, 2.);
  float easeIn = pow(pulse, 2.);
  float dir = floor(fract(t / 2.) * 2.); // 0 - zoom out, 1 - zoom in
  float wave = mix(easeOut, 1. - easeIn, dir);
  float uvScale = wave * (gridSize - 1.) + 1.; // From 1 to 10 and back     
  float n = t / 2.;
  vec2 zoomPoint = vec2(noise(n, gridSize), noise(n + 10000., gridSize));
  vec2 grid = fract((uv - zoomPoint) * uvScale + zoomPoint);
  vec3 color = vec3(0.);
  const float totalSquares = 5.;
  for(float i = 0.; i < totalSquares; i++) {
    float scale = mix(0.5, 0.5 - i / 10., wave);
    float box = sdfBox(rotate(grid - 0.5, wave * PI * (1. + i * 0.5 / totalSquares)), vec2(scale));
    float stroke = 0.01 / abs(box);
    color += palette(fract(i / totalSquares)) * stroke;
  }
  fragColor = vec4(color, 1.0);
}
