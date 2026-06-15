import * as THREE from 'three';
import {
  ParticleBand,
  RippleEffect,
  NetworkNode,
  NetworkLink,
  sharedTexture
} from './particleSystem';
import { CONFIG, distance3D, createGradientTexture } from './utils';

export class StardustNetwork {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  private bands: ParticleBand[] = [];
  private ripples: RippleEffect[] = [];
  private nodes: NetworkNode[] = [];
  private links: Map<string, NetworkLink> = new Map();

  private pendingBandsGroup: THREE.Group;
  private nodesGroup: THREE.Group;
  private ripplesGroup: THREE.Group;
  private linksGroup: THREE.Group;

  private totalParticles: number = 0;
  private nodeTexture: THREE.Texture;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.nodeTexture = createGradientTexture();

    this.pendingBandsGroup = new THREE.Group();
    this.nodesGroup = new THREE.Group();
    this.ripplesGroup = new THREE.Group();
    this.linksGroup = new THREE.Group();

    this.scene.add(this.pendingBandsGroup);
    this.scene.add(this.linksGroup);
    this.scene.add(this.nodesGroup);
    this.scene.add(this.ripplesGroup);

    this.createBackgroundStars();
  }

  private createBackgroundStars(): void {
    const starCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800 - 200;

      const hue = 220 + Math.random() * 60;
      const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.8 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      map: sharedTexture,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  public screenToWorld(
    screenX: number,
    screenY: number,
    width: number,
    height: number
  ): THREE.Vector3 {
    const ndc = new THREE.Vector3(
      (screenX / width) * 2 - 1,
      -(screenY / height) * 2 + 1,
      0
    );

    const vector = ndc.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();

    const targetZ = 0;
    const distance = (targetZ - this.camera.position.z) / dir.z;
    const worldPoint = this.camera.position.clone().add(dir.multiplyScalar(distance));

    return worldPoint;
  }

  public createBand(
    start: THREE.Vector3,
    end: THREE.Vector3,
    speed: number,
    currentTime: number
  ): boolean {
    if (this.totalParticles + CONFIG.PARTICLES_PER_BAND > CONFIG.MAX_PARTICLES) {
      this.removeOldestBand();
    }

    const band = new ParticleBand(start, end, speed, sharedTexture);
    band.creationTime = currentTime;
    this.bands.push(band);
    this.pendingBandsGroup.add(band.group);
    this.totalParticles += band.particleData.length;

    this.detectCrossings(band, currentTime);

    return true;
  }

  private removeOldestBand(): void {
    if (this.bands.length === 0) return;

    const oldest = this.bands.shift()!;
    this.totalParticles -= oldest.particleData.length;
    this.pendingBandsGroup.remove(oldest.group);
    oldest.dispose();
  }

  private detectCrossings(newBand: ParticleBand, currentTime: number): void {
    const newPoints = newBand.getPathPoints();
    const newColor = newBand.getAverageWorldColor();

    for (const existingBand of this.bands) {
      if (existingBand === newBand) continue;

      const existingPoints = existingBand.getPathPoints();
      const existingColor = existingBand.getAverageWorldColor();

      let minDist = Infinity;
      let closestNew = new THREE.Vector3();
      let closestExist = new THREE.Vector3();

      for (const np of newPoints) {
        for (const ep of existingPoints) {
          const dist = distance3D(np, ep);
          if (dist < minDist) {
            minDist = dist;
            closestNew = np;
            closestExist = ep;
          }
        }
      }

      if (minDist < CONFIG.CROSS_THRESHOLD) {
        const crossPoint = new THREE.Vector3()
          .addVectors(closestNew, closestExist)
          .multiplyScalar(0.5);

        this.createNode(crossPoint, newColor, existingColor, currentTime);
        this.createRipple(crossPoint, newColor, existingColor, currentTime);
      }
    }
  }

  private createNode(
    position: THREE.Vector3,
    color1: THREE.Color,
    color2: THREE.Color,
    currentTime: number
  ): void {
    for (const node of this.nodes) {
      if (distance3D(node.position, position) < CONFIG.CROSS_THRESHOLD) {
        return;
      }
    }

    const node = new NetworkNode(position, color1, color2, currentTime, this.nodeTexture);
    this.nodes.push(node);
    this.nodesGroup.add(node.mesh);
  }

  private createRipple(
    position: THREE.Vector3,
    color1: THREE.Color,
    color2: THREE.Color,
    currentTime: number
  ): void {
    const avgColor = new THREE.Color().copy(color1).lerp(color2, 0.5);
    const ripple = new RippleEffect(position, avgColor, currentTime);
    this.ripples.push(ripple);
    this.ripplesGroup.add(ripple.mesh);
  }

  private updateLinks(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];
        const dist = distance3D(nodeA.position, nodeB.position);
        const linkId = nodeA.getLinkId(nodeB);

        if (dist < CONFIG.LINK_DISTANCE) {
          if (!this.links.has(linkId)) {
            const link = new NetworkLink(nodeA, nodeB);
            this.links.set(linkId, link);
            this.linksGroup.add(link.line);
            nodeA.links.add(linkId);
            nodeB.links.add(linkId);
          }
        } else {
          if (this.links.has(linkId)) {
            const link = this.links.get(linkId)!;
            this.linksGroup.remove(link.line);
            link.dispose();
            this.links.delete(linkId);
            nodeA.links.delete(linkId);
            nodeB.links.delete(linkId);
          }
        }
      }
    }

    for (const link of this.links.values()) {
      link.updatePositions();
    }
  }

  public update(
    elapsedTime: number,
    deltaTime: number
  ): void {
    for (let i = this.bands.length - 1; i >= 0; i--) {
      const band = this.bands[i];
      if (!band.isAlive) {
        this.bands.splice(i, 1);
        continue;
      }
      band.update(elapsedTime, deltaTime);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.update(elapsedTime);
      if (!ripple.isAlive) {
        this.ripplesGroup.remove(ripple.mesh);
        ripple.dispose();
        this.ripples.splice(i, 1);
      }
    }

    for (const node of this.nodes) {
      node.update(elapsedTime, this.camera);
    }

    this.updateLinks();
  }

  public getTotalParticles(): number {
    return this.totalParticles;
  }

  public getBandCount(): number {
    return this.bands.length;
  }

  public getNodeCount(): number {
    return this.nodes.length;
  }
}
