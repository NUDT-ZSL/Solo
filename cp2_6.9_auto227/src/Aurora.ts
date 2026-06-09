import * as THREE from 'three';

const AURORA_COLORS = [
  new THREE.Color(0x00FF88),
  new THREE.Color(0x4488FF),
  new THREE.Color(0xAA44FF)
];

export class Aurora {
  scene: THREE.Scene;
  group: THREE.Group;
  layers: THREE.Mesh[];
  light!: THREE.PointLight;
  time: number;
  colorSpeed: number;
  colorIndex: number;
  nextColorIndex: number;
  colorTransitionProgress: number;
  colorTransitionDuration: number;
  currentMainColor: THREE.Color;
  nextMainColor: THREE.Color;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.layers = [];
    this.time = 0;
    this.colorSpeed = 1.0;
    this.colorIndex = 0;
    this.nextColorIndex = 1;
    this.colorTransitionProgress = 0;
    this.colorTransitionDuration = 5 + Math.random() * 3;
    this.currentMainColor = AURORA_COLORS[0].clone();
    this.nextMainColor = AURORA_COLORS[1].clone();

    this.createAuroraLayers();
    this.setupLight();

    this.group.position.y = 10;
    this.scene.add(this.group);
  }

  createAuroraLayers(): void {
    const opacities = [0.4, 0.3, 0.2];
    const yOffsets = [0, 0.5, 1.0];
    const amplitudes = [1.0, 0.7, 0.5];

    for (let i = 0; i < 3; i++) {
      const geometry = this.createWaveGeometry(amplitudes[i]);
      const material = new THREE.MeshBasicMaterial({
        color: this.getGradientColor(i),
        transparent: true,
        opacity: opacities[i],
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = yOffsets[i];
      this.layers.push(mesh);
      this.group.add(mesh);
    }
  }

  createWaveGeometry(amplitude: number): THREE.BufferGeometry {
    const width = 30;
    const height = 6;
    const widthSegments = 100;
    const heightSegments = 10;

    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 0.3) * amplitude + Math.sin(y * 0.5) * amplitude * 0.3;
      positions.setZ(i, z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  getGradientColor(layerIndex: number): THREE.Color {
    const t = layerIndex / 2;
    const color = new THREE.Color().lerpColors(
      AURORA_COLORS[0],
      AURORA_COLORS[1],
      t
    );
    return color;
  }

  setupLight(): void {
    this.light = new THREE.PointLight(0x00FF88, 2, 50);
    this.light.position.set(0, 8, 0);
    this.group.add(this.light);
  }

  setColorSpeed(speed: number): void {
    this.colorSpeed = speed;
  }

  update(delta: number): THREE.Color {
    this.time += delta * this.colorSpeed;

    this.colorTransitionProgress += delta * this.colorSpeed / this.colorTransitionDuration;
    if (this.colorTransitionProgress >= 1) {
      this.colorTransitionProgress = 0;
      this.colorIndex = this.nextColorIndex;
      this.nextColorIndex = (this.nextColorIndex + 1) % AURORA_COLORS.length;
      this.colorTransitionDuration = 5 + Math.random() * 3;
      this.currentMainColor = AURORA_COLORS[this.colorIndex].clone();
      this.nextMainColor = AURORA_COLORS[this.nextColorIndex].clone();
    }

    const currentColor = this.getInterpolatedColor();

    this.layers.forEach((layer, i) => {
      const positions = layer.geometry.attributes.position;
      const speed = 0.5 + i * 0.2;
      const phase = i * 0.7;

      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j);
        const y = positions.getY(j);
        const z =
          Math.sin(x * 0.3 + this.time * speed + phase) * (1.0 - i * 0.2) +
          Math.sin(y * 0.5 + this.time * speed * 0.7) * (0.5 - i * 0.1) +
          Math.sin((x + y) * 0.2 + this.time * speed * 1.3) * 0.3;
        positions.setZ(j, z);
      }
      positions.needsUpdate = true;
      layer.geometry.computeVertexNormals();

      const material = layer.material as THREE.MeshBasicMaterial;
      const layerColor = currentColor.clone().multiplyScalar(1 - i * 0.15);
      material.color.lerpColors(layerColor, AURORA_COLORS[(this.colorIndex + 1) % AURORA_COLORS.length].clone(), 0.1);
      material.opacity = 0.4 - i * 0.1 + Math.sin(this.time * 0.5 + i) * 0.05;
    });

    this.light.color.copy(currentColor);
    this.light.intensity = 1.5 + Math.sin(this.time * 0.8) * 0.5;
    this.light.position.x = Math.sin(this.time * 0.3) * 5;
    this.light.position.z = Math.cos(this.time * 0.2) * 5;

    return currentColor;
  }

  getInterpolatedColor(): THREE.Color {
    const t = this.colorTransitionProgress;
    const smoothT = t * t * (3 - 2 * t);
    return this.currentMainColor.clone().lerp(this.nextMainColor, smoothT);
  }

  getCurrentColor(): THREE.Color {
    return this.getInterpolatedColor();
  }

  reset(): void {
    this.time = 0;
    this.colorIndex = 0;
    this.nextColorIndex = 1;
    this.colorTransitionProgress = 0;
    this.currentMainColor = AURORA_COLORS[0].clone();
    this.nextMainColor = AURORA_COLORS[1].clone();
  }
}
