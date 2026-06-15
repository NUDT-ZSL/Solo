import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingData, colorTempToRGB } from './DataGenerator';

const INITIAL_POLAR = Math.PI / 4;
const INITIAL_AZI = 0;
const INITIAL_DISTANCE = 30;
const TARGET = new THREE.Vector3(10, 0, 10);
const LERP_SPEED = 0.08;
const MAX_POINT_LIGHTS = 8;

interface BuildingEntry {
  mesh: THREE.Mesh;
  data: BuildingData;
}

export class SkylineRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private buildings: BuildingEntry[] = [];
  private sampleLights: THREE.PointLight[] = [];
  private ground: THREE.LineSegments | null = null;
  private intensityScale = 1;
  private colorTempOffset = 0;
  private isResetting = false;
  private resetTarget = new THREE.Vector3();
  private resetPosition = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.target.copy(TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.camera.position.set(
      TARGET.x + INITIAL_DISTANCE * Math.sin(INITIAL_AZI) * Math.sin(INITIAL_POLAR),
      TARGET.y + INITIAL_DISTANCE * Math.cos(INITIAL_POLAR),
      TARGET.z + INITIAL_DISTANCE * Math.cos(INITIAL_AZI) * Math.sin(INITIAL_POLAR)
    );
    this.controls.update();
  }

  render(data: BuildingData[]): void {
    this.clearBuildings();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);

    const sorted = [...data].sort((a, b) => b.intensity - a.intensity);
    const sampled = sorted.slice(0, MAX_POINT_LIGHTS);

    for (const b of data) {
      const [cr, cg, cb] = colorTempToRGB(b.colorTemp + this.colorTempOffset);
      const emissiveIntensity = (b.intensity / 100) * this.intensityScale;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cr * 0.3, cg * 0.3, cb * 0.3),
        emissive: new THREE.Color(cr, cg, cb),
        emissiveIntensity: emissiveIntensity,
        roughness: 0.7,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(b.x, 0, b.z);
      mesh.scale.set(1, b.height, 1);
      mesh.userData = { buildingData: b };
      this.scene.add(mesh);
      this.buildings.push({ mesh, data: b });
    }

    for (const b of sampled) {
      const [cr, cg, cb] = colorTempToRGB(b.colorTemp + this.colorTempOffset);
      const lightRange = 5 + (b.intensity / 100) * 7;
      const emissiveIntensity = (b.intensity / 100) * this.intensityScale;
      const light = new THREE.PointLight(
        new THREE.Color(cr, cg, cb),
        emissiveIntensity * 3,
        lightRange
      );
      light.position.set(b.x, b.height + 0.5, b.z);
      this.scene.add(light);
      this.sampleLights.push(light);
    }

    this.createGround(data);
  }

  private createGround(data: BuildingData[]): void {
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      (this.ground.material as THREE.Material).dispose();
    }
    const maxX = data.length > 0 ? Math.max(...data.map(d => d.x)) : 19;
    const maxZ = data.length > 0 ? Math.max(...data.map(d => d.z)) : 19;
    const positions: number[] = [];
    for (let x = -0.5; x <= maxX + 0.5; x += 1) {
      positions.push(x, 0, -0.5, x, 0, maxZ + 0.5);
    }
    for (let z = -0.5; z <= maxZ + 0.5; z += 1) {
      positions.push(-0.5, 0, z, maxX + 0.5, 0, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.3 });
    this.ground = new THREE.LineSegments(geo, mat);
    this.scene.add(this.ground);
  }

  private clearBuildings(): void {
    for (const b of this.buildings) {
      this.scene.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
    }
    this.buildings = [];
    for (const l of this.sampleLights) {
      this.scene.remove(l);
      l.dispose();
    }
    this.sampleLights = [];
  }

  updateIntensityScale(scale: number): void {
    this.intensityScale = scale;
    for (const b of this.buildings) {
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (b.data.intensity / 100) * scale;
    }
    for (let i = 0; i < this.sampleLights.length; i++) {
      const bData = this.buildings.find(b => {
        const d = b.data;
        return d.x === Math.round(this.sampleLights[i].position.x)
          && d.z === Math.round(this.sampleLights[i].position.z);
      });
      if (bData) {
        this.sampleLights[i].intensity = (bData.data.intensity / 100) * scale * 3;
      }
    }
  }

  updateColorTempOffset(offset: number): void {
    this.colorTempOffset = offset;
    for (const b of this.buildings) {
      const [cr, cg, cb] = colorTempToRGB(b.data.colorTemp + offset);
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setRGB(cr * 0.3, cg * 0.3, cb * 0.3);
      mat.emissive.setRGB(cr, cg, cb);
    }
    for (let i = 0; i < this.sampleLights.length; i++) {
      const pos = this.sampleLights[i].position;
      const bData = this.buildings.find(b => {
        return b.data.x === Math.round(pos.x) && b.data.z === Math.round(pos.z);
      });
      if (bData) {
        const [cr, cg, cb] = colorTempToRGB(bData.data.colorTemp + offset);
        this.sampleLights[i].color.setRGB(cr, cg, cb);
      }
    }
  }

  resetCamera(): void {
    this.isResetting = true;
    const spherical = new THREE.Spherical(INITIAL_DISTANCE, INITIAL_POLAR, INITIAL_AZI);
    this.resetTarget.copy(TARGET);
    this.resetPosition.set(
      TARGET.x + INITIAL_DISTANCE * Math.sin(spherical.theta) * Math.sin(spherical.phi),
      TARGET.y + INITIAL_DISTANCE * Math.cos(spherical.phi),
      TARGET.z + INITIAL_DISTANCE * Math.cos(spherical.theta) * Math.sin(spherical.phi)
    );
  }

  update(): void {
    if (this.isResetting) {
      this.camera.position.lerp(this.resetPosition, LERP_SPEED);
      this.controls.target.lerp(this.resetTarget, LERP_SPEED);
      if (this.camera.position.distanceTo(this.resetPosition) < 0.05) {
        this.camera.position.copy(this.resetPosition);
        this.controls.target.copy(this.resetTarget);
        this.isResetting = false;
      }
    }
    this.controls.update();
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  getCameraCenter(): { x: number; z: number } {
    return { x: this.controls.target.x, z: this.controls.target.z };
  }

  getAverageIntensity(): number {
    if (this.buildings.length === 0) return 0;
    const sum = this.buildings.reduce((s, b) => s + b.data.intensity * this.intensityScale, 0);
    return Math.round((sum / this.buildings.length) * 10) / 10;
  }

  getPolygonCount(): number {
    let count = 0;
    for (const b of this.buildings) {
      const geo = b.mesh.geometry;
      count += geo.index ? geo.index.count / 3 : (geo.getAttribute('position').count / 3);
    }
    return count;
  }

  getBuildingMeshes(): THREE.Mesh[] {
    return this.buildings.map(b => b.mesh);
  }

  raycastBuilding(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): BuildingData | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const meshes = this.getBuildingMeshes();
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const ud = intersects[0].object.userData;
      if (ud && ud.buildingData) return ud.buildingData;
    }
    return null;
  }
}
