import * as THREE from 'three';

export interface LightsaberParams {
  bladeColor: THREE.ColorRepresentation;
  bladeLength: number;
  glowIntensity: number;
  hiltRoughness: number;
}

export class LightsaberForge {
  public group: THREE.Group;
  public blade: THREE.Mesh;
  public bladeGlow: THREE.Mesh;
  public hiltGroup: THREE.Group;
  public bladeLight: THREE.PointLight;
  public tipPosition: THREE.Vector3;

  private currentParams: LightsaberParams;
  private bladeBaseLength: number = 3.0;

  constructor(params: LightsaberParams) {
    this.currentParams = { ...params };
    this.group = new THREE.Group();
    this.tipPosition = new THREE.Vector3();

    this.blade = this.createBlade();
    this.bladeGlow = this.createBladeGlow();
    this.hiltGroup = this.createHilt();

    this.group.add(this.blade);
    this.group.add(this.bladeGlow);
    this.group.add(this.hiltGroup);

    this.bladeLight = new THREE.PointLight(
      new THREE.Color(params.bladeColor),
      1.0,
      15,
      2
    );
    this.bladeLight.castShadow = true;
    this.bladeLight.shadow.mapSize.set(1024, 1024);
    this.group.add(this.bladeLight);

    this.update(params);
  }

  private createBlade(): THREE.Mesh {
    const length = this.bladeBaseLength * this.currentParams.bladeLength;
    const geometry = new THREE.CylinderGeometry(0.08, 0.08, length, 32, 1, true);
    geometry.translate(0, length / 2 + 0.5, 0);

    const tipGeo = new THREE.ConeGeometry(0.08, 0.2, 32);
    tipGeo.translate(0, length + 0.6, 0);

    const merged = this.mergeGeometries(geometry, tipGeo);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentParams.bladeColor),
      emissive: new THREE.Color(this.currentParams.bladeColor),
      emissiveIntensity: 2.0 * this.currentParams.glowIntensity,
      transparent: true,
      opacity: 0.95,
      metalness: 0.3,
      roughness: 0.1,
    });

    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    return mesh;
  }

  private createBladeGlow(): THREE.Mesh {
    const length = this.bladeBaseLength * this.currentParams.bladeLength;
    const geometry = new THREE.CylinderGeometry(0.2, 0.2, length + 0.4, 32, 1, true);
    geometry.translate(0, length / 2 + 0.55, 0);

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.currentParams.bladeColor),
      transparent: true,
      opacity: 0.25 * this.currentParams.glowIntensity,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
  }

  private createHilt(): THREE.Group {
    const group = new THREE.Group();

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.9,
      roughness: this.currentParams.hiltRoughness,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      metalness: 0.8,
      roughness: Math.max(0.1, this.currentParams.hiltRoughness - 0.1),
    });

    const emitterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentParams.bladeColor),
      emissive: new THREE.Color(this.currentParams.bladeColor),
      emissiveIntensity: 1.5 * this.currentParams.glowIntensity,
      metalness: 0.2,
      roughness: 0.3,
    });

    const emitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.1, 24),
      emitterMat
    );
    emitter.position.y = 0.45;
    emitter.castShadow = true;
    group.add(emitter);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.2, 24),
      accentMat
    );
    neck.position.y = 0.3;
    neck.castShadow = true;
    group.add(neck);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.6, 24),
      baseMat
    );
    body.position.y = -0.1;
    body.castShadow = true;
    group.add(body);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.025, 12, 32),
      accentMat
    );
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.1;
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.025, 12, 32),
      accentMat
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -0.25;
    group.add(ring2);

    const switchBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.06),
      accentMat
    );
    switchBlock.position.set(0.15, -0.05, 0);
    group.add(switchBlock);

    const switchBtn = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.05, 0.03),
      emitterMat
    );
    switchBtn.position.set(0.175, -0.05, 0);
    group.add(switchBtn);

    const pommel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.08, 0.2, 24),
      baseMat
    );
    pommel.position.y = -0.5;
    pommel.castShadow = true;
    group.add(pommel);

    const pommelCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 24, 24),
      accentMat
    );
    pommelCap.position.y = -0.6;
    group.add(pommelCap);

    return group;
  }

  private mergeGeometries(geo1: THREE.BufferGeometry, geo2: THREE.BufferGeometry): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry();

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let offset = 0;

    for (const geo of [geo1, geo2]) {
      const pos = geo.attributes.position;
      const nor = geo.attributes.normal;
      const uv = geo.attributes.uv;
      const idx = geo.index;

      if (idx) {
        for (let i = 0; i < idx.count; i++) {
          indices.push(idx.array[i] + offset);
        }
      } else {
        for (let i = 0; i < pos.count; i++) {
          indices.push(i + offset);
        }
      }

      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
        if (uv) {
          uvs.push(uv.getX(i), uv.getY(i));
        } else {
          uvs.push(0, 0);
        }
      }
      offset += pos.count;
    }

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);

    return merged;
  }

  public update(params: Partial<LightsaberParams>): void {
    Object.assign(this.currentParams, params);
    const p = this.currentParams;

    const bladeLength = this.bladeBaseLength * p.bladeLength;
    const bladeMat = this.blade.material as THREE.MeshStandardMaterial;
    const glowMat = this.bladeGlow.material as THREE.MeshBasicMaterial;
    const color = new THREE.Color(p.bladeColor);

    bladeMat.color.copy(color);
    bladeMat.emissive.copy(color);
    bladeMat.emissiveIntensity = 2.0 * p.glowIntensity;

    glowMat.color.copy(color);
    glowMat.opacity = 0.25 * p.glowIntensity;

    this.bladeLight.color.copy(color);
    this.bladeLight.intensity = p.glowIntensity;
    this.bladeLight.position.set(0, bladeLength * 0.7 + 0.5, 0);

    const newBladeGeo = new THREE.CylinderGeometry(0.08, 0.08, bladeLength, 32, 1, true);
    newBladeGeo.translate(0, bladeLength / 2 + 0.5, 0);
    const tipGeo = new THREE.ConeGeometry(0.08, 0.2, 32);
    tipGeo.translate(0, bladeLength + 0.6, 0);
    const merged = this.mergeGeometries(newBladeGeo, tipGeo);
    this.blade.geometry.dispose();
    this.blade.geometry = merged;

    const newGlowGeo = new THREE.CylinderGeometry(0.2, 0.2, bladeLength + 0.4, 32, 1, true);
    newGlowGeo.translate(0, bladeLength / 2 + 0.55, 0);
    this.bladeGlow.geometry.dispose();
    this.bladeGlow.geometry = newGlowGeo;

    this.hiltGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive && mat.emissiveIntensity !== undefined) {
          if (child.position.y > 0.35) {
            mat.color.copy(color);
            mat.emissive.copy(color);
            mat.emissiveIntensity = 1.5 * p.glowIntensity;
          } else if (mat.color.getHex() === 0x1a1a2e) {
            mat.roughness = p.hiltRoughness;
          } else if (mat.color.getHex() === 0x2a2a3e) {
            mat.roughness = Math.max(0.1, p.hiltRoughness - 0.1);
          }
        }
      }
    });

    this.updateTipPosition();
  }

  public updateTipPosition(): void {
    const bladeLength = this.bladeBaseLength * this.currentParams.bladeLength;
    this.tipPosition.set(0, bladeLength + 0.65, 0);
    this.group.localToWorld(this.tipPosition);
  }

  public getBladeLength(): number {
    return this.bladeBaseLength * this.currentParams.bladeLength;
  }

  public getColor(): THREE.Color {
    return new THREE.Color(this.currentParams.bladeColor);
  }

  public dispose(): void {
    this.blade.geometry.dispose();
    (this.blade.material as THREE.Material).dispose();
    this.bladeGlow.geometry.dispose();
    (this.bladeGlow.material as THREE.Material).dispose();
    this.hiltGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          (child.material as THREE.Material).dispose();
        }
      }
    });
  }
}
