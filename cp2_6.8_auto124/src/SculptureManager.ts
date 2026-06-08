import * as THREE from 'three';

export type TemplateType = 'starRing' | 'floatingCube' | 'spiralTower' | 'chaosCluster';

export interface SculptureMesh {
  mesh: THREE.Mesh;
  outline: THREE.LineSegments;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  baseScale: number;
  orbitSpeed: number;
  orbitRadius: number;
  orbitHeight: number;
  orbitAngle: number;
  selfRotationSpeed: THREE.Vector3;
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmplitude: number;
  chaosVelocity?: THREE.Vector3;
  colorShiftSpeed?: number;
  colorShiftPhase?: number;
  templateSpecific: Record<string, any>;
}

export class SculptureManager {
  public group: THREE.Group;
  public sculptures: SculptureMesh[] = [];
  public selectedSculpture: SculptureMesh | null = null;
  public scene: THREE.Scene;
  private currentTemplate: TemplateType = 'starRing';
  private transitionInProgress = false;
  private lerpDuration = 0.3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  private createGlassMaterial(color: number, opacity: number): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.3,
      metalness: 0.1,
      transmission: 0.2,
      thickness: 0.5,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    });
  }

  private createOutline(mesh: THREE.Mesh, opacity = 0.6): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity,
    });
    const line = new THREE.LineSegments(edges, material);
    line.visible = false;
    mesh.add(line);
    return line;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public async switchTemplate(template: TemplateType): Promise<void> {
    if (this.transitionInProgress || this.currentTemplate === template) return;
    this.transitionInProgress = true;
    this.currentTemplate = template;
    this.deselectAll();

    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
      overlay.classList.add('active');
      await new Promise((res) => setTimeout(res, 500));
    }

    this.clearAll();
    this.buildTemplate(template);

    if (overlay) {
      overlay.classList.remove('active');
      await new Promise((res) => setTimeout(res, 500));
    }
    this.transitionInProgress = false;
  }

  private clearAll(): void {
    for (const s of this.sculptures) {
      this.group.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
      s.outline.geometry.dispose();
      (s.outline.material as THREE.Material).dispose();
    }
    this.sculptures = [];
  }

  public buildTemplate(template: TemplateType): void {
    switch (template) {
      case 'starRing':
        this.buildStarRing();
        break;
      case 'floatingCube':
        this.buildFloatingCube();
        break;
      case 'spiralTower':
        this.buildSpiralTower();
        break;
      case 'chaosCluster':
        this.buildChaosCluster();
        break;
    }
  }

  private buildStarRing(): void {
    const centerGeom = new THREE.SphereGeometry(0.6, 24, 24);
    const centerMat = this.createGlassMaterial(0xff6b35, 1.0);
    const centerMesh = new THREE.Mesh(centerGeom, centerMat);
    centerMesh.castShadow = true;
    centerMesh.receiveShadow = true;
    const centerOutline = this.createOutline(centerMesh);
    this.group.add(centerMesh);
    this.sculptures.push({
      mesh: centerMesh,
      outline: centerOutline,
      basePosition: new THREE.Vector3(0, 0, 0),
      baseRotation: new THREE.Euler(0, 0, 0),
      baseScale: 1,
      orbitSpeed: 0,
      orbitRadius: 0,
      orbitHeight: 0,
      orbitAngle: 0,
      selfRotationSpeed: new THREE.Vector3(0, 0.5, 0),
      pulsePhase: 0,
      pulseSpeed: 0,
      pulseAmplitude: 0,
      templateSpecific: { layer: 0 },
    });

    const colorStart = new THREE.Color(0xff6b35);
    const colorEnd = new THREE.Color(0xd53f8c);
    const rings = 8;

    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      const color = colorStart.clone().lerp(colorEnd, t);
      const opacity = this.lerp(0.7, 1.0, t);
      const radius = this.lerp(1.5, 3.5, t);
      const height = this.lerp(-1.5, 1.5, t);
      const tube = this.lerp(0.08, 0.2, t);

      const geom = new THREE.TorusGeometry(radius, tube, 12, 48);
      const mat = this.createGlassMaterial(color.getHex(), opacity);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const outline = this.createOutline(mesh);
      this.group.add(mesh);

      this.sculptures.push({
        mesh,
        outline,
        basePosition: new THREE.Vector3(0, height, 0),
        baseRotation: new THREE.Euler(
          (i % 2 === 0 ? Math.PI / 2 : 0) + t * 0.3,
          t * Math.PI * 0.5,
          i * 0.2
        ),
        baseScale: 1,
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * this.lerp(0.3, 0.8, t),
        orbitRadius: 0,
        orbitHeight: 0,
        orbitAngle: Math.random() * Math.PI * 2,
        selfRotationSpeed: new THREE.Vector3(
          (i % 2 === 0 ? 0.2 : -0.2) * (1 + t),
          this.lerp(0.1, 0.4, t),
          0
        ),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + t,
        pulseAmplitude: 0.05,
        templateSpecific: { layer: i + 1, ringRadius: radius },
      });
    }
  }

  private buildFloatingCube(): void {
    const colors = [
      new THREE.Color(0x667eea),
      new THREE.Color(0x764ba2),
      new THREE.Color(0x48bb78),
      new THREE.Color(0x38b2ac),
      new THREE.Color(0x9f7aea),
      new THREE.Color(0x4299e1),
    ];

    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
          const idx = x * 9 + y * 3 + z;
          const c1 = colors[Math.floor(Math.random() * colors.length)];
          const c2 = colors[Math.floor(Math.random() * colors.length)];

          const geom = new THREE.BoxGeometry(0.5, 0.5, 0.5, 2, 2, 2);
          const mat = this.createGlassMaterial(c1.getHex(), 0.85);
          const mesh = new THREE.Mesh(geom, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const outline = this.createOutline(mesh);
          this.group.add(mesh);

          const pos = new THREE.Vector3(
            (x - 1) * 1.2,
            (y - 1) * 1.2,
            (z - 1) * 1.2
          );

          this.sculptures.push({
            mesh,
            outline,
            basePosition: pos,
            baseRotation: new THREE.Euler(
              Math.random() * 0.3,
              Math.random() * 0.3,
              Math.random() * 0.3
            ),
            baseScale: 1,
            orbitSpeed: 0,
            orbitRadius: 0,
            orbitHeight: 0,
            orbitAngle: 0,
            selfRotationSpeed: new THREE.Vector3(
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.3
            ),
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 1 + Math.random() * 0.5,
            pulseAmplitude: 0.2,
            templateSpecific: {
              idx,
              colorShift: Math.random() * Math.PI * 2,
              color1: c1.getHex(),
              color2: c2.getHex(),
            },
          });
        }
      }
    }
  }

  private buildSpiralTower(): void {
    const count = 12;
    const colorBottom = new THREE.Color(0x553c9a);
    const colorTop = new THREE.Color(0xf6e05e);

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const color = colorBottom.clone().lerp(colorTop, t);
      const angle = t * Math.PI * 4;
      const radius = 0.5 + t * 1.5;
      const y = this.lerp(-2.5, 2.5, t);

      const sides = 3 + (i % 4);
      const geom = new THREE.CylinderGeometry(0.25, 0.25, 0.5, sides, 1);
      const mat = this.createGlassMaterial(color.getHex(), this.lerp(0.75, 0.95, t));
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const outline = this.createOutline(mesh);
      this.group.add(mesh);

      this.sculptures.push({
        mesh,
        outline,
        basePosition: new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ),
        baseRotation: new THREE.Euler(0, -angle, 0),
        baseScale: this.lerp(0.7, 1.3, t),
        orbitSpeed: 0.3,
        orbitRadius: 0,
        orbitHeight: 0,
        orbitAngle: angle,
        selfRotationSpeed: new THREE.Vector3(0, THREE.MathUtils.degToRad(30), 0),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.8 + t * 0.4,
        pulseAmplitude: 0.03,
        templateSpecific: { index: i, spiralT: t, baseAngle: angle, baseRadius: radius },
      });
    }
  }

  private buildChaosCluster(): void {
    const count = 20;
    const palette = [
      0xff6b35, 0xd53f8c, 0x667eea, 0x48bb78, 0xf6e05e,
      0x9f7aea, 0x38b2ac, 0xfc8181, 0x68d391, 0x63b3ed,
    ];

    for (let i = 0; i < count; i++) {
      const isTorus = Math.random() > 0.5;
      const geom = isTorus
        ? new THREE.TorusGeometry(0.3 + Math.random() * 0.3, 0.08, 8, 24)
        : new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 16, 16);

      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = this.createGlassMaterial(color, 0.6 + Math.random() * 0.4);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const outline = this.createOutline(mesh);
      this.group.add(mesh);

      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );

      this.sculptures.push({
        mesh,
        outline,
        basePosition: pos,
        baseRotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        baseScale: 0.8 + Math.random() * 0.6,
        orbitSpeed: 0,
        orbitRadius: 0,
        orbitHeight: 0,
        orbitAngle: 0,
        selfRotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        ),
        pulsePhase: 0,
        pulseSpeed: 0,
        pulseAmplitude: 0,
        chaosVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
        ),
        colorShiftSpeed: 0.5 + Math.random() * 1.5,
        colorShiftPhase: Math.random() * Math.PI * 2,
        templateSpecific: {
          isTorus: isTorus ? 1 : 0,
          colorIdx: palette.indexOf(color),
          palette: JSON.stringify(palette),
        },
      });
    }
  }

  public update(delta: number, time: number): void {
    this.group.rotation.y += delta * 0.08;

    for (const s of this.sculptures) {
      s.mesh.rotation.x += s.selfRotationSpeed.x * delta;
      s.mesh.rotation.y += s.selfRotationSpeed.y * delta;
      s.mesh.rotation.z += s.selfRotationSpeed.z * delta;

      let scale = s.baseScale;
      if (s.pulseAmplitude > 0) {
        s.pulsePhase += s.pulseSpeed * delta;
        scale *= 1 + Math.sin(s.pulsePhase) * s.pulseAmplitude;
      }

      if (this.currentTemplate === 'starRing') {
        s.orbitAngle += s.orbitSpeed * delta;
        const ringR = s.templateSpecific.ringRadius || 0;
        if (ringR === 0) {
          s.mesh.position.copy(s.basePosition);
        } else {
          s.mesh.position.set(
            s.basePosition.x + Math.cos(s.orbitAngle) * 0.1,
            s.basePosition.y,
            s.basePosition.z + Math.sin(s.orbitAngle) * 0.1
          );
        }
      } else if (this.currentTemplate === 'spiralTower') {
        s.orbitAngle += s.orbitSpeed * delta;
        const t = s.templateSpecific.spiralT || 0;
        const baseAngle = s.templateSpecific.baseAngle || 0;
        const baseRadius = s.templateSpecific.baseRadius || 0;
        const currentAngle = baseAngle + s.orbitAngle * 0.3;
        s.mesh.position.set(
          Math.cos(currentAngle) * baseRadius,
          s.basePosition.y + Math.sin(time * 0.5 + t * 3) * 0.08,
          Math.sin(currentAngle) * baseRadius
        );
      } else if (this.currentTemplate === 'chaosCluster' && s.chaosVelocity) {
        s.mesh.position.x += s.chaosVelocity.x * delta;
        s.mesh.position.y += s.chaosVelocity.y * delta;
        s.mesh.position.z += s.chaosVelocity.z * delta;

        const bound = 3.5;
        for (const axis of ['x', 'y', 'z'] as const) {
          if (Math.abs(s.mesh.position[axis]) > bound) {
            s.chaosVelocity[axis] *= -1;
            s.mesh.position[axis] = Math.sign(s.mesh.position[axis]) * bound;
          }
        }

        if (s.colorShiftSpeed && s.colorShiftPhase !== undefined) {
          s.colorShiftPhase += s.colorShiftSpeed * delta;
          try {
            const palette = JSON.parse(s.templateSpecific.palette) as number[];
            const idx =
              ((s.templateSpecific.colorIdx + Math.floor(s.colorShiftPhase)) %
                palette.length +
                palette.length) %
              palette.length;
            (s.mesh.material as THREE.MeshPhysicalMaterial).color.setHex(
              palette[idx]
            );
          } catch {}
        }
      } else if (this.currentTemplate === 'floatingCube') {
        try {
          const c1 = new THREE.Color(s.templateSpecific.color1 as number);
          const c2 = new THREE.Color(s.templateSpecific.color2 as number);
          const shift = (s.templateSpecific.colorShift as number) + delta * 0.6;
          s.templateSpecific.colorShift = shift;
          const mix = (Math.sin(shift) + 1) / 2;
          (s.mesh.material as THREE.MeshPhysicalMaterial).color.copy(
            c1.clone().lerp(c2, mix)
          );
        } catch {}
        s.mesh.position.set(
          s.basePosition.x + Math.sin(time * 0.8 + s.basePosition.x) * 0.05,
          s.basePosition.y + Math.sin(time * 0.7 + s.basePosition.y * 2) * 0.08,
          s.basePosition.z + Math.sin(time * 0.9 + s.basePosition.z * 1.5) * 0.05
        );
      } else {
        s.mesh.position.copy(s.basePosition);
      }

      s.mesh.scale.setScalar(scale);
    }
  }

  public selectMesh(mesh: THREE.Mesh): void {
    this.deselectAll();
    const sc = this.sculptures.find((s) => s.mesh === mesh);
    if (!sc) return;
    this.selectedSculpture = sc;
    sc.outline.visible = true;
    (sc.outline.material as THREE.LineBasicMaterial).opacity = 0.6;
    (sc.outline.material as THREE.LineBasicMaterial).color.setHex(0xffffff);
    const mat = sc.mesh.material as THREE.MeshPhysicalMaterial;
    const origEmissive = mat.emissive.getHex();
    mat.emissive.setHex(0x222244);
    setTimeout(() => {
      if (this.selectedSculpture === sc) {
        mat.emissive.setHex(origEmissive);
      }
    }, 150);
  }

  public deselectAll(): void {
    for (const s of this.sculptures) {
      s.outline.visible = false;
    }
    this.selectedSculpture = null;
  }

  public updateSelectedParam(key: string, value: number | string): void {
    const s = this.selectedSculpture;
    if (!s) return;
    const mat = s.mesh.material as THREE.MeshPhysicalMaterial;

    switch (key) {
      case 'posX':
        s.basePosition.x = value as number;
        break;
      case 'posY':
        s.basePosition.y = value as number;
        break;
      case 'posZ':
        s.basePosition.z = value as number;
        break;
      case 'rotX':
        s.mesh.rotation.x = THREE.MathUtils.degToRad(value as number);
        s.baseRotation.x = s.mesh.rotation.x;
        break;
      case 'rotY':
        s.mesh.rotation.y = THREE.MathUtils.degToRad(value as number);
        s.baseRotation.y = s.mesh.rotation.y;
        break;
      case 'rotZ':
        s.mesh.rotation.z = THREE.MathUtils.degToRad(value as number);
        s.baseRotation.z = s.mesh.rotation.z;
        break;
      case 'scale':
        s.baseScale = value as number;
        break;
      case 'color':
        mat.color.set(value as string);
        break;
      case 'opacity':
        mat.opacity = value as number;
        break;
    }

    mat.emissive.setHex(0x333366);
    clearTimeout((this as any)._feedbackTimer);
    (this as any)._feedbackTimer = setTimeout(() => {
      mat.emissive.setHex(0x000000);
    }, 100);
  }

  public getSelectedParams(): Record<string, number | string> | null {
    const s = this.selectedSculpture;
    if (!s) return null;
    const mat = s.mesh.material as THREE.MeshPhysicalMaterial;
    return {
      posX: s.basePosition.x,
      posY: s.basePosition.y,
      posZ: s.basePosition.z,
      rotX: THREE.MathUtils.radToDeg(s.mesh.rotation.x) % 360,
      rotY: THREE.MathUtils.radToDeg(s.mesh.rotation.y) % 360,
      rotZ: THREE.MathUtils.radToDeg(s.mesh.rotation.z) % 360,
      scale: s.baseScale,
      color: '#' + mat.color.getHexString(),
      opacity: mat.opacity,
    };
  }

  public getCurrentTemplate(): TemplateType {
    return this.currentTemplate;
  }
}
