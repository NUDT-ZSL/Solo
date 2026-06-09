import * as THREE from 'three';
import { SceneManager } from './scene';
import { SculptureManager, MaterialType } from './sculpture';
import { LightingManager } from './lighting';
import { ShadowManager } from './shadow';
import { GUIManager } from './gui';

const sceneManager = new SceneManager();
const sculptureManager = new SculptureManager();
const shadowManager = new ShadowManager();

const container = document.getElementById('scene-container');
if (!container) {
  throw new Error('Scene container not found');
}

sceneManager.init(container);
shadowManager.setupRenderer(sceneManager.renderer);

sceneManager.scene.add(sculptureManager.mesh);
sculptureManager.mesh.position.y = 0;

const groundGeo = new THREE.CircleGeometry(8, 64);
const groundMat = new THREE.MeshStandardMaterial({
  color: '#0a0f1a',
  roughness: 0.9,
  metalness: 0.1,
  transparent: true,
  opacity: 0.6
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
ground.receiveShadow = true;
sceneManager.scene.add(ground);

const lightingManager = new LightingManager(sceneManager.scene);

lightingManager.addLight({
  id: 'light1',
  name: '光源 1 · 暖白',
  type: 'point',
  position: new THREE.Vector3(2, 3, 4),
  color: '#FFF8DC',
  intensity: 1.2
});

lightingManager.addLight({
  id: 'light2',
  name: '光源 2 · 冷青',
  type: 'directional',
  position: new THREE.Vector3(-1, -1, -1).multiplyScalar(-3),
  color: '#E0F7FA',
  intensity: 0.8
});

lightingManager.addLight({
  id: 'light3',
  name: '光源 3 · 暖金',
  type: 'spot',
  position: new THREE.Vector3(-3, 2.5, 2),
  color: '#FFD700',
  intensity: 0.6,
  angle: 30,
  decay: 2
});

const ambient = new THREE.AmbientLight('#404860', 0.25);
sceneManager.scene.add(ambient);

const guiManager = new GUIManager(
  lightingManager,
  sculptureManager,
  shadowManager,
  sceneManager
);

guiManager.updateButtonActive('glass');

lightingManager.lights.forEach((light) => {
  shadowManager.configureLightShadow(light, 2048);
});

const btnGlass = document.getElementById('btn-glass');
const btnChrome = document.getElementById('btn-chrome');
const btnReset = document.getElementById('btn-reset');

if (btnGlass) {
  btnGlass.addEventListener('click', () => {
    sculptureManager.setMaterialType('glass', 0.8);
    guiManager.updateButtonActive('glass');
  });
}

if (btnChrome) {
  btnChrome.addEventListener('click', () => {
    sculptureManager.setMaterialType('chrome', 0.8);
    guiManager.updateButtonActive('chrome');
  });
}

if (btnReset) {
  btnReset.addEventListener('click', () => {
    sceneManager.resetCamera();
  });
}

let infoUpdateTimer = 0;

sceneManager.onAnimate((delta: number) => {
  sculptureManager.updateMaterialTransition(delta);

  sculptureManager.mesh.rotation.y += delta * 0.08;

  infoUpdateTimer += delta;
  if (infoUpdateTimer >= 0.2) {
    infoUpdateTimer = 0;
    guiManager.updateInfoPanel();
  }

  lightingManager.markers.forEach((marker) => {
    marker.rotation.y += delta * 0.5;
  });
});
