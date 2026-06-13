import * as THREE from 'three';
import * as sceneManager from './scene';
import * as ship from './ship';
import * as effects from './effects';
import * as gameState from './gameState';

const CLOCK = new THREE.Clock();

function main(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  sceneManager.init(container);
  const scene = sceneManager.getScene();
  const camera = sceneManager.getCamera();

  effects.init(scene);

  const starField = effects.createStarField();
  scene.add(starField);

  ship.init(scene);

  gameState.init();

  ship.onCollision((event) => {
    gameState.handleCollision(event);
  });

  animate();
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = CLOCK.getDelta();

  if (gameState.isPlaying()) {
    ship.update(delta, sceneManager.getCamera());

    sceneManager.updateShipPosition(ship.getPosition());

    ship.checkCollisions(
      sceneManager.getAsteroids(),
      sceneManager.getEnergyOrbs()
    );

    effects.updateExplosions();
    effects.updateStarField(delta);

    sceneManager.update(delta);
  }
}

document.addEventListener('DOMContentLoaded', main);
