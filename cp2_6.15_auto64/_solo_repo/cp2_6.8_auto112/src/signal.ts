import * as THREE from 'three';
import { NeuralNetwork, Neuron, Connection } from './network';

interface SignalPulse {
  id: number;
  connection: Connection;
  progress: number;
  speed: number;
  mesh: THREE.Mesh;
  traveled: number;
  triggered: boolean;
}

interface Particle {
  id: number;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const PULSE_RADIUS = 0.4;
const PULSE_SPEED = 5;
const MAX_PARTICLES = 1500;
const EPSP_STRENGTH = 15;
const IPSP_STRENGTH = 10;
const ACTION_POTENTIAL_THRESHOLD = -55;
const ACTION_POTENTIAL_PEAK = 30;
const EXCITATORY_PARTICLE_COLOR = 0xff6b35;
const INHIBITORY_PARTICLE_COLOR = 0x00b4d8;

export class SignalManager {
  pulses: SignalPulse[] = [];
  particles: Particle[] = [];
  network: NeuralNetwork;
  scene: THREE.Scene;
  stimulationFrequency: number = 2;
  onPotentialUpdate?: (neuron: Neuron) => void;

  private nextPulseId = 0;
  private nextParticleId = 0;
  private pulseGeometry: THREE.SphereGeometry;
  private particleGeometry: THREE.SphereGeometry;
  private lastStimulationTime = 0;
  private stimulationInterval = 0.5;
  private pulseMaterial: THREE.MeshBasicMaterial;
  private excitatoryParticleMaterial: THREE.MeshBasicMaterial;
  private inhibitoryParticleMaterial: THREE.MeshBasicMaterial;

  constructor(network: NeuralNetwork, scene: THREE.Scene) {
    this.network = network;
    this.scene = scene;
    this.pulseGeometry = new THREE.SphereGeometry(PULSE_RADIUS, 12, 8);
    this.particleGeometry = new THREE.SphereGeometry(0.08, 6, 4);
    this.pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.9
    });
    this.excitatoryParticleMaterial = new THREE.MeshBasicMaterial({
      color: EXCITATORY_PARTICLE_COLOR,
      transparent: true,
      opacity: 1
    });
    this.inhibitoryParticleMaterial = new THREE.MeshBasicMaterial({
      color: INHIBITORY_PARTICLE_COLOR,
      transparent: true,
      opacity: 1
    });
  }

  setStimulationFrequency(freq: number): void {
    this.stimulationFrequency = freq;
    this.stimulationInterval = 1 / freq;
  }

  triggerActionPotential(neuron: Neuron): void {
    neuron.membranePotential = ACTION_POTENTIAL_PEAK;
    neuron.isHighlighted = true;

    for (const conn of neuron.connections) {
      this.spawnPulse(conn);
    }

    if (this.onPotentialUpdate) {
      this.onPotentialUpdate(neuron);
    }

    setTimeout(() => {
      neuron.isHighlighted = false;
    }, 500);
  }

  private spawnPulse(connection: Connection): void {
    const mesh = new THREE.Mesh(this.pulseGeometry, this.pulseMaterial);
    mesh.position.copy(connection.from.position);
    this.scene.add(mesh);

    const distance = connection.from.position.distanceTo(connection.to.position);

    this.pulses.push({
      id: this.nextPulseId++,
      connection,
      progress: 0,
      speed: PULSE_SPEED,
      mesh,
      traveled: 0,
      triggered: false
    });

    void distance;
  }

  private spawnNeurotransmitterParticles(synapsePosition: THREE.Vector3, type: 'excitatory' | 'inhibitory'): void {
    const particleCount = 20 + Math.floor(Math.random() * 21);
    const material = type === 'excitatory'
      ? this.excitatoryParticleMaterial
      : this.inhibitoryParticleMaterial;

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const mesh = new THREE.Mesh(this.particleGeometry, material);
      mesh.position.copy(synapsePosition);
      this.scene.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.5 + Math.random() * 2;

      this.particles.push({
        id: this.nextParticleId++,
        mesh,
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: 1,
        maxLife: 1
      });
    }
  }

  private applySynapticPotential(targetNeuron: Neuron, connectionType: 'excitatory' | 'inhibitory'): void {
    const change = connectionType === 'excitatory' ? EPSP_STRENGTH : -IPSP_STRENGTH;
    targetNeuron.membranePotential += change;
    targetNeuron.membranePotential = Math.max(-90, Math.min(40, targetNeuron.membranePotential));

    if (targetNeuron.membranePotential >= ACTION_POTENTIAL_THRESHOLD && change > 0) {
      const shouldFire = Math.random() < 0.6;
      if (shouldFire) {
        this.triggerActionPotential(targetNeuron);
      }
    }

    if (this.onPotentialUpdate) {
      this.onPotentialUpdate(targetNeuron);
    }
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.stimulationFrequency > 0 && currentTime - this.lastStimulationTime >= this.stimulationInterval) {
      this.lastStimulationTime = currentTime;
      if (this.network.neurons.length > 0) {
        const randomNeuron = this.network.neurons[Math.floor(Math.random() * this.network.neurons.length)];
        this.triggerActionPotential(randomNeuron);
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      const conn = pulse.connection;
      const dist = conn.from.position.distanceTo(conn.to.position);

      pulse.traveled += pulse.speed * deltaTime;
      pulse.progress = Math.min(1, pulse.traveled / dist);

      pulse.mesh.position.lerpVectors(conn.from.position, conn.to.position, pulse.progress);

      this.network.highlightConnection(conn, 0.3, currentTime);

      if (pulse.progress >= 1 && !pulse.triggered) {
        pulse.triggered = true;

        this.spawnNeurotransmitterParticles(conn.to.position, conn.type);
        this.applySynapticPotential(conn.to, conn.type);

        this.scene.remove(pulse.mesh);
        this.pulses.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.multiplyScalar(0.96);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  clearAll(): void {
    for (const pulse of this.pulses) {
      this.scene.remove(pulse.mesh);
    }
    this.pulses = [];

    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
    }
    this.particles = [];
  }

  dispose(): void {
    this.clearAll();
    this.pulseGeometry.dispose();
    this.particleGeometry.dispose();
    this.pulseMaterial.dispose();
    this.excitatoryParticleMaterial.dispose();
    this.inhibitoryParticleMaterial.dispose();
  }
}
