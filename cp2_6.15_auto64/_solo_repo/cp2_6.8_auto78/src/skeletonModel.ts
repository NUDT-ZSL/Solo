import * as THREE from 'three';
import { DinosaurSpecies, DisplayMode, BoneData, DINOSAURS, BONE_COLORS } from './data';

export interface BoneWithLabel {
  mesh: THREE.Group;
  label: THREE.Sprite | null;
  boneType: string;
}

export interface SkeletonResult {
  group: THREE.Group;
  bones: BoneWithLabel[];
  labels: THREE.Sprite[];
}

function createTextSprite(text: string, color: string = '#D4A853', fontSize: number = 48): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 128;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = `bold ${fontSize}px Microsoft YaHei, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.shadowColor = '#000000';
  context.shadowBlur = 8;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  sprite.renderOrder = 999;

  return sprite;
}

function createDescriptionSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 768;
  canvas.height = 96;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '32px Microsoft YaHei, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#E0E0E0';
  context.shadowColor = '#000000';
  context.shadowBlur = 6;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3, 0.4, 1);
  sprite.renderOrder = 998;

  return sprite;
}

function createBoneGeometry(bone: BoneData, lod: 'high' | 'low' = 'high'): THREE.BufferGeometry {
  const segments = lod === 'high' ? (bone.segments || 12) : 6;
  const dims = bone.dimensions;

  if (dims.sphereRadius !== undefined) {
    return new THREE.SphereGeometry(dims.sphereRadius, segments, Math.max(4, segments / 2));
  }

  const radius = dims.cylinderRadius || 0.5;
  const height = dims.cylinderHeight || 2;
  return new THREE.CylinderGeometry(radius * 0.9, radius, height, segments);
}

function createBoneMesh(bone: BoneData, displayMode: DisplayMode): THREE.Group {
  const group = new THREE.Group();
  group.name = bone.type;

  const geomHigh = createBoneGeometry(bone, 'high');
  const geomLow = createBoneGeometry(bone, 'low');

  const color = new THREE.Color(bone.color);

  const materialHigh = new THREE.MeshPhongMaterial({
    color,
    shininess: 30,
    specular: 0x222222,
    transparent: true,
    opacity: 1
  });

  const materialLow = new THREE.MeshPhongMaterial({
    color,
    shininess: 10,
    specular: 0x111111,
    transparent: true,
    opacity: 1
  });

  if (displayMode === 'evolution') {
    const edges = new THREE.EdgesGeometry(geomHigh);
    const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    group.add(wireframe);

    const solidMaterial = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const solidMesh = new THREE.Mesh(geomHigh, solidMaterial);
    group.add(solidMesh);
  } else {
    const meshHigh = new THREE.Mesh(geomHigh, materialHigh);
    meshHigh.name = 'lod_high';
    meshHigh.visible = true;
    group.add(meshHigh);

    const meshLow = new THREE.Mesh(geomLow, materialLow);
    meshLow.name = 'lod_low';
    meshLow.visible = false;
    group.add(meshLow);

    if (bone.dimensions.sphereRadius !== undefined) {
      const r = bone.dimensions.sphereRadius;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const smallSphere = new THREE.Mesh(
          new THREE.SphereGeometry(r * 0.25, 6, 4),
          materialHigh.clone()
        );
        smallSphere.position.set(
          Math.cos(angle) * r * 0.7,
          Math.sin(angle) * r * 0.3,
          Math.sin(angle * 2) * r * 0.5
        );
        group.add(smallSphere);
      }
    } else {
      const h = bone.dimensions.cylinderHeight || 2;
      const r = bone.dimensions.cylinderRadius || 0.5;
      for (let i = -1; i <= 1; i += 2) {
        const capSphere = new THREE.Mesh(
          new THREE.SphereGeometry(r * 0.9, 8, 6),
          materialHigh.clone()
        );
        capSphere.position.y = (h / 2) * i;
        group.add(capSphere);
      }
    }
  }

  group.position.set(bone.position.x, bone.position.y, bone.position.z);
  group.rotation.set(bone.rotation.x, bone.rotation.y, bone.rotation.z);

  return group;
}

export function createSkeleton(species: DinosaurSpecies, displayMode: DisplayMode): SkeletonResult {
  const dinosaur = DINOSAURS[species];
  const rootGroup = new THREE.Group();
  rootGroup.name = `${species}_skeleton`;

  const bones: BoneWithLabel[] = [];
  const labels: THREE.Sprite[] = [];

  dinosaur.bones.forEach((bone) => {
    const boneMesh = createBoneMesh(bone, displayMode);

    let label: THREE.Sprite | null = null;
    if (displayMode === 'anatomy') {
      const labelContainer = new THREE.Group();
      labelContainer.name = `${bone.type}_labels`;

      const nameLabel = createTextSprite(bone.name, BONE_COLORS[bone.type as keyof typeof BONE_COLORS], 56);
      nameLabel.position.set(0, 0.8, 0);
      nameLabel.userData.originalY = 0.8;
      nameLabel.material.opacity = 0;
      nameLabel.userData.targetOpacity = 1;
      labelContainer.add(nameLabel);
      labels.push(nameLabel);

      const descLabel = createDescriptionSprite(bone.description);
      descLabel.position.set(0, 0.3, 0);
      descLabel.material.opacity = 0;
      descLabel.userData.targetOpacity = 1;
      labelContainer.add(descLabel);
      labels.push(descLabel);

      label = nameLabel;
      boneMesh.add(labelContainer);
    }

    rootGroup.add(boneMesh);
    bones.push({ mesh: boneMesh, label, boneType: bone.type });
  });

  const box = new THREE.Box3().setFromObject(rootGroup);
  const center = box.getCenter(new THREE.Vector3());
  rootGroup.position.sub(center);

  return { group: rootGroup, bones, labels };
}

export function updateSkeletonLOD(skeleton: SkeletonResult, cameraDistance: number): void {
  const useLowLOD = cameraDistance > 20;
  skeleton.bones.forEach(({ mesh }) => {
    const high = mesh.getObjectByName('lod_high') as THREE.Mesh | undefined;
    const low = mesh.getObjectByName('lod_low') as THREE.Mesh | undefined;
    if (high) high.visible = !useLowLOD;
    if (low) low.visible = useLowLOD;
  });
}

export function setSkeletonOpacity(skeleton: SkeletonResult, opacity: number): void {
  skeleton.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat instanceof THREE.Material) {
          mat.transparent = true;
          mat.opacity = opacity;
        }
      });
    }
    if (obj instanceof THREE.LineSegments && obj.material) {
      const mat = obj.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = opacity * 0.9;
    }
  });
}

export function animateLabelsIn(labels: THREE.Sprite[], duration: number = 0.3): void {
  const startTime = performance.now();
  const animate = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    labels.forEach((sprite) => {
      if (sprite.material) {
        sprite.material.opacity = eased;
      }
      const originalY = sprite.userData.originalY || 0;
      if (originalY > 0) {
        const startY = originalY - 0.3;
        sprite.position.y = startY + 0.3 * eased;
      }
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  animate();
}
