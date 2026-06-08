export const nebulaVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  uniform float uGlowIntensity;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha * uGlowIntensity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z) * uGlowIntensity;
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const nebulaFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`
