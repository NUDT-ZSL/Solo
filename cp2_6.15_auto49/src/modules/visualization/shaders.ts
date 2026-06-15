import * as THREE from 'three';

const lithologyVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vDepth;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vDepth = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lithologyFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vDepth;

  uniform vec3 uBaseColor;
  uniform float uLayerIndex;
  uniform float uTime;
  uniform float uIsCrossSection;
  uniform vec3 uCutAxis;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    if (uIsCrossSection < 0.5) {
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
      float diff = max(dot(vNormal, lightDir), 0.2);
      float variation = fbm(vec3(vUv * 10.0, uLayerIndex)) * 0.15;
      vec3 color = uBaseColor * (diff + variation);
      gl_FragColor = vec4(color, 0.3);
    } else {
      vec2 uv;
      if (abs(uCutAxis.x) > 0.5) {
        uv = vec2(vWorldPos.z * 0.05, vWorldPos.y * 0.08 + uLayerIndex * 7.3);
      } else {
        uv = vec2(vWorldPos.x * 0.05, vWorldPos.y * 0.08 + uLayerIndex * 7.3);
      }

      float stripes = sin(uv.x * 3.14159 * (2.0 + fbm(vec3(uv, uLayerIndex)) * 6.0) + fbm(vec3(uv * 2.0, uLayerIndex * 3.1)) * 2.0);
      stripes = smoothstep(-0.3, 0.3, stripes);

      float n = fbm(vec3(uv * 4.0, uLayerIndex * 2.7));
      vec3 darkColor = uBaseColor * 0.55;
      vec3 lightColor = uBaseColor * 1.25 + vec3(0.1, 0.08, 0.05);
      lightColor = min(lightColor, vec3(1.0));

      vec3 stripe1 = mix(darkColor, uBaseColor, 0.4 + n * 0.3);
      vec3 stripe2 = mix(uBaseColor, lightColor, 0.3 + n * 0.4);

      vec3 color = mix(stripe1, stripe2, stripes);
      color += (n - 0.5) * 0.08;

      float dots = hash(floor(vec3(uv * 30.0, uLayerIndex)));
      if (dots > 0.97) color *= 0.6;
      if (dots < 0.03) color *= 1.2;

      gl_FragColor = vec4(color, 1.0);
    }
  }
`;

export function createLithologyMaterial(
  baseColor: THREE.Color | string,
  layerIndex: number,
  isCrossSection = false,
  cutAxis: THREE.Vector3 = new THREE.Vector3(1, 0, 0)
) {
  return new THREE.ShaderMaterial({
    vertexShader: lithologyVertexShader,
    fragmentShader: lithologyFragmentShader,
    uniforms: {
      uBaseColor: { value: new THREE.Color(baseColor) },
      uLayerIndex: { value: layerIndex },
      uTime: { value: 0 },
      uIsCrossSection: { value: isCrossSection ? 1.0 : 0.0 },
      uCutAxis: { value: cutAxis.clone() },
    },
    transparent: !isCrossSection,
    side: THREE.DoubleSide,
    depthWrite: isCrossSection,
  });
}

const rippleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rippleFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uProgress;
  uniform float uMaxRadius;

  void main() {
    float dist = distance(vUv, vec2(0.5));
    float radius = uProgress * uMaxRadius / uMaxRadius * 0.5;
    float ring = smoothstep(radius - 0.02, radius, dist) * (1.0 - smoothstep(radius, radius + 0.02, dist));
    float alpha = (1.0 - uProgress) * 0.8 * ring;
    vec3 color = mix(vec3(0.4, 0.9, 0.9), vec3(1.0, 1.0, 1.0), uProgress);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createRippleMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: rippleVertexShader,
    fragmentShader: rippleFragmentShader,
    uniforms: {
      uProgress: { value: 0 },
      uMaxRadius: { value: 15 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
