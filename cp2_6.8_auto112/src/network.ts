import * as THREE from 'three';

export type NeuronType = 'excitatory' | 'inhibitory';

export interface PotentialPoint {
  time: number;
  value: number;
}

export interface Neuron {
  id: number;
  type: NeuronType;
  position: THREE.Vector3;
  membranePotential: number;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  pulsePhase: number;
  pulseSpeed: number;
  connections: Connection[];
  potentialHistory: PotentialPoint[];
  baseScale: number;
  isHighlighted: boolean;
}

export interface Connection {
  id: number;
  type: NeuronType;
  from: Neuron;
  to: Neuron;
  line: THREE.Line;
  highlightUntil: number;
}

const EXCITATORY_COLOR = 0xff6b35;
const INHIBITORY_COLOR = 0x00b4d8;
const EXCITATORY_LINE_COLOR = 0xffffff;
const INHIBITORY_LINE_COLOR = 0x808080;
const RESTING_POTENTIAL = -70;
const NEURON_RADIUS = 0.5;
const GLOW_RADIUS = 0.8;
const HISTORY_WINDOW = 10;

export class NeuralNetwork {
  neurons: Neuron[] = [];
  connections: Connection[] = [];
  scene: THREE.Scene;
  connectionDensity: number = 0.4;
  private neuronGeometry: THREE.SphereGeometry;
  private glowGeometry: THREE.SphereGeometry;
  private nextNeuronId = 0;
  private nextConnectionId = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.neuronGeometry = new THREE.SphereGeometry(NEURON_RADIUS, 24, 16);
    this.glowGeometry = new THREE.SphereGeometry(GLOW_RADIUS, 16, 12);
  }

  generate(neuronCount: number = 25, density: number = 0.4): void {
    this.clear();
    this.connectionDensity = density;

    for (let i = 0; i < neuronCount; i++) {
      this.createNeuron(i);
    }

    this.generateConnections(density);
  }

  private createNeuron(index: number): void {
    const type: NeuronType = Math.random() < 0.7 ? 'excitatory' : 'inhibitory';
    const color = type === 'excitatory' ? EXCITATORY_COLOR : INHIBITORY_COLOR;

    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 14
    );

    const material = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      shininess: 60
    });

    const mesh = new THREE.Mesh(this.neuronGeometry, material);
    mesh.position.copy(position);
    mesh.userData.neuronIndex = index;
    this.scene.add(mesh);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });

    const glowMesh = new THREE.Mesh(this.glowGeometry, glowMaterial);
    glowMesh.position.copy(position);
    this.scene.add(glowMesh);

    const neuron: Neuron = {
      id: this.nextNeuronId++,
      type,
      position: position.clone(),
      membranePotential: RESTING_POTENTIAL,
      mesh,
      glowMesh,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.PI * 2 / (1.5 + Math.random() * 0.5),
      connections: [],
      potentialHistory: [],
      baseScale: 1,
      isHighlighted: false
    };

    neuron.potentialHistory.push({ time: 0, value: RESTING_POTENTIAL });
    this.neurons.push(neuron);
  }

  private generateConnections(density: number): void {
    const n = this.neurons.length;
    const maxConnections = n * (n - 1);
    const targetCount = Math.floor(maxConnections * density);

    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) pairs.push([i, j]);
      }
    }

    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    for (let i = 0; i < Math.min(targetCount, pairs.length); i++) {
      const [fromIdx, toIdx] = pairs[i];
      this.addConnection(this.neurons[fromIdx], this.neurons[toIdx]);
    }
  }

  addConnection(from: Neuron, to: Neuron): Connection {
    const type = from.type;
    const lineColor = type === 'excitatory' ? EXCITATORY_LINE_COLOR : INHIBITORY_LINE_COLOR;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      from.position,
      to.position
    ]);

    const material = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0.18
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    const connection: Connection = {
      id: this.nextConnectionId++,
      type,
      from,
      to,
      line,
      highlightUntil: 0
    };

    from.connections.push(connection);
    this.connections.push(connection);
    return connection;
  }

  removeConnection(connection: Connection): void {
    const idx = connection.from.connections.indexOf(connection);
    if (idx !== -1) connection.from.connections.splice(idx, 1);

    const arrIdx = this.connections.indexOf(connection);
    if (arrIdx !== -1) this.connections.splice(arrIdx, 1);

    this.scene.remove(connection.line);
    connection.line.geometry.dispose();
    (connection.line.material as THREE.Material).dispose();
  }

  setConnectionDensity(density: number): void {
    this.connectionDensity = density;

    for (let i = this.connections.length - 1; i >= 0; i--) {
      this.removeConnection(this.connections[i]);
    }

    this.generateConnections(density);
  }

  getNeuronByMesh(obj: THREE.Object3D): Neuron | null {
    if (!('userData' in obj)) return null;
    const idx = (obj as THREE.Mesh).userData.neuronIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < this.neurons.length) {
      return this.neurons[idx];
    }
    return null;
  }

  updateNeuronPulse(deltaTime: number, currentTime: number): void {
    for (const neuron of this.neurons) {
      neuron.pulsePhase += neuron.pulseSpeed * deltaTime;
      const glowIntensity = 0.12 + 0.08 * Math.sin(neuron.pulsePhase);
      (neuron.glowMesh.material as THREE.MeshBasicMaterial).opacity = glowIntensity;

      const targetScale = neuron.isHighlighted ? 1.3 : neuron.baseScale;
      neuron.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      neuron.glowMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

      if (neuron.membranePotential > RESTING_POTENTIAL) {
        neuron.membranePotential = THREE.MathUtils.lerp(
          neuron.membranePotential,
          RESTING_POTENTIAL,
          Math.min(1, deltaTime * 1.5)
        );
      }

      const last = neuron.potentialHistory[neuron.potentialHistory.length - 1];
      if (!last || currentTime - last.time > 0.05) {
        neuron.potentialHistory.push({ time: currentTime, value: neuron.membranePotential });
      }

      const cutoff = currentTime - HISTORY_WINDOW;
      while (neuron.potentialHistory.length > 0 && neuron.potentialHistory[0].time < cutoff) {
        neuron.potentialHistory.shift();
      }
    }
  }

  updateConnectionHighlights(currentTime: number): void {
    for (const conn of this.connections) {
      const mat = conn.line.material as THREE.LineBasicMaterial;
      if (currentTime < conn.highlightUntil) {
        mat.opacity = 0.5;
        mat.color.setHex(0xffffff);
      } else {
        mat.opacity = 0.18;
        const baseColor = conn.type === 'excitatory' ? EXCITATORY_LINE_COLOR : INHIBITORY_LINE_COLOR;
        mat.color.setHex(baseColor);
      }
    }
  }

  highlightConnection(connection: Connection, duration: number = 0.3, currentTime: number): void {
    connection.highlightUntil = currentTime + duration;
  }

  clear(): void {
    for (const conn of this.connections) {
      this.scene.remove(conn.line);
      conn.line.geometry.dispose();
      (conn.line.material as THREE.Material).dispose();
    }
    this.connections = [];

    for (const neuron of this.neurons) {
      this.scene.remove(neuron.mesh);
      this.scene.remove(neuron.glowMesh);
      (neuron.mesh.material as THREE.Material).dispose();
      (neuron.glowMesh.material as THREE.Material).dispose();
    }
    this.neurons = [];
    this.nextNeuronId = 0;
    this.nextConnectionId = 0;
  }

  dispose(): void {
    this.clear();
    this.neuronGeometry.dispose();
    this.glowGeometry.dispose();
  }
}
