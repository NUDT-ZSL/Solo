import * as THREE from 'three';

export interface PointLightConfig {
  light: THREE.PointLight;
  helper: THREE.Mesh;
  position: THREE.Vector3;
  color: string;
  intensity: number;
}

export interface LightControllerState {
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  pointLights: PointLightConfig[];
  currentTime: number;
  targetTime: number;
  transitionStartTime: number;
  isTransitioning: boolean;
}

let state: LightControllerState;

export function initLights(scene: THREE.Scene): LightControllerState {
  const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(2, 5, 1);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 20;
  sunLight.shadow.camera.left = -5;
  sunLight.shadow.camera.right = 5;
  sunLight.shadow.camera.top = 5;
  sunLight.shadow.camera.bottom = -5;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  const pointLightA = new THREE.PointLight(0xffe4b5, 3, 8);
  pointLightA.position.set(1, 2.5, 0);
  pointLightA.castShadow = true;
  pointLightA.shadow.mapSize.width = 512;
  pointLightA.shadow.mapSize.height = 512;
  scene.add(pointLightA);

  const helperGeoA = new THREE.SphereGeometry(0.06, 16, 16);
  const helperMatA = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
  const helperA = new THREE.Mesh(helperGeoA, helperMatA);
  helperA.position.copy(pointLightA.position);
  scene.add(helperA);

  const pointLightB = new THREE.PointLight(0xb5d4ff, 2, 8);
  pointLightB.position.set(-1, 2.2, -0.8);
  pointLightB.castShadow = true;
  pointLightB.shadow.mapSize.width = 512;
  pointLightB.shadow.mapSize.height = 512;
  scene.add(pointLightB);

  const helperGeoB = new THREE.SphereGeometry(0.06, 16, 16);
  const helperMatB = new THREE.MeshBasicMaterial({ color: 0xb5d4ff });
  const helperB = new THREE.Mesh(helperGeoB, helperMatB);
  helperB.position.copy(pointLightB.position);
  scene.add(helperB);

  state = {
    sunLight,
    ambientLight,
    pointLights: [
      {
        light: pointLightA,
        helper: helperA,
        position: pointLightA.position.clone(),
        color: '#ffe4b5',
        intensity: 3,
      },
      {
        light: pointLightB,
        helper: helperB,
        position: pointLightB.position.clone(),
        color: '#b5d4ff',
        intensity: 2,
      },
    ],
    currentTime: 12,
    targetTime: 12,
    transitionStartTime: 0,
    isTransitioning: false,
  };

  updateSunLight(12);

  return state;
}

export function updateSunLight(time: number): void {
  if (!state) return;

  state.currentTime = time;

  const sunAngle = ((time - 6) / 12) * Math.PI;
  const sunX = Math.cos(sunAngle) * 5;
  const sunY = Math.sin(sunAngle) * 5;

  state.sunLight.position.set(sunX, Math.max(sunY, -2), 1);

  const timeColor = getSunColor(time);
  state.sunLight.color.set(timeColor);

  const intensity = getSunIntensity(time);
  state.sunLight.intensity = intensity;

  if (time >= 5 && time <= 19) {
    state.sunLight.visible = true;
  } else {
    state.sunLight.visible = false;
  }

  const ambientFactor = time >= 5 && time <= 19
    ? 0.2 + 0.3 * Math.sin(((time - 5) / 14) * Math.PI)
    : 0.08;
  state.ambientLight.intensity = ambientFactor;
  state.ambientLight.color.set(time >= 5 && time <= 19 ? 0x505060 : 0x202030);
}

function getSunColor(time: number): THREE.ColorRepresentation {
  if (time >= 0 && time < 5) return 0x111122;
  if (time >= 5 && time < 7) {
    const t = (time - 5) / 2;
    return lerpColor(0x111122, 0xFFD700, t);
  }
  if (time >= 7 && time < 9) {
    const t = (time - 7) / 2;
    return lerpColor(0xFFD700, 0xFFFFFF, t);
  }
  if (time >= 9 && time < 16) {
    return 0xFFFFFF;
  }
  if (time >= 16 && time < 18) {
    const t = (time - 16) / 2;
    return lerpColor(0xFFFFFF, 0xFF8C00, t);
  }
  if (time >= 18 && time < 20) {
    const t = (time - 18) / 2;
    return lerpColor(0xFF8C00, 0x111122, t);
  }
  return 0x111122;
}

function getSunIntensity(time: number): number {
  if (time >= 0 && time < 5) return 0;
  if (time >= 5 && time < 7) {
    const t = (time - 5) / 2;
    return 0.5 + t * 1.0;
  }
  if (time >= 7 && time < 17) {
    return 1.5;
  }
  if (time >= 17 && time < 20) {
    const t = (time - 17) / 3;
    return 1.5 * (1 - t);
  }
  return 0;
}

function lerpColor(
  colorA: number,
  colorB: number,
  t: number
): THREE.ColorRepresentation {
  const ca = new THREE.Color(colorA);
  const cb = new THREE.Color(colorB);
  ca.lerp(cb, t);
  return ca;
}

export function setPointLightPosition(index: number, x: number, y: number, z: number): void {
  if (!state || index < 0 || index >= state.pointLights.length) return;
  const pl = state.pointLights[index];
  pl.position.set(x, y, z);
  pl.light.position.set(x, y, z);
  pl.helper.position.set(x, y, z);
}

export function setPointLightColor(index: number, color: string): void {
  if (!state || index < 0 || index >= state.pointLights.length) return;
  const pl = state.pointLights[index];
  pl.color = color;
  pl.light.color.set(color);
  (pl.helper.material as THREE.MeshBasicMaterial).color.set(color);
}

export function setPointLightIntensity(index: number, intensity: number): void {
  if (!state || index < 0 || index >= state.pointLights.length) return;
  const pl = state.pointLights[index];
  pl.intensity = intensity;
  pl.light.intensity = intensity;
}

export function getPointLightConfig(index: number): PointLightConfig | null {
  if (!state || index < 0 || index >= state.pointLights.length) return null;
  return state.pointLights[index];
}

export function transitionToTime(targetTime: number): void {
  if (!state) return;
  state.targetTime = targetTime;
  state.transitionStartTime = performance.now();
  state.isTransitioning = true;
}

export function updateTransition(): void {
  if (!state || !state.isTransitioning) return;

  const elapsed = performance.now() - state.transitionStartTime;
  const duration = 500;
  const t = Math.min(elapsed / duration, 1);
  const eased = t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const startValue = state.currentTime;
  const newTime = startValue + (state.targetTime - startValue) * eased;

  updateSunLight(newTime);

  if (t >= 1) {
    state.isTransitioning = false;
    state.currentTime = state.targetTime;
  }
}

export function updateHelperPulse(time: number): void {
  if (!state) return;
  for (const pl of state.pointLights) {
    const scale = 1 + 0.2 * Math.sin(time * (2 * Math.PI / 0.3));
    pl.helper.scale.setScalar(scale);
  }
}

export function getState(): LightControllerState | null {
  return state;
}
