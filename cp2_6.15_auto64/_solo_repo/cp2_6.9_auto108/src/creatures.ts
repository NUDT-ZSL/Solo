import * as THREE from 'three';

export type CreatureType = 'fungus' | 'worm' | 'moth';

export interface Creature {
  id: number;
  type: CreatureType;
  group: THREE.Group;
  body: THREE.Mesh;
  tentacles: THREE.Mesh[];
  glowMesh: THREE.Mesh;
  light: THREE.PointLight;
  basePosition: THREE.Vector3;
  currentBrightness: number;
  baseBrightness: number;
  brightnessPeriod: number;
  flickerInterval: number;
  lastFlickerTime: number;
  isSelected: boolean;
  baseGlowRadius: number;
  mothDirection?: THREE.Vector3;
  mothNextDirectionTime?: number;
  mothSpeed?: number;
  tentaclePhases: number[];
}

export interface CreatureSystem {
  group: THREE.Group;
  creatures: Creature[];
  update: (delta: number, time: number, animationEnabled: boolean, isDay: boolean) => void;
  setCreatureDensity: (density: number) => void;
  setGlobalLightIntensity: (intensity: number) => void;
  getSelectedCreature: () => Creature | null;
  handleClick: (raycaster: THREE.Raycaster) => boolean;
  getScreenPosition: (creature: Creature, camera: THREE.Camera, width: number, height: number) => { x: number; y: number } | null;
  getCreatureStats: () => { total: number; fungus: number; worm: number; moth: number; avgBrightness: number };
  getParticleResolutionScale: () => number;
}

const CAVE_RADIUS = 3;
const CAVE_LENGTH = 12;

let creatureIdCounter = 0;

function createTentacle(length: number, color: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.008, 0.02, length, 6);
  geometry.translate(0, length / 2, 0);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function createCreatureBody(type: CreatureType, diameter: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(diameter / 2, 16, 12);
  let color: number;
  switch (type) {
    case 'fungus': color = 0x00FF88; break;
    case 'worm': color = 0xFF8800; break;
    case 'moth': color = 0xFF33AA; break;
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.1,
  });
  return new THREE.Mesh(geometry, material);
}

function createGlowMesh(type: CreatureType, radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  let color: number;
  switch (type) {
    case 'fungus': color = 0x00FF88; break;
    case 'worm': color = 0xFF8800; break;
    case 'moth': color = 0xFF33AA; break;
  }
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

function randomCaveWallPosition(): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const z = (Math.random() - 0.5) * CAVE_LENGTH * 0.9;
  const r = CAVE_RADIUS - 0.15;
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r,
    z
  );
}

function randomCaveFloorPosition(riverPath: THREE.Vector3[]): THREE.Vector3 {
  const z = (Math.random() - 0.5) * CAVE_LENGTH * 0.9;
  const t = (z + CAVE_LENGTH / 2) / (CAVE_LENGTH * 0.9);
  const idx = Math.min(Math.floor(t * (riverPath.length - 1)), riverPath.length - 2);
  const frac = (t * (riverPath.length - 1)) - idx;
  const riverPoint = riverPath[idx].clone().lerp(riverPath[idx + 1] || riverPath[idx], frac);

  if (Math.random() < 0.4) {
    const tangent = new THREE.Vector3(0, 0, 1);
    if (idx < riverPath.length - 1) {
      tangent.copy(riverPath[idx + 1]).sub(riverPath[idx]).normalize();
    }
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const side = Math.random() < 0.5 ? 1 : -1;
    const offset = 0.4 + Math.random() * 0.3;
    return new THREE.Vector3(
      riverPoint.x + normal.x * offset * side,
      -CAVE_RADIUS + 0.1,
      riverPoint.z + normal.z * offset * side
    );
  }

  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
  const r = CAVE_RADIUS - 0.15;
  const xOffset = Math.cos(angle) * r;
  const yPos = Math.sin(angle) * r;
  return new THREE.Vector3(xOffset, yPos, z);
}

function randomCaveInteriorPosition(): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const z = (Math.random() - 0.5) * CAVE_LENGTH * 0.85;
  const r = Math.random() * (CAVE_RADIUS - 0.5);
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r * 0.6,
    z
  );
}

function createCreature(
  type: CreatureType,
  position: THREE.Vector3,
  normal?: THREE.Vector3
): Creature {
  const id = creatureIdCounter++;
  const group = new THREE.Group();

  const diameter = 0.15 + Math.random() * 0.15;
  const body = createCreatureBody(type, diameter);
  group.add(body);

  const tentacleCount = 2 + Math.floor(Math.random() * 3);
  const tentacles: THREE.Mesh[] = [];
  const tentaclePhases: number[] = [];
  let tentacleColor: number;
  switch (type) {
    case 'fungus': tentacleColor = 0x00AA66; break;
    case 'worm': tentacleColor = 0xCC6600; break;
    case 'moth': tentacleColor = 0xAA2288; break;
  }

  for (let i = 0; i < tentacleCount; i++) {
    const length = 0.1 + Math.random() * 0.2;
    const tentacle = createTentacle(length, tentacleColor);
    const angle = (i / tentacleCount) * Math.PI * 2;
    tentacle.position.set(
      Math.cos(angle) * diameter * 0.3,
      -diameter / 2 + 0.02,
      Math.sin(angle) * diameter * 0.3
    );
    tentacle.rotation.z = Math.cos(angle) * 0.3;
    tentacle.rotation.x = Math.sin(angle) * 0.3;
    tentacles.push(tentacle);
    tentaclePhases.push(Math.random() * Math.PI * 2);
    group.add(tentacle);
  }

  let glowRadius: number;
  let lightColor: number;
  let brightnessPeriod: number;
  let flickerInterval: number;

  switch (type) {
    case 'fungus':
      glowRadius = 0.3;
      lightColor = 0x00FF88;
      brightnessPeriod = 3 + Math.random() * 2;
      flickerInterval = 0;
      break;
    case 'worm':
      glowRadius = 0.2;
      lightColor = 0xFF8800;
      brightnessPeriod = 1.5 + Math.random() * 1;
      flickerInterval = 0.8 + Math.random() * 0.4;
      break;
    case 'moth':
      glowRadius = 0.5;
      lightColor = 0xFF33AA;
      brightnessPeriod = 0;
      flickerInterval = 0;
      break;
  }

  const glowMesh = createGlowMesh(type, glowRadius);
  group.add(glowMesh);

  const light = new THREE.PointLight(lightColor, 1.5, glowRadius * 4, 2);
  group.add(light);

  group.position.copy(position);

  if (normal && type !== 'moth') {
    const up = normal.clone().normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    group.quaternion.copy(quaternion);
  }

  let mothDirection: THREE.Vector3 | undefined;
  let mothNextDirectionTime: number | undefined;
  let mothSpeed: number | undefined;

  if (type === 'moth') {
    mothDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5),
      (Math.random() - 0.5) * 2
    ).normalize();
    mothNextDirectionTime = 2 + Math.random() * 2;
    mothSpeed = 0.3 + Math.random() * 0.4;
  }

  return {
    id,
    type,
    group,
    body,
    tentacles,
    glowMesh,
    light,
    basePosition: position.clone(),
    currentBrightness: 100,
    baseBrightness: 100,
    brightnessPeriod,
    flickerInterval,
    lastFlickerTime: 0,
    isSelected: false,
    baseGlowRadius: glowRadius,
    mothDirection,
    mothNextDirectionTime,
    mothSpeed,
    tentaclePhases,
  };
}

export function createCreatures(riverPath: THREE.Vector3[]): CreatureSystem {
  const group = new THREE.Group();
  const creatures: Creature[] = [];
  let selectedCreature: Creature | null = null;
  let baseCreatureCount = 22;
  let globalLightMultiplier = 1;

  function getWallNormal(pos: THREE.Vector3): THREE.Vector3 {
    return pos.clone().normalize().multiplyScalar(-1);
  }

  function spawnCreatures(count: number) {
    while (creatures.length < count) {
      const rand = Math.random();
      let type: CreatureType;
      let position: THREE.Vector3;
      let normal: THREE.Vector3 | undefined;

      if (rand < 0.4) {
        type = 'fungus';
        position = randomCaveWallPosition();
        normal = getWallNormal(position);
      } else if (rand < 0.75) {
        type = 'worm';
        position = randomCaveFloorPosition(riverPath);
        normal = new THREE.Vector3(0, 1, 0);
      } else {
        type = 'moth';
        position = randomCaveInteriorPosition();
      }

      const creature = createCreature(type, position, normal);
      creatures.push(creature);
      group.add(creature.group);
    }
  }

  function removeCreatures(count: number) {
    while (creatures.length > count) {
      const creature = creatures.pop()!;
      group.remove(creature.group);
      if (creature === selectedCreature) {
        selectedCreature = null;
      }
      creature.body.geometry.dispose();
      (creature.body.material as THREE.Material).dispose();
      creature.tentacles.forEach(t => {
        t.geometry.dispose();
        (t.material as THREE.Material).dispose();
      });
      creature.glowMesh.geometry.dispose();
      (creature.glowMesh.material as THREE.Material).dispose();
    }
  }

  function setCreatureDensity(density: number) {
    const targetCount = Math.floor(baseCreatureCount * (density / 100));
    if (targetCount > creatures.length) {
      spawnCreatures(targetCount);
    } else if (targetCount < creatures.length) {
      removeCreatures(targetCount);
    }
  }

  function setGlobalLightIntensity(intensity: number) {
    globalLightMultiplier = intensity / 100;
  }

  spawnCreatures(baseCreatureCount);

  function updateCreatureBrightness(creature: Creature, time: number, isDay: boolean) {
    let brightness = 100;
    const dayFactor = isDay ? 0.3 : 1.0;

    switch (creature.type) {
      case 'fungus':
        brightness = 60 + 40 * Math.sin(time / creature.brightnessPeriod * Math.PI * 2);
        break;
      case 'worm':
        brightness = 50 + 50 * Math.sin(time / creature.brightnessPeriod * Math.PI * 2);
        if (time - creature.lastFlickerTime > creature.flickerInterval) {
          brightness = 100;
          if (Math.random() < 0.3) {
            creature.lastFlickerTime = time;
          }
        }
        if (time - creature.lastFlickerTime < 0.08) {
          brightness = 100;
        }
        break;
      case 'moth':
        brightness = 100;
        break;
    }

    creature.currentBrightness = brightness * dayFactor;
    const normalizedBrightness = creature.currentBrightness / 100;

    let lightIntensity = 1.5 * normalizedBrightness * globalLightMultiplier;
    let glowOpacity = 0.15 * normalizedBrightness;
    let emissiveIntensity = 0.8 * normalizedBrightness;

    if (creature.isSelected) {
      lightIntensity *= 1.5;
      glowOpacity *= 1.5;
    }

    creature.light.intensity = lightIntensity;
    (creature.glowMesh.material as THREE.MeshBasicMaterial).opacity = glowOpacity;
    (creature.body.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;

    creature.tentacles.forEach(tentacle => {
      (tentacle.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 * normalizedBrightness;
    });
  }

  function updateTentacles(creature: Creature, time: number) {
    creature.tentacles.forEach((tentacle, i) => {
      const phase = creature.tentaclePhases[i];
      const sway = Math.sin(time * 5 + phase) * 0.087;
      const baseAngle = (i / creature.tentacles.length) * Math.PI * 2;
      tentacle.rotation.z = Math.cos(baseAngle) * 0.3 + sway;
      tentacle.rotation.x = Math.sin(baseAngle) * 0.3 + sway * 0.5;
    });
  }

  function updateMoth(creature: Creature, delta: number, time: number) {
    if (!creature.mothDirection || !creature.mothNextDirectionTime || !creature.mothSpeed) return;

    if (time > creature.mothNextDirectionTime) {
      creature.mothDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5),
        (Math.random() - 0.5) * 2
      ).normalize();
      creature.mothNextDirectionTime = time + 2 + Math.random() * 2;
    }

    creature.group.position.add(
      creature.mothDirection.clone().multiplyScalar(creature.mothSpeed * delta)
    );

    const pos = creature.group.position;
    const distFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    if (distFromCenter > CAVE_RADIUS - 0.5) {
      const pushBack = new THREE.Vector3(-pos.x, -pos.y, 0).normalize();
      creature.mothDirection.lerp(pushBack, 0.1).normalize();
    }
    if (pos.z > CAVE_LENGTH / 2 - 0.5 || pos.z < -CAVE_LENGTH / 2 + 0.5) {
      creature.mothDirection.z *= -1;
      pos.z = Math.max(-CAVE_LENGTH / 2 + 0.5, Math.min(CAVE_LENGTH / 2 - 0.5, pos.z));
    }
    if (distFromCenter < 0.3) {
      creature.mothDirection.x += (Math.random() - 0.5) * 0.5;
      creature.mothDirection.y += (Math.random() - 0.5) * 0.5;
      creature.mothDirection.normalize();
    }

    creature.group.lookAt(
      pos.x + creature.mothDirection.x,
      pos.y + creature.mothDirection.y,
      pos.z + creature.mothDirection.z
    );
  }

  function updateGlowSize(creature: Creature) {
    const scale = creature.isSelected ? 2 : 1;
    const targetScale = creature.baseGlowRadius * scale * 2;
    creature.glowMesh.scale.setScalar(targetScale / (creature.baseGlowRadius * 2));
    creature.light.distance = creature.baseGlowRadius * 4 * scale;
  }

  function update(delta: number, time: number, animationEnabled: boolean, isDay: boolean) {
    creatures.forEach(creature => {
      updateCreatureBrightness(creature, time, isDay);
      updateGlowSize(creature);

      if (animationEnabled) {
        updateTentacles(creature, time);
        if (creature.type === 'moth') {
          updateMoth(creature, delta, time);
        }
      }
    });
  }

  function handleClick(raycaster: THREE.Raycaster): boolean {
    const bodies = creatures.map(c => c.body);
    const intersects = raycaster.intersectObjects(bodies, false);

    if (intersects.length > 0) {
      const clickedBody = intersects[0].object;
      const clickedCreature = creatures.find(c => c.body === clickedBody);

      if (clickedCreature) {
        if (selectedCreature && selectedCreature !== clickedCreature) {
          selectedCreature.isSelected = false;
        }
        clickedCreature.isSelected = !clickedCreature.isSelected;
        selectedCreature = clickedCreature.isSelected ? clickedCreature : null;
        return true;
      }
    } else {
      if (selectedCreature) {
        selectedCreature.isSelected = false;
        selectedCreature = null;
      }
    }
    return false;
  }

  function getSelectedCreature(): Creature | null {
    return selectedCreature;
  }

  function getScreenPosition(
    creature: Creature,
    camera: THREE.Camera,
    width: number,
    height: number
  ): { x: number; y: number } | null {
    const vector = creature.group.position.clone().project(camera);
    if (vector.z > 1) return null;
    return {
      x: (vector.x * 0.5 + 0.5) * width,
      y: (-vector.y * 0.5 + 0.5) * height,
    };
  }

  function getCreatureStats() {
    let fungus = 0, worm = 0, moth = 0;
    let totalBrightness = 0;

    creatures.forEach(c => {
      switch (c.type) {
        case 'fungus': fungus++; break;
        case 'worm': worm++; break;
        case 'moth': moth++; break;
      }
      totalBrightness += c.currentBrightness;
    });

    return {
      total: creatures.length,
      fungus,
      worm,
      moth,
      avgBrightness: creatures.length > 0 ? totalBrightness / creatures.length : 0,
    };
  }

  function getParticleResolutionScale(): number {
    if (creatures.length <= 25) return 1;
    const extraCreatures = creatures.length - 25;
    const steps = Math.ceil(extraCreatures / 5);
    return 1 + steps * 0.1;
  }

  return {
    group,
    creatures,
    update,
    setCreatureDensity,
    setGlobalLightIntensity,
    getSelectedCreature,
    handleClick,
    getScreenPosition,
    getCreatureStats,
    getParticleResolutionScale,
  };
}
