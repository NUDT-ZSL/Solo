import * as THREE from 'three';

export interface TreeParams {
  depth: number;
  lengthRatio: number;
  angle: number;
  startHue: number;
}

export interface GeneratedTree {
  branches: THREE.Object3D[];
  flowers: THREE.Group[];
  branchLines: THREE.Line[];
  flowerSprites: THREE.Points[];
}

const BASE_LENGTH = 1.2;
const BASE_RADIUS_ROOT = 0.15;
const BASE_RADIUS_TIP = 0.03;
const SPHERES_PER_BRANCH = 10;
const PETAL_COUNT = 12;
const PETAL_MAJOR = 0.08;
const PETAL_MINOR = 0.03;
const LOD_THRESHOLD_DISTANCE = 12;

function hslToHex(h: number, s: number, l: number): number {
  const color = new THREE.Color();
  color.setHSL(h / 360, s, l);
  return color.getHex();
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function createBranchGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  startRadius: number,
  endRadius: number,
  hue: number
): THREE.Group {
  const group = new THREE.Group();

  for (let i = 0; i < SPHERES_PER_BRANCH; i++) {
    const t = i / (SPHERES_PER_BRANCH - 1);

    const pos = new THREE.Vector3().lerpVectors(start, end, t);
    const radius = lerp(startRadius, endRadius, t);

    const dist = start.distanceTo(end);
    const segmentLen = dist / (SPHERES_PER_BRANCH - 1);
    const scaleY = (segmentLen * 1.05) / (radius * 2);

    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

    const sphereGeo = new THREE.SphereGeometry(radius, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: hslToHex(hue, 0.85, 0.45 + t * 0.15),
      transparent: true,
      opacity: 0.95,
    });

    const sphere = new THREE.Mesh(sphereGeo, mat);
    sphere.position.copy(pos);
    sphere.applyQuaternion(quat);
    sphere.scale.y = scaleY;
    group.add(sphere);

    if (i === 0) {
      const capGeo = new THREE.SphereGeometry(startRadius, 8, 6);
      const capMat = new THREE.MeshBasicMaterial({
        color: hslToHex(hue, 0.85, 0.42),
        transparent: true,
        opacity: 0.95,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.copy(start);
      group.add(cap);
    }

    if (i === SPHERES_PER_BRANCH - 1) {
      const tipGeo = new THREE.SphereGeometry(endRadius, 8, 6);
      const tipMat = new THREE.MeshBasicMaterial({
        color: hslToHex(hue, 0.85, 0.6),
        transparent: true,
        opacity: 0.95,
      });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.copy(end);
      group.add(tip);
    }

    const glowColor = hslToHex(hue, 1, 0.55 + t * 0.15);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowGeo = new THREE.SphereGeometry(radius * 1.7, 8, 6);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(pos);
    glow.applyQuaternion(quat);
    glow.scale.y = scaleY;
    group.add(glow);
  }

  return group;
}

function createBranchLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  hue: number
): THREE.Line {
  const positions = new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: hslToHex(hue, 0.85, 0.55),
    transparent: true,
    opacity: 0.9,
    linewidth: 1.5,
  });

  return new THREE.Line(geo, mat);
}

function createFlower(position: THREE.Vector3, direction: THREE.Vector3, hue: number): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(position);

  const baseDir = direction.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(up, baseDir);
  group.quaternion.copy(alignQuat);

  for (let i = 0; i < PETAL_COUNT; i++) {
    const angle = (i / PETAL_COUNT) * Math.PI * 2;

    const petalGeo = new THREE.CircleGeometry(1, 12);
    const petalMat = new THREE.MeshBasicMaterial({
      color: hslToHex(hue + 30, 0.8, 0.65),
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const petal = new THREE.Mesh(petalGeo, petalMat);

    petal.scale.set(PETAL_MINOR, PETAL_MAJOR, 1);

    const r = PETAL_MAJOR * 0.5;
    petal.position.set(
      Math.cos(angle) * r,
      PETAL_MAJOR * 0.5,
      Math.sin(angle) * r
    );

    const axis = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
    const openQuat = new THREE.Quaternion().setFromAxisAngle(axis, 0);
    const rotZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    petal.quaternion.copy(rotZ).multiply(openQuat);

    petal.userData = {
      baseAxis: axis,
      baseAngle: angle,
      basePosition: petal.position.clone(),
      baseScale: petal.scale.clone(),
      openAmount: 0,
    };

    group.add(petal);
  }

  const centerGeo = new THREE.SphereGeometry(0.025, 10, 8);
  const centerMat = new THREE.MeshBasicMaterial({
    color: hslToHex(hue + 60, 1, 0.7),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.set(0, PETAL_MAJOR * 0.08, 0);
  group.add(center);

  group.userData = {
    period: 0.5 + Math.random() * 1.0,
    phase: Math.random() * Math.PI * 2,
    maxOpen: Math.PI / 3,
  };

  return group;
}

function createFlowerSprite(position: THREE.Vector3, hue: number): THREE.Points {
  const positions = new Float32Array([position.x, position.y, position.z]);
  const c = new THREE.Color().setHSL((hue + 30) / 360, 0.8, 0.7);
  const colors = new Float32Array([c.r, c.g, c.b]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,230,200,0.95)');
  grad.addColorStop(0.3, 'rgba(255,180,150,0.6)');
  grad.addColorStop(1, 'rgba(255,150,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;

  const mat = new THREE.PointsMaterial({
    size: 0.28,
    sizeAttenuation: true,
    map: tex,
    transparent: true,
    opacity: 0.9,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

export function generateTree(params: TreeParams): GeneratedTree {
  const branches: THREE.Object3D[] = [];
  const flowers: THREE.Group[] = [];
  const branchLines: THREE.Line[] = [];
  const flowerSprites: THREE.Points[] = [];

  const { depth, lengthRatio, angle, startHue } = params;
  const angleRad = (angle * Math.PI) / 180;
  const useLOD = depth >= 7;

  const endHue = startHue + 90;

  function recurse(
    currentPos: THREE.Vector3,
    currentDir: THREE.Vector3,
    currentLength: number,
    currentDepth: number
  ) {
    if (currentDepth > depth) return;

    const depthT = (currentDepth - 1) / Math.max(depth - 1, 1);
    const hue = lerp(startHue, endHue, depthT);

    const startRadius = lerp(BASE_RADIUS_ROOT, BASE_RADIUS_TIP, depthT);
    const nextDepthT = currentDepth / Math.max(depth - 1, 1);
    const endRadius = lerp(BASE_RADIUS_ROOT, BASE_RADIUS_TIP, Math.min(nextDepthT, 1));

    const endPos = new THREE.Vector3()
      .copy(currentDir)
      .multiplyScalar(currentLength)
      .add(currentPos);

    const isFarLOD = useLOD && currentDepth > depth - 2;

    if (isFarLOD) {
      const line = createBranchLine(currentPos, endPos, hue);
      line.userData.lodLevel = 'low';
      branchLines.push(line);
    } else {
      const branch = createBranchGeometry(currentPos, endPos, startRadius, endRadius, hue);
      branch.userData.lodLevel = 'high';
      branch.userData.startPos = currentPos.clone();
      branch.userData.endPos = endPos.clone();
      branches.push(branch);
    }

    const hasFlower = currentDepth > 1 && currentDepth < depth;

    if (hasFlower) {
      if (isFarLOD) {
        const sprite = createFlowerSprite(endPos, hue);
        sprite.userData.lodLevel = 'low';
        flowerSprites.push(sprite);
      } else {
        const flower = createFlower(endPos, currentDir.clone(), hue);
        flower.userData.lodLevel = 'high';
        flower.userData.spawnTime = 0;
        flowers.push(flower);
      }
    }

    if (currentDepth === depth) {
      const tipFlower = createFlower(endPos, currentDir.clone(), hue);
      tipFlower.userData.lodLevel = 'high';
      tipFlower.userData.spawnTime = 0;
      flowers.push(tipFlower);
      return;
    }

    const up = new THREE.Vector3(0, 1, 0);
    const tangentA = new THREE.Vector3();
    const tangentB = new THREE.Vector3();

    if (Math.abs(currentDir.dot(up)) > 0.95) {
      tangentA.set(1, 0, 0);
    } else {
      tangentA.crossVectors(currentDir, up).normalize();
    }
    tangentB.crossVectors(currentDir, tangentA).normalize();

    const twistBase = currentDepth * 0.6;

    function makeChild(angleOffset: number): THREE.Vector3 {
      const dir = currentDir.clone();
      const quat1 = new THREE.Quaternion().setFromAxisAngle(tangentA, angleRad);
      const quat2 = new THREE.Quaternion().setFromAxisAngle(currentDir, twistBase + angleOffset);
      dir.applyQuaternion(quat2).applyQuaternion(quat1);
      return dir.normalize();
    }

    const child1Dir = makeChild(0);
    const child2Dir = makeChild(Math.PI);

    const nextLength = currentLength * lengthRatio;

    recurse(endPos, child1Dir, nextLength, currentDepth + 1);
    recurse(endPos, child2Dir, nextLength, currentDepth + 1);
  }

  const rootPos = new THREE.Vector3(0, -0.2, 0);
  const rootDir = new THREE.Vector3(0, 1, 0);
  recurse(rootPos, rootDir, BASE_LENGTH, 1);

  return { branches, flowers, branchLines, flowerSprites };
}

export { LOD_THRESHOLD_DISTANCE };
