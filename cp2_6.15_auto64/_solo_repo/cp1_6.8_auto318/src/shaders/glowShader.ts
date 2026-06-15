export const starVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  attribute float aTrailFactor;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vTrailFactor;

  uniform float uPixelRatio;
  uniform float uTime;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vTrailFactor = aTrailFactor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float sizeAttenuation = (300.0 / -mvPosition.z);
    gl_PointSize = aSize * uPixelRatio * sizeAttenuation;
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const starFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vTrailFactor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float core = exp(-dist * 12.0);
    float glow = exp(-dist * 4.0) * 0.6;
    float halo = exp(-dist * 2.0) * 0.15;

    float trailSoftness = mix(1.0, 0.6, vTrailFactor);
    float intensity = (core + glow * trailSoftness + halo) * vAlpha;

    vec3 coreColor = vColor * 1.5;
    vec3 glowColor = vColor;
    vec3 finalColor = mix(glowColor, coreColor, core);

    gl_FragColor = vec4(finalColor, intensity);
  }
`;

export const shockwaveVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const shockwaveFragmentShader = `
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;

  varying vec2 vUv;

  void main() {
    float dist = length(vUv - vec2(0.5)) * 2.0;

    float ring = smoothstep(uProgress - 0.1, uProgress, dist)
               * smoothstep(uProgress + 0.05, uProgress, dist);

    float fade = 1.0 - uProgress;
    float alpha = ring * fade * uOpacity;

    vec3 color = mix(uColor, vec3(1.0), ring * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`;
