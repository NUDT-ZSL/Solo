import * as THREE from 'three';
import { SensorData, SensorDataSimulator, ClimateMode } from './sensorDataSimulator';

interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  temperature: number;
  humidity: number;
  birthTime: number;
  lifetime: number;
  active: boolean;
  trail: THREE.Vector3[];
}

export interface ParticleSystemOptions {
  maxParticles?: number;
  minParticles?: number;
  particleLifetime?: number;
  trailLength?: number;
  container?: HTMLElement;
}

export interface ParticleInfo {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  temperature: number;
  humidity: number;
  age: number;
  lifetime: number;
}

const COLD_COLOR = new THREE.Color(0x3d8bff);
const MID_COLOR = new THREE.Color(0x7affd4);
const HOT_COLOR = new THREE.Color(0xff5a3d);

export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: THREE.OrbitControls | null = null;
  private particles: Particle[] = [];
  private maxParticles: number;
  private minParticles: number;
  private particleLifetime: number;
  private trailLength: number;
  
  private points: THREE.Points | null = null;
  private trailPoints: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private trailMaterial: THREE.PointsMaterial | null = null;
  
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private alphas: Float32Array | null = null;
  
  private trailPositions: Float32Array | null = null;
  private trailColors: Float32Array | null = null;
  private trailAlphas: Float32Array | null = null;
  
  private simulator: SensorDataSimulator;
  private unsubSimulator: (() => void) | null = null;
  
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private particleInfoCallback: ((info: ParticleInfo | null, x?: number, y?: number) => void) | null = null;
  
  private minSize: number = 0.08;
  private maxSize: number = 0.6;
  
  private tempColorTarget: Float32Array;
  private sizeTarget: Float32Array;
  private velocityTarget: Float32Array;
  private transitionSmoothness: number = 0.04;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    simulator: SensorDataSimulator,
    options: ParticleSystemOptions = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.simulator = simulator;
    this.maxParticles = options.maxParticles ?? 2500;
    this.minParticles = options.minParticles ?? 2000;
    this.particleLifetime = options.particleLifetime ?? 5000;
    this.trailLength = options.trailLength ?? 4;
    
    this.tempColorTarget = new Float32Array(this.maxParticles * 3);
    this.sizeTarget = new Float32Array(this.maxParticles);
    this.velocityTarget = new Float32Array(this.maxParticles * 3);
    
    this.initParticlePool();
    this.initGeometry();
    this.initMaterials();
    this.setupEventListeners(options.container);
    this.subscribeToSimulator();
  }

  private initParticlePool(): void {
    this.particles = new Array(this.maxParticles);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i] = {
        id: -1,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        temperature: