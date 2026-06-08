import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Artwork } from "./types";

const CORRIDOR_RADIUS = 15;
const CORRIDOR_HEIGHT = 6;
const WALL_THICKNESS = 0.3;
const FRAME_WIDTH = 2.4;
const FRAME_HEIGHT = 1.8;
const FRAME_BORDER = 0.12;
const ARTWORKS_PER_WALL = 12;
const MAX_ARTWORKS = 50;

interface ArtworkMeshData {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotation: number;
  imageUrl: string;
}

export class GalleryEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private artworkMeshes: ArtworkMeshData[] = [];
  private textureLoader: THREE.TextureLoader;
  private animationId: number = 0;
  private container: HTMLElement;
  private onArtworkClick: ((artwork: ArtworkMeshData) => void) | null = null;
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1f2e);
    this.scene.fog = new THREE.Fog(0x1a1f2e, 20, 50);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 2.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.65;
    this.controls.minPolarAngle = Math.PI * 0.25;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 12;
    this.controls.target.set(0, 2.5, 0);
    this.controls.enablePan = false;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.textureLoader = new THREE.TextureLoader();

    this.setupLighting();
    this.buildCorridor();
    this.addFloorDetails();

    this.renderer.domElement.addEventListener("click", this.handleClick);
    window.addEventListener("resize", this.handleResize);

    this.animate();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x1a1f2e, 0.5);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x2a3050, 0x0a0e18, 0.4);
    this.scene.add(hemi);

    const centerLight = new THREE.PointLight(0x4a7fff, 0.6, 30);
    centerLight.position.set(0, 5, 0);
    this.scene.add(centerLight);
  }

  private buildCorridor() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x242a3d,
      roughness: 0.9,
      metalness: 0.05,
    });

    const segments = 64;
    const outerRadius = CORRIDOR_RADIUS + WALL_THICKNESS;
    const shape = new THREE.Shape();
    shape.moveTo(CORRIDOR_RADIUS - 1, 0);
    shape.lineTo(outerRadius, 0);
    shape.lineTo(outerRadius, CORRIDOR_HEIGHT);
    shape.lineTo(CORRIDOR_RADIUS - 1, CORRIDOR_HEIGHT);
    shape.lineTo(CORRIDOR_RADIUS - 1, 0);

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;

      const outerWallGeo = new THREE.PlaneGeometry(
        (2 * Math.PI * CORRIDOR_RADIUS) / segments,
        CORRIDOR_HEIGHT
      );
      const outerWall = new THREE.Mesh(outerWallGeo, wallMat.clone());
      const midAngle = (angle + nextAngle) / 2;
      outerWall.position.set(
        Math.sin(midAngle) * (CORRIDOR_RADIUS + 0.01),
        CORRIDOR_HEIGHT / 2,
        Math.cos(midAngle) * (CORRIDOR_RADIUS + 0.01)
      );
      outerWall.rotation.y = -midAngle + Math.PI;
      this.scene.add(outerWall);

      const innerWallGeo = new THREE.PlaneGeometry(
        (2 * Math.PI * (CORRIDOR_RADIUS - 2)) / segments,
        CORRIDOR_HEIGHT
      );
      const innerWall = new THREE.Mesh(innerWallGeo, wallMat.clone());
      innerWall.position.set(
        Math.sin(midAngle) * (CORRIDOR_RADIUS - 2.01),
        CORRIDOR_HEIGHT / 2,
        Math.cos(midAngle) * (CORRIDOR_RADIUS - 2.01)
      );
      innerWall.rotation.y = -midAngle;
      this.scene.add(innerWall);
    }

    const floorGeo = new THREE.RingGeometry(CORRIDOR_RADIUS - 2, CORRIDOR_RADIUS, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2436,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    this.scene.add(floor);

    const ceilingGeo = new THREE.RingGeometry(CORRIDOR_RADIUS - 2, CORRIDOR_RADIUS, 64);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x1e2436,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CORRIDOR_HEIGHT;
    this.scene.add(ceiling);
  }

  private addFloorDetails() {
    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, CORRIDOR_HEIGHT, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x3a4158,
      roughness: 0.6,
      metalness: 0.3,
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(
        Math.sin(angle) * (CORRIDOR_RADIUS - 1),
        CORRIDOR_HEIGHT / 2,
        Math.cos(angle) * (CORRIDOR_RADIUS - 1)
      );
      this.scene.add(pillar);
    }

    const baseGeo = new THREE.BoxGeometry(0.6, 0.08, 0.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3a4158,
      roughness: 0.7,
      metalness: 0.2,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(
        Math.sin(angle) * (CORRIDOR_RADIUS - 1),
        0.04,
        Math.cos(angle) * (CORRIDOR_RADIUS - 1)
      );
      this.scene.add(base);
    }
  }

  addArtwork(artwork: Artwork) {
    if (this.artworkMeshes.length >= MAX_ARTWORKS) return;
    if (this.artworkMeshes.find((a) => a.id === artwork.id)) return;

    const index = this.artworkMeshes.length;
    const isOuterWall = index % 2 === 0;
    const wallIndex = Math.floor(index / 2);
    const slotAngle =
      (wallIndex / ARTWORKS_PER_WALL) * Math.PI * 2 +
      (Math.PI * 2) / (ARTWORKS_PER_WALL * 2);
    const wallRadius = isOuterWall
      ? CORRIDOR_RADIUS + 0.05
      : CORRIDOR_RADIUS - 2.05;

    const group = new THREE.Group();

    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x4a7fff,
      emissiveIntensity: 0.15,
    });

    const outerFrame = new THREE.PlaneGeometry(
      FRAME_WIDTH + FRAME_BORDER * 2,
      FRAME_HEIGHT + FRAME_BORDER * 2
    );
    const frameMesh = new THREE.Mesh(outerFrame, borderMat);
    group.add(frameMesh);

    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e18,
      roughness: 1,
      metalness: 0,
    });
    const innerBg = new THREE.PlaneGeometry(FRAME_WIDTH, FRAME_HEIGHT);
    const innerMesh = new THREE.Mesh(innerBg, innerMat);
    innerMesh.position.z = 0.005;
    group.add(innerMesh);

    this.textureLoader.load(
      artwork.image_url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const aspect = texture.image
          ? texture.image.width / texture.image.height
          : 1;
        let pw = FRAME_WIDTH * 0.92;
        let ph = FRAME_HEIGHT * 0.92;
        if (aspect > pw / ph) {
          ph = pw / aspect;
        } else {
          pw = ph * aspect;
        }
        const picMat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.5,
          metalness: 0.05,
        });
        const picGeo = new THREE.PlaneGeometry(pw, ph);
        const picMesh = new THREE.Mesh(picGeo, picMat);
        picMesh.position.z = 0.01;
        picMesh.userData = { artworkId: artwork.id };
        group.add(picMesh);
      },
      undefined,
      () => {
        const placeholderMat = new THREE.MeshStandardMaterial({
          color: 0x2a3050,
          roughness: 0.9,
        });
        const placeholderGeo = new THREE.PlaneGeometry(
          FRAME_WIDTH * 0.92,
          FRAME_HEIGHT * 0.92
        );
        const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
        placeholder.position.z = 0.01;
        placeholder.userData = { artworkId: artwork.id };
        group.add(placeholder);
      }
    );

    const yPos = CORRIDOR_HEIGHT * 0.55;
    const faceAngle = isOuterWall ? slotAngle + Math.PI : slotAngle;

    group.position.set(
      Math.sin(slotAngle) * wallRadius,
      yPos,
      Math.cos(slotAngle) * wallRadius
    );
    group.rotation.y = -faceAngle + Math.PI;

    this.scene.add(group);

    const spotLight = new THREE.SpotLight(0xffffff, 1.5, 5, Math.PI / 6, 0.5);
    spotLight.position.set(
      Math.sin(slotAngle) * (wallRadius + (isOuterWall ? -0.5 : 0.5)),
      CORRIDOR_HEIGHT - 0.3,
      Math.cos(slotAngle) * (wallRadius + (isOuterWall ? -0.5 : 0.5))
    );
    spotLight.target = group;
    this.scene.add(spotLight);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4a7fff,
      transparent: true,
      opacity: 0.08,
    });
    const glowGeo = new THREE.PlaneGeometry(
      FRAME_WIDTH + 0.4,
      FRAME_HEIGHT + 0.4
    );
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.02;
    group.add(glow);

    const meshData: ArtworkMeshData = {
      id: artwork.id,
      mesh: group,
      position: group.position.clone(),
      rotation: group.rotation.y,
      imageUrl: artwork.image_url,
    };
    this.artworkMeshes.push(meshData);
  }

  removeArtwork(id: string) {
    const index = this.artworkMeshes.findIndex((a) => a.id === id);
    if (index === -1) return;
    const data = this.artworkMeshes[index];
    this.scene.remove(data.mesh);
    data.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.artworkMeshes.splice(index, 1);
  }

  private handleClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.artworkMeshes.forEach((data) => {
      data.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.artworkId) {
          meshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const artworkId = hit.userData.artworkId;
      if (artworkId && this.onArtworkClick) {
        const data = this.artworkMeshes.find((a) => a.id === artworkId);
        if (data) this.onArtworkClick(data);
      }
    }
  };

  setOnArtworkClick(callback: (artwork: ArtworkMeshData) => void) {
    this.onArtworkClick = callback;
  }

  private handleResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();

    const elapsed = this.clock.getElapsedTime();
    this.artworkMeshes.forEach((data) => {
      data.mesh.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshBasicMaterial &&
          child.material.opacity < 0.2
        ) {
          child.material.opacity = 0.06 + Math.sin(elapsed * 1.5) * 0.03;
        }
      });
    });

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.renderer.domElement.removeEventListener("click", this.handleClick);
    window.removeEventListener("resize", this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement
      );
    }
    this.artworkMeshes = [];
  }
}
