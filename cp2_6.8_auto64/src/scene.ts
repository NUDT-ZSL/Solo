import * as THREE from 'three';

export interface SceneElements {
  scene: THREE.Scene;
  pot: THREE.Group;
  soil: THREE.Mesh;
  lightSource: {
    mesh: THREE.Mesh;
    light: THREE.PointLight;
    particles: THREE.Points;
  };
  starfield: THREE.Points;
  shadow: THREE.Mesh;
}

export function createPotAndSoil(): { pot: THREE.Group; soil: THREE.Mesh; shadow: THREE.Mesh } {
  const potGroup = new THREE.Group();

  const potGeometry = new THREE.CylinderGeometry(3, 2.7, 2, 32, 1, false);
  const potMaterial = new THREE.MeshStandardMaterial({
    color: 0x3E2723,
    roughness: 0.9,
    metalness: 0.05
  });
  const potMesh = new THREE.Mesh(potGeometry, potMaterial);
  potMesh.position.y = 1;
  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  potGroup.add(potMesh);

  const rimGeometry = new THREE.TorusGeometry(3, 0.12, 12, 48);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x4E342E,
    roughness: 0.85,
    metalness: 0.05
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 2;
  rim.castShadow = true;
  potGroup.add(rim);

  const soilGeometry = new THREE.CylinderGeometry(2.9, 2.9, 0.3, 48, 4, true);
  const soilMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A1A1A,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const soil = new THREE.Mesh(soilGeometry, soilMaterial);
  soil.position.y = 1.85;
  soil.receiveShadow = true;

  const soilPositions = soilGeometry.attributes.position;
  for (let i = 0; i < soilPositions.count; i++) {
    const y = soilPositions.getY(i);
    if (y > 0.14) {
      const noise = (Math.random() - 0.5) * 0.05;
      soilPositions.setY(i, y + noise);
      const x = soilPositions.getX(i);
      const z = soilPositions.getZ(i);
      soilPositions.setX(i, x + (Math.random() - 0.5) * 0.03);
      soilPositions.setZ(i, z + (Math.random() - 0.5) * 0.03);
    }
  }
  soilGeometry.computeVertexNormals();

  const particleCount = 150;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 2.7;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = 2.02 + Math.random() * 0.05;
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x3D2B1F,
    size: 0.05,
    sizeAttenuation: true
  });
  const soilParticles = new THREE.Points(particleGeo, particleMat);
  soil.add(soilParticles);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeometry = new THREE.PlaneGeometry(8, 8);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.5;

  return { pot: potGroup, soil, shadow };
}

export function createLightSource(): {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  particles: THREE.Points;
} {
  const sphereGeometry = new THREE.SphereGeometry(0.5, 24, 24);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFEB3B,
    emissive: 0xFFC107,
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.castShadow = true;
  mesh.position.set(5, 5, 3);

  const light = new THREE.PointLight(0xFFEB3B, 1.0, 30, 2);
  light.position.copy(mesh.position);
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 30;

  const particleCount = 100;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 0.5 + Math.random() * 0.8;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.005,
      Math.random() * 0.01 + 0.003,
      (Math.random() - 0.5) * 0.005
    ));
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xFFEB3B,
    size: 0.06,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.position.copy(mesh.position);
  (particles as any).velocities = velocities;

  return { mesh, light, particles };
}

export function createStarfield(): THREE.Points {
  const count = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 20 + Math.random() * 15;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.5 + Math.random() * 1.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 0.08,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true
  });

  const stars = new THREE.Points(geometry, material);
  return stars;
}

export function updateLightParticles(particles: THREE.Points): void {
  const pos = particles.geometry.attributes.position as THREE.BufferAttribute;
  const velocities = (particles as any).velocities as THREE.Vector3[];
  const positions = pos.array as Float32Array;

  for (let i = 0; i < velocities.length; i++) {
    positions[i * 3] += velocities[i].x;
    positions[i * 3 + 1] += velocities[i].y;
    positions[i * 3 + 2] += velocities[i].z;

    const dx = positions[i * 3];
    const dy = positions[i * 3 + 1];
    const dz = positions[i * 3 + 2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 1.3 || dy > 1.5) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.5 + Math.random() * 0.3;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
  }
  pos.needsUpdate = true;
}

export function updateStarfield(starfield: THREE.Points, deltaTime: number): void {
  starfield.rotation.y += deltaTime * 0.01;
  const pos = starfield.geometry.attributes.position as THREE.BufferAttribute;
  const positions = pos.array as Float32Array;
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 1] += Math.sin(Date.now() * 0.0001 + i) * 0.001;
  }
  pos.needsUpdate = true;
}
