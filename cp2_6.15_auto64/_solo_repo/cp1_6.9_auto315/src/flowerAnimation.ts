import * as THREE from 'three';

interface FallingPetal {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  age: number;
  lifetime: number;
  spiralPhase: number;
  spiralRadius: number;
  upward: THREE.Vector3;
}

export class FlowerAnimationSystem {
  private scene: THREE.Scene;
  private fallingPetals: FallingPetal[] = [];
  private nextFallCheck: number = 0;
  private petalPool: FallingPetal[] = [];
  private readonly MAX_PETALS = 80;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  updateFlowers(flowers: THREE.Group[], elapsedTime: number, _deltaTime: number) {
    for (const flower of flowers) {
      const { period, phase, maxOpen } = flower.userData;
      const t = (elapsedTime / period + phase) * Math.PI * 2;
      const openAmount = (Math.sin(t) + 1) / 2;

      for (let i = 0; i < flower.children.length; i++) {
        const child = flower.children[i];
        if (!(child instanceof THREE.Mesh) || !child.userData.baseAxis) continue;

        const petal = child as THREE.Mesh;
        const { baseAngle, basePosition, baseScale } = petal.userData;

        const targetOpen = openAmount * maxOpen;

        const axis = new THREE.Vector3(
          -Math.sin(baseAngle),
          0,
          Math.cos(baseAngle)
        ).normalize();

        const openQuat = new THREE.Quaternion().setFromAxisAngle(axis, targetOpen);
        const rotZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), baseAngle);
        const finalQuat = new THREE.Quaternion().copy(rotZ).multiply(openQuat);

        petal.quaternion.slerp(finalQuat, 0.25);

        const breatheScale = 1 + Math.sin(t + baseAngle) * 0.08;
        petal.scale.lerp(
          new THREE.Vector3(
            baseScale.x * breatheScale,
            baseScale.y * breatheScale,
            baseScale.z
          ),
          0.2
        );

        const swayX = Math.sin(elapsedTime * 1.5 + phase * 3 + i * 0.3) * 0.008;
        const swayZ = Math.cos(elapsedTime * 1.2 + phase * 2 + i * 0.4) * 0.008;
        petal.position.x = basePosition.x + swayX;
        petal.position.z = basePosition.z + swayZ;

        petal.userData.openAmount = targetOpen;
      }

      if (flower.userData.centerGlow) {
        const glow = flower.userData.centerGlow as THREE.Mesh;
        const pulse = 0.85 + Math.sin(elapsedTime * 2.5 + phase) * 0.15;
        glow.scale.setScalar(pulse);
        const mat = glow.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(elapsedTime * 3 + phase) * 0.2;
      }
    }
  }

  private createFallingPetal(flower: THREE.Group): FallingPetal | null {
    let petalMesh: THREE.Mesh | null = null;
    let petalIndex = -1;

    for (let i = 0; i < flower.children.length; i++) {
      const child = flower.children[i];
      if (child instanceof THREE.Mesh && child.userData.baseAxis) {
        petalMesh = child as THREE.Mesh;
        petalIndex = i;
        break;
      }
    }

    if (!petalMesh) return null;

    const worldPos = new THREE.Vector3();
    petalMesh.getWorldPosition(worldPos);
    const worldQuat = new THREE.Quaternion();
    petalMesh.getWorldQuaternion(worldQuat);
    const worldScale = new THREE.Vector3();
    petalMesh.getWorldScale(worldScale);

    const origMat = petalMesh.material as THREE.MeshBasicMaterial;
    const color = origMat.color.clone();

    const petalGeo = new THREE.CircleGeometry(1, 10);
    const petalMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const newPetal = new THREE.Mesh(petalGeo, petalMat);
    newPetal.position.copy(worldPos);
    newPetal.quaternion.copy(worldQuat);
    newPetal.scale.copy(worldScale);

    this.scene.add(newPetal);

    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      -0.3 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.4
    ).normalize();

    const speed = 0.25 + Math.random() * 0.35;

    const rotationAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    const rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
    );

    flower.remove(petalMesh);
    petalMesh.geometry.dispose();
    (petalMesh.material as THREE.Material).dispose();

    void petalIndex;

    return {
      mesh: newPetal,
      velocity: dir.multiplyScalar(speed),
      rotationAxis,
      rotationSpeed,
      age: 0,
      lifetime: 2.0,
      spiralPhase: Math.random() * Math.PI * 2,
      spiralRadius: 0.12 + Math.random() * 0.15,
      upward: new THREE.Vector3(0, 1, 0),
    };
  }

  updatePetalFall(flowers: THREE.Group[], elapsedTime: number, deltaTime: number) {
    if (elapsedTime >= this.nextFallCheck) {
      this.nextFallCheck = elapsedTime + 3 + Math.random() * 2;

      if (flowers.length > 0 && this.fallingPetals.length < this.MAX_PETALS) {
        const validFlowers = flowers.filter(f => {
          let count = 0;
          for (const c of f.children) {
            if (c instanceof THREE.Mesh && c.userData.baseAxis) count++;
          }
          return count >= 3;
        });

        if (validFlowers.length > 0) {
          const targetFlower = validFlowers[Math.floor(Math.random() * validFlowers.length)];
          const petal = this.createFallingPetal(targetFlower);
          if (petal) {
            this.fallingPetals.push(petal);
          }
        }
      }
    }

    for (let i = this.fallingPetals.length - 1; i >= 0; i--) {
      const petal = this.fallingPetals[i];
      petal.age += deltaTime;

      if (petal.age >= petal.lifetime) {
        this.scene.remove(petal.mesh);
        petal.mesh.geometry.dispose();
        (petal.mesh.material as THREE.Material).dispose();
        this.fallingPetals.splice(i, 1);
        continue;
      }

      const progress = petal.age / petal.lifetime;

      petal.spiralPhase += deltaTime * 2.5;
      const spiralX = Math.cos(petal.spiralPhase) * petal.spiralRadius;
      const spiralZ = Math.sin(petal.spiralPhase) * petal.spiralRadius;

      const windX = Math.sin(elapsedTime * 0.8 + petal.mesh.position.y * 2) * 0.05;
      const windZ = Math.cos(elapsedTime * 0.6 + petal.mesh.position.x * 2) * 0.05;

      petal.mesh.position.x += (petal.velocity.x + spiralX + windX) * deltaTime;
      petal.mesh.position.y += (petal.velocity.y - 0.15 * progress) * deltaTime;
      petal.mesh.position.z += (petal.velocity.z + spiralZ + windZ) * deltaTime;

      const quatX = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        petal.rotationSpeed.x * deltaTime
      );
      const quatY = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        petal.rotationSpeed.y * deltaTime
      );
      const quatZ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        petal.rotationSpeed.z * deltaTime
      );

      petal.mesh.quaternion.multiply(quatX);
      petal.mesh.quaternion.multiply(quatY);
      petal.mesh.quaternion.multiply(quatZ);

      const scaleFade = 1 - progress * 0.4;
      petal.mesh.scale.x *= 1 + (scaleFade - 1) * 0.02;
      petal.mesh.scale.y *= 1 + (scaleFade - 1) * 0.02;

      const mat = petal.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85 * (1 - progress);
    }
  }

  update(
    flowers: THREE.Group[],
    elapsedTime: number,
    deltaTime: number
  ) {
    this.updateFlowers(flowers, elapsedTime, deltaTime);
    this.updatePetalFall(flowers, elapsedTime, deltaTime);
  }

  dispose() {
    for (const petal of this.fallingPetals) {
      this.scene.remove(petal.mesh);
      petal.mesh.geometry.dispose();
      (petal.mesh.material as THREE.Material).dispose();
    }
    this.fallingPetals = [];
    for (const petal of this.petalPool) {
      petal.mesh.geometry.dispose();
      (petal.mesh.material as THREE.Material).dispose();
    }
    this.petalPool = [];
  }
}
