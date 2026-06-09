precision highp float;

uniform float uTime;
uniform float uGlowIntensity;
uniform vec3 uColor;
uniform float uDistanceFromCenter;

varying vec2 vUv;
varying float vLinePosition;
varying float vDistanceFromCenter;

void main() {
  vec3 baseColor = uColor;
  
  float normalizedPos = vLinePosition;
  
  float centerGradient = 1.0 - abs(vUv.y - 0.5) * 2.0;
  centerGradient = pow(centerGradient, 1.5);
  
  float distFactor = 1.0 - clamp(vDistanceFromCenter / 8.0, 0.0, 1.0);
  float alphaBase = mix(0.2, 0.8, distFactor);
  
  float pulse = sin(uTime * 2.0 + normalizedPos * 6.28318) * 0.15 + 0.85;
  
  float glow = centerGradient * pulse * uGlowIntensity;
  float alpha = alphaBase * glow;
  
  vec3 emissive = baseColor * glow * 1.5;
  vec3 finalColor = baseColor + emissive;
  
  float tipBoost = smoothstep(0.6, 1.0, normalizedPos);
  finalColor += baseColor * tipBoost * 0.3 * uGlowIntensity;
  alpha += tipBoost * 0.1 * uGlowIntensity;
  
  alpha = clamp(alpha, 0.0, 0.95);
  
  gl_FragColor = vec4(finalColor, alpha);
}
