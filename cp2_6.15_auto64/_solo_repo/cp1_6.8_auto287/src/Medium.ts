import * as THREE from 'three';

export type MediumType = 'sphere' | 'cube' | 'prism';

const MEDIUM_DEFAULTS: Record<MediumType, { refractionIndex: number; color: THREE.ColorRepresentation; position: THREE.Vector3 }> = {
  sphere: { refractionIndex: 1.52, color: 0x88ccff, position: new THREE.Vector3(-3, 0, 0) },
  cube: { refractionIndex: 1.33, color: 0x44aaff, position: new THREE.Vector3(0, 0, 0) },
  prism: { refractionIndex: 1.65, color: 0xaaddff, position: new THREE.Vector3(3, 0, 0) },
};

function createGlowMaterial(color: THREE.ColorRepresentation, opacity: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.9,
    thickness: 1.5,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function createInnerGlow(color: THREE.Color, scale: number): THREE.PointLight {
  const light = new THREE.PointLight(color, 0.8, scale * 3);
  light.decay = 2;
  return light;
}

function createGlowSprite(color: THREE.Color, scale: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.4)`);
  gradient.addColorStop(0.5, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.1)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.setScalar(scale * 2.5);
  return sprite;
}

export class Medium {
  type: MediumType;
  mesh: THREE.Mesh;
  refractionIndex: number;
  color: THREE.Color;
  innerLight: THREE.PointLight;
  glowSprite: THREE.Sprite;
  group: THREE.Group;
  selected: boolean = false;
  private targetRefractionIndex: number;
  private targetColor: THREE.Color;
  private lerpSpeed: number = 0.05;
  private outlineMesh: THREE.LineSegments | null = null;
  private boundSphere: THREE.Sphere;

  constructor(type: MediumType, scene: THREE.Scene) {
    this.type = type;
    const defaults = MEDIUM_DEFAULTS[type];
    this.refractionIndex = defaults.refractionIndex;
    this.targetRefractionIndex = this.refractionIndex;
    this.color = new THREE.Color(defaults.color);
    this.targetColor = this.color.clone();
    this.group = new THREE.Group();
    this.boundSphere = new THREE.Sphere();

    let geometry: THREE.BufferGeometry;
    const scale = 1.5;

    switch (type) {
      case 'sphere': {
        geometry = new THREE.SphereGeometry(scale * 0.8, 64, 64);
        this.boundSphere = new THREE.Sphere(defaults.position.clone(), scale * 0.8);
        break;
      }
      case 'cube': {
        geometry = new THREE.BoxGeometry(scale, scale, scale);
        const halfExt = scale * 0.5;
        this.boundSphere = new THREE.Sphere(defaults.position.clone(), halfExt * Math.sqrt(3));
        break;
      }
      case 'prism': {
        geometry = this.createPrismGeometry(scale);
        this.boundSphere = new THREE.Sphere(defaults.position.clone(), scale);
        break;
      }
    }

    const material = createGlowMaterial(defaults.color, 0.35);
    this.mesh = new THREE.Mesh(geometry, material);
    this.group.add(this.mesh);

    this.innerLight = createInnerGlow(new THREE.Color(defaults.color), scale);
    this.group.add(this.innerLight);

    this.glowSprite = createGlowSprite(new THREE.Color(defaults.color), scale);
    this.group.add(this.glowSprite);

    this.group.position.copy(defaults.position);
    scene.add(this.group);

    this.addOutline(geometry);
  }

  private createPrismGeometry(scale: number): THREE.BufferGeometry {
    const h = scale * 0.8;
    const r = scale * 0.7;
    const shape = new THREE.Shape();
    const vertices = 3;
    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const extrudeSettings = { depth: h, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }

  private addOutline(geometry: THREE.BufferGeometry): void {
    const edges = new THREE.EdgesGeometry(geometry, 15);
    const lineMat = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.3,
    });
    this.outlineMesh = new THREE.LineSegments(edges, lineMat);
    this.group.add(this.outlineMesh);
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
  }

  setRefractionIndex(value: number): void {
    this.targetRefractionIndex = value;
  }

  setColor(hex: THREE.ColorRepresentation): void {
    this.targetColor = new THREE.Color(hex);
  }

  getBoundingSphere(): THREE.Sphere {
    const worldPos = new THREE.Vector3();
    this.group.getWorldPosition(worldPos);
    this.boundSphere.center.copy(worldPos);
    return this.boundSphere;
  }

  intersectRay(ray: THREE.Ray): THREE.Vector3 | null {
    const sphere = this.getBoundingSphere();
    const target = new THREE.Vector3();
    if (ray.intersectSphere(sphere, target)) {
      return target;
    }
    return null;
  }

  computeRefraction(
    incidentDir: THREE.Vector3,
    hitPoint: THREE.Vector3,
    dispersionStrength: number
  ): { refractedDirs: THREE.Vector3[]; colors: THREE.Color[] } {
    const normal = hitPoint.clone().sub(this.group.position).normalize();
    const n1 = 1.0;
    const n2 = this.refractionIndex;
    const eta = n1 / n2;

    const cosI = -incidentDir.dot(normal);
    const sinT2 = eta * eta * (1.0 - cosI * cosI);

    const refracted = new THREE.Vector3();
    if (sinT2 <= 1.0) {
      refracted.copy(incidentDir).multiplyScalar(eta);
      refracted.add(normal.clone().multiplyScalar(eta * cosI - Math.sqrt(1.0 - sinT2)));
      refracted.normalize();
    } else {
      refracted.copy(incidentDir).reflect(normal).normalize();
    }

    const spectrumColors = [
      new THREE.Color(0xff0000),
      new THREE.Color(0xff7700),
      new THREE.Color(0xffff00),
      new THREE.Color(0x00ff00),
      new THREE.Color(0x0088ff),
      new THREE.Color(0x4400ff),
      new THREE.Color(0x8800ff),
    ];

    const refractedDirs: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];

    if (dispersionStrength > 0.01) {
      const tangent = new THREE.Vector3();
      if (Math.abs(normal.y) < 0.99) {
        tangent.crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
      }
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

      for (let i = 0; i < spectrumColors.length; i++) {
        const t = (i / (spectrumColors.length - 1)) - 0.5;
        const nVariation = n2 + t * dispersionStrength * 0.3;
        const etaVar = n1 / nVariation;
        const sinT2Var = etaVar * etaVar * (1.0 - cosI * cosI);

        const dir = new THREE.Vector3();
        if (sinT2Var <= 1.0) {
          dir.copy(incidentDir).multiplyScalar(etaVar);
          dir.add(normal.clone().multiplyScalar(etaVar * cosI - Math.sqrt(1.0 - sinT2Var)));
        } else {
          dir.copy(refracted);
        }

        const spreadAngle = t * dispersionStrength * 0.15;
        dir.add(tangent.clone().multiplyScalar(spreadAngle));
        dir.add(bitangent.clone().multiplyScalar(spreadAngle * 0.3));
        dir.normalize();

        refractedDirs.push(dir);
        colors.push(spectrumColors[i]);
      }
    } else {
      refractedDirs.push(refracted.clone());
      colors.push(new THREE.Color(0xffffff));
    }

    return { refractedDirs, colors };
  }

  update(deltaTime: number): void {
    this.refractionIndex += (this.targetRefractionIndex - this.refractionIndex) * this.lerpSpeed;
    this.color.lerp(this.targetColor, this.lerpSpeed);

    const mat = this.mesh.material as THREE.MeshPhysicalMaterial;
    mat.color.copy(this.color);
    mat.ior = this.refractionIndex;

    this.innerLight.color.copy(this.color);
    (this.glowSprite.material as THREE.SpriteMaterial).color.copy(this.color);

    if (this.outlineMesh) {
      (this.outlineMesh.material as THREE.LineBasicMaterial).color.copy(this.color);
      (this.outlineMesh.material as THREE.LineBasicMaterial).opacity = this.selected ? 0.8 : 0.3;
    }

    const pulse = 1.0 + Math.sin(Date.now() * 0.002) * 0.02;
    this.innerLight.intensity = this.selected ? 1.5 * pulse : 0.8 * pulse;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    if (this.outlineMesh) {
      this.outlineMesh.geometry.dispose();
      (this.outlineMesh.material as THREE.Material).dispose();
    }
    this.innerLight.dispose();
    (this.glowSprite.material as THREE.SpriteMaterial).map?.dispose();
    (this.glowSprite.material as THREE.Material).dispose();
  }
}
