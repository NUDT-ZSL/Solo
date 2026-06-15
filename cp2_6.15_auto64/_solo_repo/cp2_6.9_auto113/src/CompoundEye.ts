import * as THREE from 'three';

export interface OmmatidiumData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  baseOpacity: number;
  baseColor: THREE.Color;
}

export interface EyeDetectionResult {
  detectedCount: number;
  nearestDistance: number;
  averageColor: THREE.Color;
}

export class CompoundEye {
  public group: THREE.Group;
  private ommatidia: OmmatidiumData[] = [];
  private raycaster: THREE.Raycaster;
  private _count: number;
  private _curvature: number;
  private _sensitivity: number;
  private sphereGeometry: THREE.SphereGeometry;
  private colorCenter: THREE.Color;
  private colorEdge: THREE.Color;

  constructor(count: number = 200, curvature: number = 0.6, sensitivity: number = 1.0) {
    this._count = count;
    this._curvature = curvature;
    this._sensitivity = sensitivity;
    this.group = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 20;
    this.sphereGeometry = new THREE.SphereGeometry(0.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    this.colorCenter = new THREE.Color(0xFFD700);
    this.colorEdge = new THREE.Color(0xFF8C00);
    this.generateOmmatidia();
  }

  get count(): number {
    return this._count;
  }

  set count(value: number) {
    this._count = Math.max(50, Math.min(500, Math.floor(value)));
    this.regenerate();
  }

  get curvature(): number {
    return this._curvature;
  }

  set curvature(value: number) {
    this._curvature = Math.max(0.2, Math.min(1.0, value));
    this.updatePositions();
  }

  get sensitivity(): number {
    return this._sensitivity;
  }

  set sensitivity(value: number) {
    this._sensitivity = Math.max(0.1, Math.min(2.0, value));
    this.updateAppearance();
  }

  private generateHexPointsOnSphere(n: number, curvature: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    const radius = 1.0;

    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * (1 - curvature * 0.5);
      const radiusAtY = Math.sqrt(1 - y * y) * curvature;
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      points.push(new THREE.Vector3(x, y * 0.3 + 0.1, z).normalize().multiplyScalar(radius));
    }

    return points;
  }

  private generateOmmatidia(): void {
    this.clearOmmatidia();
    const positions = this.generateHexPointsOnSphere(this._count, this._curvature);

    positions.forEach((pos, index) => {
      const t = pos.length() / 1.0;
      const color = this.colorCenter.clone().lerp(this.colorEdge, t * 0.8);
      const baseOpacity = 0.7;

      const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: baseOpacity,
        shininess: 100,
        specular: 0x444444,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(this.sphereGeometry, material);
      mesh.position.copy(pos);
      mesh.lookAt(pos.clone().multiplyScalar(2));

      const data: OmmatidiumData = {
        mesh,
        direction: pos.clone().normalize(),
        baseOpacity,
        baseColor: color.clone()
      };

      this.ommatidia.push(data);
      this.group.add(mesh);
    });

    this.updateAppearance();
  }

  private clearOmmatidia(): void {
    this.ommatidia.forEach(data => {
      this.group.remove(data.mesh);
      (data.mesh.material as THREE.Material).dispose();
    });
    this.ommatidia = [];
  }

  private updatePositions(): void {
    const positions = this.generateHexPointsOnSphere(this._count, this._curvature);
    const minLen = Math.min(positions.length, this.ommatidia.length);

    for (let i = 0; i < minLen; i++) {
      const pos = positions[i];
      this.ommatidia[i].mesh.position.copy(pos);
      this.ommatidia[i].mesh.lookAt(pos.clone().multiplyScalar(2));
      this.ommatidia[i].direction.copy(pos).normalize();

      const t = pos.length() / 1.0;
      const color = this.colorCenter.clone().lerp(this.colorEdge, t * 0.8);
      this.ommatidia[i].baseColor.copy(color);
    }

    this.updateAppearance();
  }

  private updateAppearance(): void {
    const opacityFactor = 1 - (this._sensitivity - 0.1) / 1.9 * 0.75;
    const saturationFactor = 0.5 + this._sensitivity * 0.75;

    this.ommatidia.forEach(data => {
      const material = data.mesh.material as THREE.MeshPhongMaterial;
      material.opacity = Math.max(0.2, Math.min(0.8, data.baseOpacity * opacityFactor));

      const hsl = { h: 0, s: 0, l: 0 };
      data.baseColor.getHSL(hsl);
      hsl.s = Math.min(1, hsl.s * saturationFactor);
      material.color.setHSL(hsl.h, hsl.s, hsl.l);
    });
  }

  public regenerate(): void {
    this.generateOmmatidia();
  }

  public detectObjects(sceneObjects: THREE.Object3D[]): EyeDetectionResult {
    let detectedCount = 0;
    let nearestDistance = Infinity;
    let totalColor = new THREE.Color(0, 0, 0);
    let colorSamples = 0;

    const sampleRate = Math.max(1, Math.floor(this.ommatidia.length / 50));
    const eyeWorldPos = new THREE.Vector3();
    this.group.getWorldPosition(eyeWorldPos);

    for (let i = 0; i < this.ommatidia.length; i += sampleRate) {
      const data = this.ommatidia[i];
      const worldDir = data.direction.clone().applyQuaternion(this.group.quaternion);

      this.raycaster.set(eyeWorldPos, worldDir);
      const intersects = this.raycaster.intersectObjects(sceneObjects, true);

      if (intersects.length > 0) {
        detectedCount++;
        const distance = intersects[0].distance;
        nearestDistance = Math.min(nearestDistance, distance);

        const obj = intersects[0].object as THREE.Mesh;
        if (obj.material) {
          let matColor: THREE.Color | undefined;
          if (Array.isArray(obj.material)) {
            const mat = obj.material[0] as THREE.MeshPhongMaterial;
            if (mat.color) matColor = mat.color;
          } else {
            const mat = obj.material as THREE.MeshPhongMaterial;
            if (mat.color) matColor = mat.color;
          }
          if (matColor) {
            totalColor.add(matColor);
            colorSamples++;
          }
        }
      }
    }

    const avgColor = colorSamples > 0 ? totalColor.multiplyScalar(1 / colorSamples) : new THREE.Color(0x333333);

    return {
      detectedCount,
      nearestDistance: nearestDistance === Infinity ? -1 : nearestDistance,
      averageColor: avgColor
    };
  }

  public update(delta: number): void {
    this.ommatidia.forEach((data, i) => {
      const pulse = Math.sin(performance.now() * 0.002 + i * 0.1) * 0.02;
      const scale = 1 + pulse;
      data.mesh.scale.set(scale, scale, scale);
    });
  }

  public dispose(): void {
    this.clearOmmatidia();
    this.sphereGeometry.dispose();
  }
}
