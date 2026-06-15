export const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSymmetry;
  uniform float uTargetSymmetry;
  uniform float uSymmetryTransition;
  uniform float uHueShift;
  uniform vec2 uRippleCenter;
  uniform float uRippleRadius;
  uniform float uRippleActive;
  uniform float uSplitAmount;
  uniform float uScaleBoost;

  attribute float aSectorIndex;
  attribute float aBaseSectorFrac;

  varying vec2 vCenter;
  varying float vAngle;
  varying float vRadius;
  varying float vBaseHue;
  varying float vFragmentIndex;
  varying float vSectorVisibility;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  vec3 getComplementary(vec3 color) {
    return vec3(1.0) - color;
  }

  void main() {
    if (vSectorVisibility < 0.01) discard;

    float distToRippleCenter = distance(vCenter, uRippleCenter);
    float rippleThickness = 1.0;

    float inRipple = 0.0;
    if (uRippleActive > 0.5) {
      float rippleEdgeMin = uRippleRadius - rippleThickness * 0.5;
      float rippleEdgeMax = uRippleRadius + rippleThickness * 0.5;
      if (distToRippleCenter >= rippleEdgeMin && distToRippleCenter <= rippleEdgeMax) {
        float fadeIn = smoothstep(rippleEdgeMin, rippleEdgeMin + rippleThickness * 0.5, distToRippleCenter);
        float fadeOut = smoothstep(rippleEdgeMax, rippleEdgeMax - rippleThickness * 0.5, distToRippleCenter);
        inRipple = fadeIn * fadeOut;
      }
    }

    float currentSym = mix(uSymmetry, uTargetSymmetry, uSymmetryTransition);

    float hue = vBaseHue + uHueShift + aSectorIndex * (1.0 / max(currentSym, 1.0));
    hue = mod(hue, 1.0);
    float saturation = 0.8;
    float brightness = 0.9;
    vec3 baseColor = hsv2rgb(vec3(hue, saturation, brightness));

    float rippleHueShift = inRipple * 0.5;
    vec3 rippleColor = hsv2rgb(vec3(mod(hue + 0.5 + rippleHueShift, 1.0), 0.9, 1.0));
    vec3 finalColor = mix(baseColor, getComplementary(baseColor) * 0.9 + rippleColor * 0.3, inRipple);

    float depthGlow = 1.0 - smoothstep(0.0, 12.0, vRadius);
    finalColor *= 0.85 + depthGlow * 0.3;

    float timePulse = 0.05 * sin(uTime * 2.0 + vRadius * 0.5);
    finalColor *= 1.0 + timePulse;

    float sparkle = 0.1 * sin(uTime * 8.0 + vFragmentIndex * 2.5);
    finalColor += sparkle * vec3(1.0, 0.9, 1.0);

    float edgeGlow = smoothstep(0.0, 0.15, inRipple);
    finalColor += edgeGlow * 0.4 * vec3(1.0, 0.8, 1.0);

    float splitGlow = uSplitAmount * 0.3;
    finalColor += splitGlow * vec3(1.0, 0.6, 1.0) * (0.5 + 0.5 * sin(uTime * 10.0 + vAngle * 3.0));

    float alpha = 0.92 * vSectorVisibility;
    alpha *= 1.0 - smoothstep(10.0, 12.0, vRadius);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uJitterAmount;
  uniform float uSplitAmount;
  uniform float uSymmetry;
  uniform float uTargetSymmetry;
  uniform float uSymmetryTransition;
  uniform float uRippleRadius;
  uniform vec2 uRippleCenter;
  uniform float uRippleActive;
  uniform vec2 uDragOffset;
  uniform float uDragInfluence;
  uniform float uScaleBoost;

  attribute vec3 aCenter;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aFragmentIndex;
  attribute float aBaseHue;
  attribute float aSectorIndex;
  attribute float aBaseSectorFrac;

  varying vec2 vCenter;
  varying float vAngle;
  varying float vRadius;
  varying float vBaseHue;
  varying float vFragmentIndex;
  varying float vSectorVisibility;

  const float MAX_SYM = 12.0;
  const float PI2 = 6.28318530718;

  vec3 rotateAroundZ(vec3 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z);
  }

  vec3 mirrorAcrossAngle(vec3 v, float angle) {
    float c = cos(2.0 * angle);
    float s = sin(2.0 * angle);
    return vec3(
      v.x * c + v.y * s,
      v.x * s - v.y * c,
      v.z
    );
  }

  void main() {
    vec3 pos = position;
    vec3 center = aCenter;

    float effectiveSym = mix(uSymmetry, uTargetSymmetry, uSymmetryTransition);

    float sectorWidth = PI2 / effectiveSym;
    float sectorStartAngle = aSectorIndex * sectorWidth;

    float mirrorFactor = mod(aSectorIndex, 2.0);
    if (mirrorFactor > 0.5) {
      float mirrorAngle = sectorStartAngle + sectorWidth;
      pos = mirrorAcrossAngle(pos, mirrorAngle);
      center = mirrorAcrossAngle(center, mirrorAngle);
    }
    pos = rotateAroundZ(pos, sectorStartAngle);
    center = rotateAroundZ(center, sectorStartAngle);

    float withinOld = 1.0 - smoothstep(uSymmetry - 0.5, uSymmetry, aSectorIndex + 0.01);
    float withinNew = 1.0 - smoothstep(uTargetSymmetry - 0.5, uTargetSymmetry, aSectorIndex + 0.01);
    float sectorVisible = mix(withinOld, withinNew, uSymmetryTransition);
    float sectorAppear = smoothstep(uSymmetry, uTargetSymmetry, aSectorIndex + 0.01) * uSymmetryTransition;
    float sectorDisappear = (1.0 - smoothstep(uTargetSymmetry, uSymmetry, aSectorIndex + 0.01)) * (1.0 - uSymmetryTransition);
    float animScale = 1.0;
    if (uTargetSymmetry > uSymmetry) {
      float isNewSector = step(uSymmetry, aSectorIndex);
      animScale = mix(1.0, isNewSector * uSymmetryTransition + (1.0 - isNewSector) * 1.0, 1.0);
      sectorVisible = max(withinOld, withinNew * uSymmetryTransition);
    } else if (uTargetSymmetry < uSymmetry) {
      float isOldSector = step(uTargetSymmetry, aSectorIndex);
      animScale = mix(1.0, isOldSector * (1.0 - uSymmetryTransition) + (1.0 - isOldSector) * 1.0, 1.0);
      sectorVisible = withinNew + withinOld * (1.0 - uSymmetryTransition) * (1.0 - withinNew);
    }
    sectorVisible = clamp(sectorVisible, 0.0, 1.0);
    animScale = clamp(animScale, 0.001, 1.0);

    vec3 centerToVertex = pos - center;
    float jitter = uJitterAmount * 0.08;
    float jitterSeed = aFragmentIndex * 37.17 + aSectorIndex * 7.3;
    pos.x += (sin(uTime * 1.3 + jitterSeed) + sin(uTime * 2.7 + jitterSeed * 1.7)) * jitter;
    pos.y += (cos(uTime * 1.9 + jitterSeed * 2.3) + sin(uTime * 3.1 + jitterSeed * 0.9)) * jitter;
    pos.z += (sin(uTime * 2.4 + jitterSeed * 1.4)) * jitter * 0.5;

    vec3 splitDir = normalize(centerToVertex + vec3(0.0001));
    float splitStrength = uSplitAmount * 0.15;
    float splitWave = sin(uTime * 10.0 + aFragmentIndex * 1.5 + aSectorIndex) * 0.5 + 0.5;
    pos += splitDir * splitStrength * splitWave;

    float globalRotation = uTime * (PI2 / 15.0);
    pos = rotateAroundZ(pos, globalRotation);
    center = rotateAroundZ(center, globalRotation);

    float scale = animScale;
    if (uRippleActive > 0.5) {
      float distToCenter = distance(vec2(pos.x, pos.y), uRippleCenter);
      float rippleEffect = exp(-pow(distToCenter - uRippleRadius, 2.0) / 1.5);
      scale += rippleEffect * 0.2;
    }
    scale += uScaleBoost;
    pos.xy *= scale;
    center.xy *= animScale;

    float dragDist = length(uDragOffset);
    if (dragDist > 0.001 && uDragInfluence > 0.001) {
      float radialFactor = 1.0 - smoothstep(0.0, 12.0, aRadius);
      pos.xy += uDragOffset * uDragInfluence * radialFactor * 0.5;
    }

    vCenter = center.xy;
    vAngle = aAngle + sectorStartAngle + globalRotation;
    vRadius = aRadius;
    vBaseHue = aBaseHue;
    vFragmentIndex = aFragmentIndex + aSectorIndex * 100.0;
    vSectorVisibility = sectorVisible;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
