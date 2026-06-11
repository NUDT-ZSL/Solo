import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGrassTexture } from '../core/terrain';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private terrainMesh: THREE.Mesh | null = null;
  private treesMesh: THREE.InstancedMesh | null = null;
  private grassTexture: THREE.Texture;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private gridHelper: THREE.GridHelper;
  private container: HTMLElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.018);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(10, 8, 10);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 1, 0);
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.6;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.8;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.directionalLight.position.set(12, 16, 9);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 55;
    this.directionalLight.shadow.camera.left = -16;
    this.directionalLight.shadow.camera.right = 16;
    this.directionalLight.shadow.camera.top = 16;
    this.directionalLight.shadow.camera.bottom = -16;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d4a2d, 0.35);
    this.scene.add(hemiLight);

    this.gridHelper = new THREE.GridHelper(32, 32, 0x2a2a4e, 0x222242);
    (this.gridHelper.material as THREE.Material).opacity = 0.25;
    (this.gridHelper.material as THREE.Material).transparent = true;
    this.gridHelper.position.y = -0.02;
    this.scene.add(this.gridHelper);

    this.grassTexture = createGrassTexture();
    this.grassTexture.needsUpdate = true;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public clearTerrain(): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      const mat = this.terrainMesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.dispose();
      if (mat.bumpMap) mat.bumpMap.dispose();
      mat.dispose();
      this.terrainMesh = null;
    }
    this.clearTrees();
  }

  public clearTrees(): void {
    if (this.treesMesh) {
      this.scene.remove(this.treesMesh);
      this.treesMesh.geometry.dispose();
      const mats = this.treesMesh.material as THREE.MeshStandardMaterial[];
      mats.forEach((m) => m.dispose());
      this.treesMesh = null;
    }
  }

  public addTerrain(geometry: THREE.BufferGeometry): void {
    this.grassTexture.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.grassTexture,
      roughness: 0.92,
      metalness: 0.0,
      bumpMap: this.grassTexture,
      bumpScale: 0.035,
      color: new THREE.Color(0xffffff)
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.texMix = { value: 0.5 };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vBaseColor;
varying vec2 vUvCustom;`
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
vUvCustom = uv;`
        )
        .replace(
          '#include <color_vertex>',
          `#include <color_vertex>
vBaseColor = color;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float texMix;
varying vec3 vBaseColor;
varying vec2 vUvCustom;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUvCustom );
  vec3 mixedColor = mix(vBaseColor, texelColor.rgb, texMix);
  diffuseColor.rgb *= mixedColor;
#else
  diffuseColor.rgb *= vBaseColor;
#endif`
        );
    };

    material.needsUpdate = true;

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  public addTrees(treesMesh: THREE.InstancedMesh): void {
    this.clearTrees();
    this.treesMesh = treesMesh;
    this.scene.add(this.treesMesh);
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.clearTerrain();
    this.grassTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
