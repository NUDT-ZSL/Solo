export const burstVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aVelocity;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float life = 1.0 - uTime;
    life = clamp(life, 0.0, 1.0);
    vAlpha = aAlpha * life * life;
    vec3 pos = position + aVelocity * uTime * 8.0;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z) * life;
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const burstFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(vColor * 1.5, vAlpha * glow);
  }
`
