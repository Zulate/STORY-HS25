precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // simple directional lighting
  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  float diff = max(dot(vNormal, lightDir), 0.0);

  // animated stripes using UV.x and time
  float stripes = 0.5 + 0.5 * sin((vUv.x * 10.0) + u_time * 10.0);
  vec3 base = mix(vec3(0.15, 0.5, 0.85), vec3(1.0, 0.6, 0.2), stripes);

  vec3 color = base * (0.35 + 0.65 * diff);
  gl_FragColor = vec4(color, 1.0);
}
