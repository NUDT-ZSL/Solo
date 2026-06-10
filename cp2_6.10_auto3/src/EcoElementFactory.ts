import * as THREE from 'three';

export type EcoElementType = 'tree' | 'rock' | 'water' | 'smallAnimal' | 'largeAnimal' | 'weather';

export interface EcoElementData {
  id: string;
  type: EcoElementType;
  group: THREE.Group;
  position: THREE.Vector3;
  update?: (delta: number, time: number, context: UpdateContext) => void;
  onPlaced?: () => void;
}

export interface UpdateContext {
  allElements: EcoElementData[];
  bottleRadius: number;
  mouseLightPos: THREE.Vector3;
}

export class EcoElementFactory {
  private scene: THREE.Scene;
  private bottleRadius: number;
  private particleCount = 0;
  private maxParticles = 2000;

  constructor(scene: THREE.Scene, bottleRadius: number) {
    this.scene = scene;
    this.bottleRadius = bottleRadius;
  }

  private genId(): string {
    return 'el_' + Math.random().toString(36).slice(2, 10);
  }

  public createElement(type: EcoElementType, position: THREE.Vector3): EcoElementData {
    const id = this.genId();
    const group = new THREE.Group();
    group.position.copy(position);

    let data: EcoElementData = { id, type, group, position: group.position };

    switch (type) {
      case 'tree':
        data = { ...data, ...this.buildTree(group) };
        break;
      case 'rock':
        data = { ...data, ...this.buildRock(group) };
        break;
      case 'water':
        data = { ...data, ...this.buildWater(group) };
        break;
      case 'smallAnimal':
        data = { ...data, ...this.buildSmallAnimal(group) };
        break;
      case 'largeAnimal':
        data = { ...data, ...this.buildLargeAnimal(group) };
        break;
      case 'weather':
        data = { ...data, ...this.buildWeatherCloud(group) };
        break;
    }

    this.scene.add(group);
    return data;
  }

  public removeElement(data: EcoElementData): void {
    this.scene.remove(data.group);
    data.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
  }

  private buildTree(group: THREE.Group): Partial<EcoElementData> {
    const trunkHeight = 0.6 + Math.random() * 0.3;
    const trunkRadius = 0.06 + Math.random() * 0.03;

    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2 - 0.02;
    trunk.castShadow = true;

    const branchCount = 3 + Math.floor(Math.random() * 2);
    const branches = new THREE.Group();

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const branchLen = 0.25 + Math.random() * 0.2;
      const branchGeo = new THREE.CylinderGeometry(0.025, 0.04, branchLen, 5);
      const branchMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1c });
      const branch = new THREE.Mesh(branchGeo, branchMat);

      const upAngle = 0.4 + Math.random() * 0.4;
      branch.position.set(
        Math.cos(angle) * 0.05,
        trunkHeight * (0.6 + Math.random() * 0.3),
        Math.sin(angle) * 0.05
      );
      branch.rotation.z = -upAngle;
      branch.rotation.y = angle;

      const leafCount = 12 + Math.floor(Math.random() * 8);
      const leafGeo = new THREE.BufferGeometry();
      const leafPositions = new Float32Array(leafCount * 3);
      const leafSizes = new Float32Array(leafCount);

      for (let j = 0; j < leafCount; j++) {
        const rx = (Math.random() - 0.5) * 0.2;
        const ry = (Math.random() - 0.5) * 0.15;
        const rz = (Math.random() - 0.5) * 0.2;
        leafPositions[j * 3] = rx + branchLen * 0.4;
        leafPositions[j * 3 + 1] = ry;
        leafPositions[j * 3 + 2] = rz;
        leafSizes[j] = 0.04 + Math.random() * 0.04;
      }
      leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPositions, 3));
      leafGeo.setAttribute('size', new THREE.BufferAttribute(leafSizes, 1));

      const leafMat = new THREE.PointsMaterial({
        color: 0x4caf50,
        size: 0.06,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const leaves = new THREE.Points(leafGeo, leafMat);
      leaves.userData = { type: 'leaves', phase: Math.random() * Math.PI * 2 };
      branch.add(leaves);

      branches.add(branch);
    }

    group.add(trunk, branches);

    group.scale.set(0, 0, 0);
    let growProgress = 0;
    const growDuration = 1.0;
    let isGrowing = true;

    const roots: THREE.Line[] = [];

    const createRoots = (targetPos: THREE.Vector3) => {
      for (let r = 0; r < 3; r++) {
        const rootPoints: THREE.Vector3[] = [];
        const startPos = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          0,
          (Math.random() - 0.5) * 0.1
        );

        const midOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          -0.05 - Math.random() * 0.05,
          (Math.random() - 0.5) * 0.3
        );

        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const pt = new THREE.Vector3();
          pt.lerpVectors(startPos, targetPos.clone().sub(group.position), t);
          const midInfluence = Math.sin(t * Math.PI);
          pt.add(midOffset.clone().multiplyScalar(midInfluence));
          rootPoints.push(pt);
        }

        const rootGeo = new THREE.BufferGeometry().setFromPoints(rootPoints);
        const rootMat = new THREE.LineBasicMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.3,
        });
        const root = new THREE.Line(rootGeo, rootMat);
        root.userData = { growth: 0, targetOpacity: 0.7 };
        roots.push(root);
        group.add(root);
      }
    };

    const update = (delta: number, time: number, ctx: UpdateContext) => {
      if (isGrowing) {
        growProgress += delta / growDuration;
        if (growProgress >= 1) {
          growProgress = 1;
          isGrowing = false;
        }
        const s = growProgress;
        group.scale.set(s, s, s);
      }

      group.traverse((obj) => {
        if (obj instanceof THREE.Points && obj.userData.type === 'leaves') {
          const mat = obj.material as THREE.PointsMaterial;
          const phase = obj.userData.phase || 0;
          const pulse = 0.7 + 0.3 * Math.sin(time * 2 + phase);
          mat.opacity = 0.7 * pulse;
        }
      });

      if (!isGrowing && roots.length === 0) {
        let nearestWater: EcoElementData | null = null;
        let nearestDist = Infinity;
        for (const el of ctx.allElements) {
          if (el.type === 'water' && el.id !== this.genId()) {
            const d = el.position.distanceTo(group.position);
            if (d < nearestDist && d < 2.5) {
              nearestDist = d;
              nearestWater = el;
            }
          }
        }
        if (nearestWater) {
          createRoots(nearestWater.position.clone());
        }
      }

      for (const root of roots) {
        if (root.userData.growth < 1) {
          root.userData.growth += delta * 0.3;
          if (root.userData.growth > 1) root.userData.growth = 1;
          const mat = root.material as THREE.LineBasicMaterial;
          mat.opacity = 0.7 * root.userData.growth;
        }
        const positions = root.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(time * 1.5 + i * 0.1) * 0.002;
        }
        root.geometry.attributes.position.needsUpdate = true;
      }
    };

    return { update };
  }

  private buildRock(group: THREE.Group): Partial<EcoElementData> {
    const radius = 0.15 + Math.random() * 0.15;
    const detail = 0;
    const rockGeo = new THREE.DodecahedronGeometry(radius, detail);

    const positions = rockGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const jitter = 0.85 + Math.random() * 0.3;
      positions[i] *= jitter;
      positions[i + 1] *= jitter * (0.7 + Math.random() * 0.3);
      positions[i + 2] *= jitter;
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = radius * 0.3;
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.rotation.z = (Math.random() - 0.5) * 0.3;
    rock.castShadow = true;

    group.add(rock);

    const update = (delta: number, time: number) => {
      rock.rotation.y += delta * 0.05;
    };

    return { update };
  }

  private buildWater(group: THREE.Group): Partial<EcoElementData> {
    const radius = 0.25 + Math.random() * 0.15;
    const height = 0.12 + Math.random() * 0.08;

    const waterGeo = new THREE.CylinderGeometry(radius, radius * 1.1, height, 24);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.3,
      clearcoat: 1,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = height / 2;
    water.receiveShadow = true;

    const rippleCount = 3;
    const ripples: THREE.Mesh[] = [];
    for (let i = 0; i < rippleCount; i++) {
      const rGeo = new THREE.RingGeometry(radius * 0.3 + i * 0.04, radius * 0.32 + i * 0.04, 24);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ripple = new THREE.Mesh(rGeo, rMat);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = height * 0.6 + i * 0.005;
      ripple.userData = { phase: (i / rippleCount) * Math.PI * 2 };
      ripples.push(ripple);
      group.add(ripple);
    }

    const glowGeo = new THREE.RingGeometry(radius * 0.9, radius * 1.15, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;

    group.add(water, glow);

    const update = (delta: number, time: number) => {
      water.scale.y = 1 + Math.sin(time * 1.5) * 0.05;
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        const phase = r.userData.phase;
        const s = 0.8 + 0.4 * Math.sin(time * 0.8 + phase);
        r.scale.set(s, s, 1);
        const mat = r.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 * (1 - Math.abs(Math.sin(time * 0.8 + phase)));
      }
    };

    return { update };
  }

  private buildSmallAnimal(group: THREE.Group): Partial<EcoElementData> {
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0.05, 0]);
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xffd54f,
      size: 0.12,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particle = new THREE.Points(particleGeo, particleMat);
    group.add(particle);

    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(20 * 3);
    const trailOpacities = new Float32Array(20);
    for (let i = 0; i < 20; i++) {
      trailOpacities[i] = 1 - i / 20;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('opacity', new THREE.BufferAttribute(trailOpacities, 1));

    const trailMat = new THREE.PointsMaterial({
      color: 0xffd54f,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    group.add(trail);

    let targetPos = new THREE.Vector3(
      (Math.random() - 0.5) * this.bottleRadius * 1.2,
      0.05 + Math.random() * 0.3,
      (Math.random() - 0.5) * this.bottleRadius * 1.2
    );
    let moveTimer = 0;
    const moveInterval = 2.0;
    let nearWaterTimer = 0;
    let isNearWater = false;
    let jumpPhase = 0;

    const trailHistory: THREE.Vector3[] = [];
    for (let i = 0; i < 20; i++) trailHistory.push(new THREE.Vector3());

    const update = (delta: number, time: number, ctx: UpdateContext) => {
      moveTimer += delta;
      if (moveTimer >= moveInterval) {
        moveTimer = 0;
        let nearestPlant: EcoElementData | null = null;
        let nearestDist = Infinity;
        for (const el of ctx.allElements) {
          if (el.type === 'tree' || el.type === 'water' || el.type === 'rock') {
            const d = el.position.distanceTo(group.position);
            if (d < nearestDist) {
              nearestDist = d;
              nearestPlant = el;
            }
          }
        }

        if (nearestPlant && Math.random() < 0.6) {
          const dir = nearestPlant.position.clone().sub(group.position).normalize();
          const dist = Math.min(nearestDist * 0.5, 0.8);
          targetPos = group.position.clone().add(dir.multiplyScalar(dist));
          targetPos.x += (Math.random() - 0.5) * 0.3;
          targetPos.z += (Math.random() - 0.5) * 0.3;
        } else {
          targetPos = new THREE.Vector3(
            (Math.random() - 0.5) * this.bottleRadius * 1.2,
            0.05 + Math.random() * 0.4,
            (Math.random() - 0.5) * this.bottleRadius * 1.2
          );
        }

        const distFromCenter = Math.sqrt(targetPos.x ** 2 + targetPos.z ** 2);
        if (distFromCenter > this.bottleRadius * 0.85) {
          const scale = (this.bottleRadius * 0.8) / distFromCenter;
          targetPos.x *= scale;
          targetPos.z *= scale;
        }
      }

      const moveSpeed = 0.8;
      group.position.lerp(targetPos, delta * moveSpeed);

      let nearWater = false;
      for (const el of ctx.allElements) {
        if (el.type === 'water') {
          if (el.position.distanceTo(group.position) < 0.5) {
            nearWater = true;
            break;
          }
        }
      }

      if (nearWater) {
        nearWaterTimer += delta;
        if (nearWaterTimer > 0.3 && !isNearWater) {
          isNearWater = true;
        }
        if (isNearWater) {
          const mat = particle.material as THREE.PointsMaterial;
          mat.color.setHex(0x4fc3f7);
          const tmat = trail.material as THREE.PointsMaterial;
          tmat.color.setHex(0x4fc3f7);
          jumpPhase += delta * 8;
          group.position.y = 0.05 + Math.abs(Math.sin(jumpPhase)) * 0.15;
        }
      } else {
        nearWaterTimer = 0;
        if (isNearWater) {
          isNearWater = false;
          const mat = particle.material as THREE.PointsMaterial;
          mat.color.setHex(0xffd54f);
          const tmat = trail.material as THREE.PointsMaterial;
          tmat.color.setHex(0xffd54f);
        }
      }

      trailHistory.unshift(group.position.clone());
      if (trailHistory.length > 20) trailHistory.pop();
      const tp = trail.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 20; i++) {
        tp[i * 3] = trailHistory[i].x - group.position.x;
        tp[i * 3 + 1] = trailHistory[i].y - group.position.y;
        tp[i * 3 + 2] = trailHistory[i].z - group.position.z;
      }
      trail.geometry.attributes.position.needsUpdate = true;
    };

    return { update };
  }

  private buildLargeAnimal(group: THREE.Group): Partial<EcoElementData> {
    const bodyGeo = new THREE.SphereGeometry(0.18, 12, 8);
    bodyGeo.scale(1, 0.6, 1.5);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.15;
    body.castShadow = true;

    const headGeo = new THREE.SphereGeometry(0.1, 10, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.2, 0.2);
    head.castShadow = true;

    group.add(body, head);

    let angle = Math.random() * Math.PI * 2;
    const patrolRadius = this.bottleRadius * 0.65;
    let speed = 0.3;
    let targetAngle = angle;
    let avoiding = false;

    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(30 * 3);
    const trailAlpha = new Float32Array(30);
    for (let i = 0; i < 30; i++) trailAlpha[i] = 1 - i / 30;
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('a', new THREE.BufferAttribute(trailAlpha, 1));

    const trailMat = new THREE.PointsMaterial({
      color: 0x8b5e3c,
      size: 0.03,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    group.add(trail);

    const trailHistory: THREE.Vector3[] = [];
    for (let i = 0; i < 30; i++) trailHistory.push(new THREE.Vector3());

    const update = (delta: number, time: number, ctx: UpdateContext) => {
      const rocks = ctx.allElements.filter(e => e.type === 'rock');

      let nearestRockDist = Infinity;
      let nearestRock: EcoElementData | null = null;
      for (const rock of rocks) {
        const d = rock.position.distanceTo(group.position);
        if (d < nearestRockDist) {
          nearestRockDist = d;
          nearestRock = rock;
        }
      }

      if (nearestRock && nearestRockDist < 0.4) {
        avoiding = true;
        const awayDir = group.position.clone().sub(nearestRock.position).normalize();
        targetAngle = Math.atan2(awayDir.z, awayDir.x);
        speed = 0.6;
      } else {
        if (avoiding) {
          avoiding = false;
        }
        targetAngle += delta * 0.15;
        speed = 0.25;
      }

      const angleDiff = targetAngle - angle;
      angle += angleDiff * delta * 2;

      const r = avoiding ? patrolRadius * 0.8 : patrolRadius;
      const target = new THREE.Vector3(
        Math.cos(angle) * r,
        0.1,
        Math.sin(angle) * r
      );

      group.position.lerp(target, delta * speed);
      group.rotation.y = angle + Math.PI / 2;

      trailHistory.unshift(new THREE.Vector3(0, -0.05, 0));
      if (trailHistory.length > 30) trailHistory.pop();
      const tp = trail.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 30; i++) {
        tp[i * 3] = 0;
        tp[i * 3 + 1] = -0.08 - i * 0.002;
        tp[i * 3 + 2] = 0;
      }
      trail.geometry.attributes.position.needsUpdate = true;
    };

    return { update };
  }

  private buildWeatherCloud(group: THREE.Group): Partial<EcoElementData> {
    const cloudGroup = new THREE.Group();

    const puffCount = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < puffCount; i++) {
      const r = 0.12 + Math.random() * 0.08;
      const puffGeo = new THREE.SphereGeometry(r, 10, 8);
      const puffMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);
      puff.position.set(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      );
      cloudGroup.add(puff);
    }

    group.add(cloudGroup);
    group.position.y = this.bottleRadius * 0.5;

    let floatPhase = Math.random() * Math.PI * 2;

    const update = (delta: number, time: number) => {
      floatPhase += delta * 0.4;
      group.position.y = this.bottleRadius * 0.5 + Math.sin(floatPhase) * 0.05;
      cloudGroup.rotation.y += delta * 0.05;
    };

    return { update };
  }

  public getParticleBudget(): { used: number; max: number } {
    return { used: this.particleCount, max: this.maxParticles };
  }
}
