import * as THREE from 'three';

export type CollisionType = 'asteroid' | 'orb';

export interface CollisionEvent {
  type: CollisionType;
  position: THREE.Vector3;
  objectIndex: number;
}

type CollisionCallback = (event: CollisionEvent) => void;

const collisionCallbacks: CollisionCallback[] = [];

const keysPressed: Set<string> = new Set();

const SHIP_SIDE_LENGTH = 0.8;
const SHIP_COLLISION_RADIUS = 0.5;

const BASE_SPEED = 3.0;
const BOOST_SPEED = 5.0;
const SLOW_SPEED = 1.5;

const MOVE_SPEED = 5.0;
const VERTICAL_LIMIT = 8.0;

let shipMesh: THREE.Mesh;
let shipGroup: THREE.Group;
let scene: THREE.Scene;

let position = new THREE.Vector3(0, 0, 0);
let yaw = 0;
let pitch = 0;

let forwardSpeed = BASE_SPEED;
let isPointerLocked = false;

let invulnerable = false;
let invulnerableTimer = 0;
const INVULNERABLE_DURATION = 1.5;

function createShipGeometry(): THREE.BufferGeometry {
  const h = SHIP_SIDE_LENGTH * Math.sqrt(3) / 2;

  const apex = new THREE.Vector3(0, h * 0.6, -SHIP_SIDE_LENGTH / 2);
  const baseLeftFront = new THREE.Vector3(-SHIP_SIDE_LENGTH / 2, -h * 0.4, -SHIP_SIDE_LENGTH / 2);
  const baseRightFront = new THREE.Vector3(SHIP_SIDE_LENGTH / 2, -h * 0.4, -SHIP_SIDE_LENGTH / 2);
  const baseLeftBack = new THREE.Vector3(-SHIP_SIDE_LENGTH / 2, -h * 0.4, SHIP_SIDE_LENGTH / 2);
  const baseRightBack = new THREE.Vector3(SHIP_SIDE_LENGTH / 2, -h * 0.4, SHIP_SIDE_LENGTH / 2);

  const v = (vec: THREE.Vector3): number[] => [vec.x, vec.y, vec.z];

  const vertices = new Float32Array([
    ...v(apex), ...v(baseLeftFront), ...v(baseRightFront),
    ...v(apex), ...v(baseRightFront), ...v(baseRightBack),
    ...v(apex), ...v(baseLeftBack), ...v(baseLeftFront),
    ...v(apex), ...v(baseLeftBack), ...v(baseRightBack),
    ...v(baseLeftFront), ...v(baseLeftBack), ...v(baseRightBack),
    ...v(baseLeftFront), ...v(baseRightBack), ...v(baseRightFront),
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}

export function init(scn: THREE.Scene): THREE.Group {
  scene = scn;

  const geometry = createShipGeometry();

  const material = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.7,
    emissive: 0x1e40af,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });

  shipMesh = new THREE.Mesh(geometry, material);

  const engineGlow = new THREE.PointLight(0x3b82f6, 2.0, 5);
  engineGlow.position.set(0, 0, SHIP_SIDE_LENGTH / 2);
  shipMesh.add(engineGlow);

  shipGroup = new THREE.Group();
  shipGroup.add(shipMesh);
  scene.add(shipGroup);

  setupInput();

  return shipGroup;
}

function setupInput(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    keysPressed.add(e.code);

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      forwardSpeed = BOOST_SPEED;
    }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      forwardSpeed = SLOW_SPEED;
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', (e: KeyboardEvent) => {
    keysPressed.delete(e.code);

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
      forwardSpeed = BASE_SPEED;
    }
  });

  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      isPointerLocked = document.pointerLockElement !== null;
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isPointerLocked) return;

      const sensitivity = 0.002;
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;
      pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
    });
  }
}

export function onCollision(cb: CollisionCallback): void {
  collisionCallbacks.push(cb);
}

function emitCollision(type: CollisionType, objectIndex: number): void {
  for (const cb of collisionCallbacks) {
    cb({
      type,
      position: position.clone(),
      objectIndex,
    });
  }
}

export function checkCollisions(
  asteroidData: Array<{ mesh: THREE.Mesh; radius: number }>,
  orbData: Array<{ mesh: THREE.Mesh; active: boolean }>
): void {
  if (invulnerable) return;

  const shipPos = position;

  for (let i = 0; i < asteroidData.length; i++) {
    const asteroid = asteroidData[i];
    const dist = shipPos.distanceTo(asteroid.mesh.position);
    const collisionDist = SHIP_COLLISION_RADIUS + asteroid.radius;

    if (dist < collisionDist) {
      emitCollision('asteroid', i);
      setInvulnerable();
      return;
    }
  }

  for (let i = 0; i < orbData.length; i++) {
    const orb = orbData[i];
    if (!orb.active) continue;

    const dist = shipPos.distanceTo(orb.mesh.position);
    const collisionDist = SHIP_COLLISION_RADIUS + 0.3;

    if (dist < collisionDist) {
      emitCollision('orb', i);
      return;
    }
  }
}

function setInvulnerable(): void {
  invulnerable = true;
  invulnerableTimer = INVULNERABLE_DURATION;
  if (shipMesh) {
    (shipMesh.material as THREE.MeshStandardMaterial).opacity = 0.3;
  }
}

export function update(delta: number, camera: THREE.PerspectiveCamera): void {
  const moveDir = new THREE.Vector3();

  if (keysPressed.has('KeyW')) moveDir.y += 1;
  if (keysPressed.has('KeyS')) moveDir.y -= 1;
  if (keysPressed.has('KeyA')) moveDir.x -= 1;
  if (keysPressed.has('KeyD')) moveDir.x += 1;

  if (moveDir.length() > 0) {
    moveDir.normalize();
  }

  const forward = new THREE.Vector3(
    -Math.sin(yaw),
    0,
    -Math.cos(yaw)
  );

  position.add(forward.multiplyScalar(forwardSpeed * delta));

  const right = new THREE.Vector3(
    Math.cos(yaw),
    0,
    -Math.sin(yaw)
  );
  position.add(right.multiplyScalar(moveDir.x * MOVE_SPEED * delta));
  position.y += moveDir.y * MOVE_SPEED * delta;

  position.y = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, position.y));

  if (invulnerable) {
    invulnerableTimer -= delta;
    if (invulnerableTimer <= 0) {
      invulnerable = false;
      if (shipMesh) {
        (shipMesh.material as THREE.MeshStandardMaterial).opacity = 0.7;
      }
    }
  }

  shipGroup.position.copy(position);

  shipGroup.rotation.set(0, yaw, 0);
  shipMesh.rotation.x = pitch;

  const cameraOffset = new THREE.Vector3(0, 2.5, 6);
  cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  camera.position.copy(position).add(cameraOffset);
  camera.lookAt(
    position.x - Math.sin(yaw) * 5,
    position.y + pitch * 2,
    position.z - Math.cos(yaw) * 5
  );
}

export function getPosition(): THREE.Vector3 {
  return position.clone();
}

export function getForwardSpeed(): number {
  return forwardSpeed;
}

export function reset(): void {
  position.set(0, 0, 0);
  yaw = 0;
  pitch = 0;
  forwardSpeed = BASE_SPEED;
  invulnerable = false;
  invulnerableTimer = 0;
  keysPressed.clear();

  if (shipMesh) {
    (shipMesh.material as THREE.MeshStandardMaterial).opacity = 0.7;
  }

  shipGroup.position.copy(position);
  shipGroup.rotation.set(0, 0, 0);
  shipMesh.rotation.x = 0;
}
