import * as THREE from 'three';

export interface CaveSystem {
  group: THREE.Group;
  update: (delta: number, time: number) => void;
  getRiverPath: () => THREE.Vector3[];
  setGlobalLightIntensity: (intensity: number) => void;
  setDayNightMode: (isDay: boolean) => void;
}

interface Ripple {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  maxRadius: number;
  position: THREE.Vector3;
}

export function createCave(): CaveSystem {
  const group = new THREE.Group();

  const CAVE_RADIUS = 3;
  const CAVE_LENGTH = 12;
  const CAVE_SEGMENTS = 64;
  const CAVE_RADIAL_SEGMENTS = 48;

  const tubeGeometry = new THREE.CylinderGeometry(
    CAVE_RADIUS, CAVE_RADIUS, CAVE_LENGTH,
    CAVE_RADIAL_SEGMENTS, CAVE_SEGMENTS,
    true
  );
  tubeGeometry.rotateX(Math.PI / 2);

  const positions = tubeGeometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    const noise = (Math.sin(x * 3 + z * 2) + Math.cos(y * 4 + x * 2)) * 0.08
      + (Math.random() - 0.5) * 0.05;
    
    const dist = Math.sqrt(x * x + y * y);
    const normDist = dist / CAVE_RADIUS;
    
    positions.setX(i, x + noise * x * 0.1);
    positions.setY(i, y + noise * y * 0.1);

    const colorMix = normDist * 0.3 + Math.random() * 0.15;
    const r = 0.16 + colorMix * 0.1;
    const g = 0.10 + colorMix * 0.06;
    const b = 0.05 + colorMix * 0.03;

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  tubeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  tubeGeometry.computeVertexNormals();

  const tubeMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: false,
  });

  const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  tubeMesh.receiveShadow = true;
  group.add(tubeMesh);

  const crackGroup = new THREE.Group();
  const crackMaterial = new THREE.MeshBasicMaterial({
    color: 0x4A1000,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const zPos = (Math.random() - 0.5) * CAVE_LENGTH * 0.9;
    const crackLength = 0.3 + Math.random() * 1.2;
    const crackWidth = 0.02 + Math.random() * 0.04;
    
    const crackGeometry = new THREE.PlaneGeometry(crackWidth, crackLength, 1, 4);
    const crackPositions = crackGeometry.attributes.position;
    for (let j = 0; j < crackPositions.count; j++) {
      const py = crackPositions.getY(j);
      const wobble = (Math.random() - 0.5) * crackWidth * 1.5;
      crackPositions.setX(j, crackPositions.getX(j) + wobble * (1 - Math.abs(py) / (crackLength / 2)));
    }
    crackGeometry.computeVertexNormals();

    const crack = new THREE.Mesh(crackGeometry, crackMaterial);
    const surfaceRadius = CAVE_RADIUS - 0.01;
    crack.position.set(
      Math.cos(angle) * surfaceRadius,
      Math.sin(angle) * surfaceRadius,
      zPos
    );
    crack.lookAt(0, 0, zPos);
    crack.rotateZ(Math.random() * Math.PI);
    crackGroup.add(crack);
  }
  group.add(crackGroup);

  const bubbleGroup = new THREE.Group();
  const bubbleMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A0E08,
    roughness: 0.95,
    metalness: 0.02,
  });

  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const zPos = (Math.random() - 0.5) * CAVE_LENGTH * 0.95;
    const size = 0.05 + Math.random() * 0.2;
    
    const bubbleGeometry = new THREE.SphereGeometry(size, 8, 6);
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    
    const indentDepth = size * 0.6;
    bubble.position.set(
      Math.cos(angle) * (CAVE_RADIUS - indentDepth),
      Math.sin(angle) * (CAVE_RADIUS - indentDepth),
      zPos
    );
    bubbleGroup.add(bubble);
  }
  group.add(bubbleGroup);

  const riverGroup = new THREE.Group();
  const riverPath: THREE.Vector3[] = [];
  
  const numRiverPoints = 30;
  for (let i = 0; i <= numRiverPoints; i++) {
    const t = i / numRiverPoints;
    const z = (t - 0.5) * CAVE_LENGTH * 0.95;
    const x = Math.sin(t * Math.PI * 3) * 0.8 + Math.sin(t * Math.PI * 7) * 0.2;
    const y = -CAVE_RADIUS + 0.05;
    riverPath.push(new THREE.Vector3(x, y, z));
  }

  const riverCurve = new THREE.CatmullRomCurve3(riverPath);
  riverCurve.curveType = 'catmullrom';
  riverCurve.tension = 0.5;

  const riverWidths: number[] = [];
  for (let i = 0; i <= numRiverPoints; i++) {
    riverWidths.push(0.3 + Math.random() * 0.5);
  }

  const riverShape: THREE.Vector2[] = [];
  const numSegments = 200;
  
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const widthIdx = t * numRiverPoints;
    const widthFloor = Math.floor(widthIdx);
    const widthFrac = widthIdx - widthFloor;
    const width = riverWidths[Math.min(widthFloor, numRiverPoints - 1)] * (1 - widthFrac)
      + riverWidths[Math.min(widthFloor + 1, numRiverPoints)] * widthFrac;

    const point = riverCurve.getPoint(t);
    const tangent = riverCurve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const leftEdge = point.clone().add(normal.clone().multiplyScalar(width / 2));
    const rightEdge = point.clone().add(normal.clone().multiplyScalar(-width / 2));

    riverShape.push(new THREE.Vector2(leftEdge.x, leftEdge.z));
  }

  for (let i = numSegments; i >= 0; i--) {
    const t = i / numSegments;
    const widthIdx = t * numRiverPoints;
    const widthFloor = Math.floor(widthIdx);
    const widthFrac = widthIdx - widthFloor;
    const width = riverWidths[Math.min(widthFloor, numRiverPoints - 1)] * (1 - widthFrac)
      + riverWidths[Math.min(widthFloor + 1, numRiverPoints)] * widthFrac;

    const point = riverCurve.getPoint(t);
    const tangent = riverCurve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const rightEdge = point.clone().add(normal.clone().multiplyScalar(-width / 2));
    riverShape.push(new THREE.Vector2(rightEdge.x, rightEdge.z));
  }

  const riverGeometry = new THREE.BufferGeometry();
  const riverVertices: number[] = [];
  const riverUVs: number[] = [];
  const riverIndices: number[] = [];

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const widthIdx = t * numRiverPoints;
    const widthFloor = Math.floor(widthIdx);
    const widthFrac = widthIdx - widthFloor;
    const width = riverWidths[Math.min(widthFloor, numRiverPoints - 1)] * (1 - widthFrac)
      + riverWidths[Math.min(widthFloor + 1, numRiverPoints)] * widthFrac;

    const point = riverCurve.getPoint(t);
    const tangent = riverCurve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const leftEdge = point.clone().add(normal.clone().multiplyScalar(width / 2));
    const rightEdge = point.clone().add(normal.clone().multiplyScalar(-width / 2));

    riverVertices.push(leftEdge.x, -CAVE_RADIUS + 0.02, leftEdge.z);
    riverVertices.push(rightEdge.x, -CAVE_RADIUS + 0.02, rightEdge.z);

    riverUVs.push(0, t);
    riverUVs.push(1, t);

    if (i < numSegments) {
      const base = i * 2;
      riverIndices.push(base, base + 1, base + 2);
      riverIndices.push(base + 1, base + 3, base + 2);
    }
  }

  riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverVertices, 3));
  riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(riverUVs, 2));
  riverGeometry.setIndex(riverIndices);
  riverGeometry.computeVertexNormals();

  const riverMaterial = new THREE.MeshStandardMaterial({
    color: 0x0044AA,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });

  const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
  riverGroup.add(riverMesh);
  group.add(riverGroup);

  const ripples: Ripple[] = [];
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0x4488FF,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
  group.add(ambientLight);

  const entranceLight1 = new THREE.PointLight(0x8899AA, 0.8, 10);
  entranceLight1.position.set(0, 0, -CAVE_LENGTH / 2 + 1);
  group.add(entranceLight1);

  const entranceLight2 = new THREE.PointLight(0x8899AA, 0.8, 10);
  entranceLight2.position.set(0, 0, CAVE_LENGTH / 2 - 1);
  group.add(entranceLight2);

  const daySkyLight = new THREE.HemisphereLight(0xAABBCC, 0x111122, 0);
  group.add(daySkyLight);

  let lastRippleTime = 0;
  let globalLightMultiplier = 1;
  let isDayMode = false;

  function spawnRipple(time: number) {
    const t = 0.1 + Math.random() * 0.8;
    const point = riverCurve.getPoint(t);
    const rippleGeometry = new THREE.RingGeometry(0.05, 0.08, 24);
    const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial.clone());
    rippleMesh.position.set(point.x, -CAVE_RADIUS + 0.05, point.z);
    rippleMesh.rotation.x = -Math.PI / 2;
    riverGroup.add(rippleMesh);

    ripples.push({
      mesh: rippleMesh,
      startTime: time,
      duration: 1.5,
      maxRadius: 0.5 + Math.random() * 0.2,
      position: point.clone(),
    });
  }

  function updateRipples(time: number) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      const elapsed = time - ripple.startTime;
      const progress = elapsed / ripple.duration;

      if (progress >= 1) {
        riverGroup.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        ripples.splice(i, 1);
        continue;
      }

      const currentRadius = 0.05 + progress * ripple.maxRadius;
      const newGeometry = new THREE.RingGeometry(
        currentRadius * 0.9, currentRadius, 24
      );
      ripple.mesh.geometry.dispose();
      ripple.mesh.geometry = newGeometry;
      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - progress);
    }
  }

  function update(delta: number, time: number) {
    if (time - lastRippleTime > 3 + Math.random() * 2) {
      spawnRipple(time);
      lastRippleTime = time;
    }

    updateRipples(time);

    riverMaterial.opacity = 0.5 + Math.sin(time * 2) * 0.05;
  }

  function getRiverPath(): THREE.Vector3[] {
    return riverPath.map(p => p.clone());
  }

  function setGlobalLightIntensity(intensity: number) {
    globalLightMultiplier = intensity / 100;
    ambientLight.intensity = 0.3 * globalLightMultiplier;
    entranceLight1.intensity = 0.8 * globalLightMultiplier;
    entranceLight2.intensity = 0.8 * globalLightMultiplier;
    if (isDayMode) {
      daySkyLight.intensity = 1.2 * globalLightMultiplier;
    }
  }

  function setDayNightMode(isDay: boolean) {
    isDayMode = isDay;
    if (isDay) {
      daySkyLight.intensity = 1.2 * globalLightMultiplier;
    } else {
      daySkyLight.intensity = 0;
    }
  }

  return {
    group,
    update,
    getRiverPath,
    setGlobalLightIntensity,
    setDayNightMode,
  };
}
