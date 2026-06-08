export const glowVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;

  varying float vAlpha;
  varying vec3 vColor;

  uniform float uPixelRatio;
  uniform float uScale;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * uScale * (300.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const glowFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float core = exp(-dist * dist * 80.0);
    float halo = exp(-dist * dist * 8.0) * 0.6;
    float intensity = core + halo;

    vec3 coreColor = vColor * 1.5 + vec3(0.2);
    vec3 haloColor = vColor;
    vec3 finalColor = mix(haloColor, coreColor, core);

    gl_FragColor = vec4(finalColor, intensity * vAlpha);
  }
`;

export const trailVertexShader = /* glsl */ `
  attribute float aAlpha;
  attribute vec3 aColor;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const trailFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha * 0.4);
  }
`;

export const shockwaveVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const shockwaveFragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uColor;

  varying vec2 vUv;

  void main() {
    float dist = length(vUv - vec2(0.5)) * 2.0;

    float ring = smoothstep(0.0, 0.1, dist - uProgress + 0.1)
               * smoothstep(0.0, 0.1, uProgress + 0.1 - dist);

    float fade = 1.0 - uProgress;
    float alpha = ring * fade * 0.8;

    vec3 color = mix(vec3(1.0, 0.85, 0.4), uColor, uProgress);

    gl_FragColor = vec4(color, alpha);
  }
`;
