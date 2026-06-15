import * as THREE from 'three';

interface PrismData {
  mesh: THREE.Mesh;
  baseAngle: number;
  baseRadius: number;
  height: number;
  swingSpeed: number;
  swingPhase: number;
  swingPeriod: number;
  hue: number;
  whiteFlashTime: number;
  originalEmissiveIntensity: number;
}

export class PrismArray {
  public group: THREE.Group;
  private prisms: PrismData[] = [];
  private readonly prismCount = 200;
  private readonly ringRadius = 12;
  private readonly globalRotationSpeed = (Math.PI * 2) / 20;
  private globalAngle = 0;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.createPrisms();
    this.scene.add(this.group);
  }

  private createPrismGeometry(): { geometry: THREE.BufferGeometry; height: number } {
    const radiusTop = 0.25;
    const radiusBottom = 0.25;
    const height = 3 + Math.random() * 2;
    const radialSegments = 6;
    return {
      geometry: new THREE.CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        radialSegments
      ),
      height
    };
  }

  private createPrisms(): void {
    for (let i = 0; i < this.prismCount; i++) {
      const angle = (i / this.prismCount) * Math.PI * 2;
      const hue = i / this.prismCount;
      const { geometry, height: prismHeight } = this.createPrismGeometry();
      const radiusVariation = (Math.random() - 0.5) * 1.5;
      const radius = this.ringRadius + radiusVariation;

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(hue, 0.9, 0.55),
        transparent: true,
        opacity: 0.65,
        emissive: new THREE.Color().setHSL(hue, 1.0, 0.35),
        emissiveIntensity: 0.8,
        side: THREE.DoubleSide,
        shininess: 120,
        specular: new THREE.Color(0xffffff)
      });

      const mesh = new THREE.Mesh(geometry, material);
      const height = prismHeight;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      mesh.position.set(x, (Math.random() - 0.5) * 1.5, z);
      mesh.lookAt(new THREE.Vector3(0, mesh.position.y, 0));
      mesh.rotateZ(Math.PI / 2);

      this.group.add(mesh);

      this.prisms.push({
        mesh,
        baseAngle: angle,
        baseRadius: radius,
        height,
        swingSpeed: 0.3 + Math.random() * 0.5,
        swingPhase: Math.random() * Math.PI * 2,
        swingPeriod: 3 + Math.random() * 2,
        hue,
        whiteFlashTime: 0,
        originalEmissiveIntensity: 0.8
      });
    }
  }

  public triggerPulse(): void {
    for (const prism of this.prisms) {
      prism.whiteFlashTime = 0.2;
    }
  }

  public getPrisms(): PrismData[] {
    return this.prisms;
  }

  public getPrismCount(): number {
    return this.prismCount;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.globalAngle += this.globalRotationSpeed * deltaTime;
    this.group.rotation.y = this.globalAngle;

    for (const prism of this.prisms) {
      const swingAmount = Math.sin(
        (elapsedTime / prism.swingPeriod) * Math.PI * 2 + prism.swingPhase
      );
      const swingAngle = swingAmount * prism.swingSpeed * 0.3;

      const baseX = Math.cos(prism.baseAngle) * prism.baseRadius;
      const baseZ = Math.sin(prism.baseAngle) * prism.baseRadius;

      const offsetX = Math.cos(prism.baseAngle + Math.PI / 2) * swingAngle * 2;
      const offsetZ = Math.sin(prism.baseAngle + Math.PI / 2) * swingAngle * 2;

      prism.mesh.position.x = baseX + offsetX;
      prism.mesh.position.z = baseZ + offsetZ;
      prism.mesh.rotation.y = swingAngle * 0.5;

      const material = prism.mesh.material as THREE.MeshPhongMaterial;

      if (prism.whiteFlashTime > 0) {
        prism.whiteFlashTime -= deltaTime;
        const flashProgress = Math.max(0, prism.whiteFlashTime / 0.2);
        material.color.setRGB(
          0.5 + flashProgress * 0.5,
          0.5 + flashProgress * 0.5,
          0.5 + flashProgress * 0.5
        );
        material.emissive.setRGB(
          0.35 + flashProgress * 0.85,
          0.35 + flashProgress * 0.85,
          0.35 + flashProgress * 0.85
        );
        material.emissiveIntensity =
          prism.originalEmissiveIntensity * (1 + flashProgress * 0.2);
      } else {
        const dynamicHue = (prism.hue + elapsedTime * 0.02) % 1.0;
        material.color.setHSL(dynamicHue, 0.9, 0.55);
        material.emissive.setHSL(dynamicHue, 1.0, 0.35);
        material.emissiveIntensity = prism.originalEmissiveIntensity;
      }
    }
  }

  public getPrismHueAtPosition(
    pos: THREE.Vector3,
    elapsedTime: number
  ): number {
    let nearestHue = 0;
    let nearestDist = Infinity;

    for (const prism of this.prisms) {
      const worldPos = new THREE.Vector3();
      prism.mesh.getWorldPosition(worldPos);
      const dist = pos.distanceTo(worldPos);
      if (dist < nearestDist && dist < 1.5) {
        nearestDist = dist;
        nearestHue = (prism.hue + elapsedTime * 0.02) % 1.0;
      }
    }

    return nearestHue;
  }

  public checkCollision(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    _deltaTime: number
  ): { collided: boolean; hue: number; newVelocity: THREE.Vector3 } {
    let collided = false;
    let hue = 0;
    let newVelocity = velocity.clone();

    for (const prism of this.prisms) {
      const worldPos = new THREE.Vector3();
      prism.mesh.getWorldPosition(worldPos);
      worldPos.y = position.y;

      const distVec = new THREE.Vector3().subVectors(position, worldPos);
      const dist = distVec.length();

      if (dist < 0.55) {
        collided = true;
        hue = prism.hue;

        const normal = distVec.clone().normalize();
        const dot = velocity.dot(normal);
        newVelocity = velocity
          .clone()
          .sub(normal.multiplyScalar(2 * dot));

        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.6;
        newVelocity.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          randomAngle
        );
        newVelocity.applyAxisAngle(
          new THREE.Vector3(1, 0, 0),
          (Math.random() - 0.5) * Math.PI * 0.4
        );

        break;
      }
    }

    return { collided, hue, newVelocity };
  }

  public dispose(): void {
    for (const prism of this.prisms) {
      prism.mesh.geometry.dispose();
      (prism.mesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.group);
  }
}
