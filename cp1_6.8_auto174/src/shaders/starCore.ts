export const starCoreVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const starCoreFragmentShader = `
  uniform float uTime;
  uniform float uGlowIntensity;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amp * smoothNoise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 flowUv = vUv * 3.0 + vec2(uTime * 0.1, uTime * 0.07);
    float n = fbm(flowUv);
    float n2 = fbm(flowUv * 1.5 + vec2(uTime * 0.05, -uTime * 0.08));
    
    vec3 hotColor = vec3(1.0, 0.95, 0.8);
    vec3 midColor = vec3(1.0, 0.6, 0.2);
    vec3 coolColor = vec3(0.8, 0.3, 0.1);
    
    vec3 color = mix(coolColor, midColor, n);
    color = mix(color, hotColor, n2 * n);
    
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    color += vec3(0.3, 0.2, 0.5) * fresnel * uGlowIntensity;
    
    float brightness = 0.8 + 0.4 * n * n2;
    color *= brightness * uGlowIntensity;
    
    gl_FragColor = vec4(color, 1.0);
  }
`
