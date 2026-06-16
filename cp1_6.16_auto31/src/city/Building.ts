import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BuildingMetadata } from '../types';

export interface BuildingOptions {
  id: number;
  width: number;
  depth: number;
  height: number;
  position: { x: number; z: number };
}

export class Building {
  public mesh: THREE.Mesh;
  public metadata: BuildingMetadata;
  private group: THREE.Group;
  private beaconLight: THREE.PointLight;

  constructor(options: BuildingOptions) {
    this.group = new THREE.Group();
    this.metadata = this.createMetadata(options);
    this.mesh = this.createBuildingMesh();
    this.beaconLight = this.createBeaconLight();
    this.setupGroup();
  }

  private createMetadata(options: BuildingOptions): BuildingMetadata {
    const floors = Math.floor(options.height / 3);
    const windowsPerFloor = Math.floor(options.width / 2) * Math.floor(options.depth / 2);
    const windowsCount = floors * windowsPerFloor;
    const litWindows = Math.floor(windowsCount * (0.3 + Math.random() * 0.5));

    return {
      id: options.id,
      width: options.width,
      depth: options.depth,
      height: options.height,
      position: options.position,
      floors,
      windowsCount,
      litWindows,
      baseColor: this.generateBaseColor(),
    };
  }

  private generateBaseColor(): THREE.Color {
    const grayValue = 0.15 + Math.random() * 0.2;
    return new THREE.Color(grayValue, grayValue, grayValue);
  }

  private createBuildingMesh(): THREE.Mesh {
    const geometries: THREE.BufferGeometry[] = [];
    const colors: number[][] = [];

    const bodyGeo = this.createBodyGeometry();
    geometries.push(bodyGeo);
    colors.push(this.colorToArray(this.metadata.baseColor));

    const horizontalLines = this.createHorizontalLines();
    geometries.push(...horizontalLines.geometries);
    colors.push(...horizontalLines.colors);

    const topRim = this.createTopRim();
    geometries.push(topRim.geometry);
    colors.push(topRim.color);

    const verticalStripes = this.createVerticalStripes();
    if (verticalStripes) {
      geometries.push(...verticalStripes.geometries);
      colors.push(...verticalStripes.colors);
    }

    const mergedGeometry = mergeGeometries(geometries, false);

    const colorAttribute = new Float32Array(mergedGeometry.attributes.position.count * 3);
    let vertexOffset = 0;

    for (let i = 0; i < geometries.length; i++) {
      const geo = geometries[i];
      const color = colors[i];
      const vertexCount = geo.attributes.position.count;

      for (let j = 0; j < vertexCount; j++) {
        const idx = (vertexOffset + j) * 3;
        colorAttribute[idx] = color[0];
        colorAttribute[idx + 1] = color[1];
        colorAttribute[idx + 2] = color[2];
      }
      vertexOffset += vertexCount;
    }

    mergedGeometry.setAttribute('color', new THREE.BufferAttribute(colorAttribute, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.3,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(mergedGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private createBodyGeometry(): THREE.BufferGeometry {
    const { width, depth, height } = this.metadata;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  private createHorizontalLines(): { geometries: THREE.BufferGeometry[]; colors: number[][] } {
    const { width, depth, height } = this.metadata;
    const geometries: THREE.BufferGeometry[] = [];
    const colors: number[][] = [];

    const lineThickness = 0.3;
    const lineDepth = 0.05;
    let currentY = 2 + Math.random() * 2;
    const minInterval = 3;
    const maxInterval = 5;

    const lineColor = this.metadata.baseColor.clone();
    lineColor.offsetHSL(0, 0, 0.15);
    const lineColorArr = this.colorToArray(lineColor);

    while (currentY < height - 2) {
      const frontLine = new THREE.BoxGeometry(width, lineThickness, lineDepth);
      frontLine.translate(0, currentY, depth / 2 + lineDepth / 2);
      geometries.push(frontLine);
      colors.push(lineColorArr);

      const backLine = new THREE.BoxGeometry(width, lineThickness, lineDepth);
      backLine.translate(0, currentY, -depth / 2 - lineDepth / 2);
      geometries.push(backLine);
      colors.push(lineColorArr);

      const leftLine = new THREE.BoxGeometry(lineDepth, lineThickness, depth);
      leftLine.translate(-width / 2 - lineDepth / 2, currentY, 0);
      geometries.push(leftLine);
      colors.push(lineColorArr);

      const rightLine = new THREE.BoxGeometry(lineDepth, lineThickness, depth);
      rightLine.translate(width / 2 + lineDepth / 2, currentY, 0);
      geometries.push(rightLine);
      colors.push(lineColorArr);

      currentY += minInterval + Math.random() * (maxInterval - minInterval);
    }

    return { geometries, colors };
  }

  private createTopRim(): { geometry: THREE.BufferGeometry; color: number[] } {
    const { width, depth, height } = this.metadata;
    const rimHeight = 0.5;
    const rimThickness = 0.3;

    const rimColor = this.metadata.baseColor.clone();
    rimColor.offsetHSL(0, 0, 0.15);

    const outerWidth = width + rimThickness * 2;
    const outerDepth = depth + rimThickness * 2;
    const innerWidth = width;
    const innerDepth = depth;

    const shape = new THREE.Shape();
    shape.moveTo(-outerWidth / 2, -outerDepth / 2);
    shape.lineTo(outerWidth / 2, -outerDepth / 2);
    shape.lineTo(outerWidth / 2, outerDepth / 2);
    shape.lineTo(-outerWidth / 2, outerDepth / 2);
    shape.lineTo(-outerWidth / 2, -outerDepth / 2);

    const hole = new THREE.Path();
    hole.moveTo(-innerWidth / 2, -innerDepth / 2);
    hole.lineTo(innerWidth / 2, -innerDepth / 2);
    hole.lineTo(innerWidth / 2, innerDepth / 2);
    hole.lineTo(-innerWidth / 2, innerDepth / 2);
    hole.lineTo(-innerWidth / 2, -innerDepth / 2);
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: rimHeight,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, height, 0);

    return { geometry, color: this.colorToArray(rimColor) };
  }

  private createVerticalStripes(): { geometries: THREE.BufferGeometry[]; colors: number[][] } | null {
    if (Math.random() > 0.3) return null;

    const { width, depth, height } = this.metadata;
    const stripeWidth = 0.2;
    const stripeDepth = 0.05;

    const stripeColor = this.metadata.baseColor.clone();
    stripeColor.offsetHSL(0, 0, 0.25);
    const stripeColorArr = this.colorToArray(stripeColor);

    const geometries: THREE.BufferGeometry[] = [];
    const colors: number[][] = [];

    const stripeCount = 1 + Math.floor(Math.random() * 2);
    const side = Math.floor(Math.random() * 4);

    for (let i = 0; i < stripeCount; i++) {
      const offset = (i - (stripeCount - 1) / 2) * (stripeWidth * 4);

      if (side === 0 || side === 1) {
        const frontStripe = new THREE.BoxGeometry(stripeWidth, height, stripeDepth);
        frontStripe.translate(offset, height / 2, depth / 2 + stripeDepth / 2);
        geometries.push(frontStripe);
        colors.push(stripeColorArr);

        const backStripe = new THREE.BoxGeometry(stripeWidth, height, stripeDepth);
        backStripe.translate(offset, height / 2, -depth / 2 - stripeDepth / 2);
        geometries.push(backStripe);
        colors.push(stripeColorArr);
      }

      if (side === 2 || side === 3) {
        const leftStripe = new THREE.BoxGeometry(stripeDepth, height, stripeWidth);
        leftStripe.translate(-width / 2 - stripeDepth / 2, height / 2, offset);
        geometries.push(leftStripe);
        colors.push(stripeColorArr);

        const rightStripe = new THREE.BoxGeometry(stripeDepth, height, stripeWidth);
        rightStripe.translate(width / 2 + stripeDepth / 2, height / 2, offset);
        geometries.push(rightStripe);
        colors.push(stripeColorArr);
      }
    }

    return { geometries, colors };
  }

  private createBeaconLight(): THREE.PointLight {
    const { height, position } = this.metadata;
    const light = new THREE.PointLight(0xff0000, 1, 15);
    light.position.set(position.x, height, position.z);
    return light;
  }

  private setupGroup(): void {
    const { position } = this.metadata;

    this.mesh.position.set(position.x, 0, position.z);
    this.mesh.userData = {
      buildingId: this.metadata.id,
      metadata: this.metadata,
      isBuilding: true,
    };

    this.group.add(this.mesh);
    this.group.add(this.beaconLight);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getBeaconLight(): THREE.PointLight {
    return this.beaconLight;
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public getMetadata(): BuildingMetadata {
    return this.metadata;
  }

  public updateBeaconPulse(time: number): void {
    const period = 2;
    const phase = (time % period) / period;
    const intensity = 0.2 + (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) * 0.8;
    this.beaconLight.intensity = intensity;
  }

  private colorToArray(color: THREE.Color): number[] {
    return [color.r, color.g, color.b];
  }

  public dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((m) => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
    this.beaconLight.dispose();
  }
}
