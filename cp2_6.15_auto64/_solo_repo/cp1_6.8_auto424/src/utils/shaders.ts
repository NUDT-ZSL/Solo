export const particleVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;

  varying vec3 vColor;
  varying float vAlpha;

  uniform float uPixelRatio;
  uniform float uTime;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float sizeAttenuation = 300.0 / -mvPosition.z;
    gl_PointSize = aSize * sizeAttenuation * uPixelRatio;
    gl_PointSize = max(gl_PointSize, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 2.0);

    vec3 warmWhite = vec3(1.0, 0.96, 0.9);
    vec3 coolBlue = vColor;
    vec3 finalColor = mix(coolBlue, warmWhite, core);

    float alpha = glow * vAlpha;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const lineVertexShader = /* glsl */ `
  attribute float aLineAlpha;

  varying float vLineAlpha;

  void main() {
    vLineAlpha = aLineAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const lineFragmentShader = /* glsl */ `
  varying float vLineAlpha;

  uniform vec3 uLineColor;

  void main() {
    gl_FragColor = vec4(uLineColor, vLineAlpha);
  }
`;
