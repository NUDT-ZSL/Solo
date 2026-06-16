import * as THREE from 'three';
import {
  SculptureNode,
  Connection,
  Template,
  FrequencyData,
  TemplateTransition,
  BOUNDS_RADIUS,
  SPRING_K,
  SPRING_DAMPING,
  MIN_NODE_SIZE,
  MAX_NODE_SIZE,
  MIN_CONNECTION_OPACITY,
  MAX_CONNECTION_OPACITY,
  TRANSITION_DURATION,
} from '@/types';
import { useStore } from '@/store/useStore';

class SceneManager {
  private animationPaused: boolean = false;
  private physicsPaused: boolean = false;
  private audioPaused: boolean = false;
  private externalAudioAnalyzer: { getIsPlaying: () => boolean; pause: () => void; play: () => void } | null = null;

  setAudioAnalyzer(analyzer: { getIsPlaying: () => boolean; pause: () => void; play: () => void }): void {
    this.externalAudioAnalyzer = analyzer;
  }

  updatePhysics(deltaTime: number): void {
    if (this.physicsPaused || this.animationPaused) return;
    const state = useStore.getState();
    const { connections, isDraggingNode, selectedNodeId } = state;
    let nodes = state.nodes.map((n) => ({
      ...n,
      velocity: { ...n.velocity },
      position: { ...n.position },
    }));

    const forces: Map<string, { x: number; y: number; z: number }> = new Map();
    for (const node of nodes) {
      forces.set(node.id, { x: 0, y: 0, z: 0 });
    }

    for (const conn of connections) {
      const fromNode = nodes.find((n) => n.id === conn.fromId);
      const toNode = nodes.find((n) => n.id === conn.toId);
      if (!fromNode || !toNode) continue;

      const dx = toNode.position.x - fromNode.position.x;
      const dy = toNode.position.y - fromNode.position.y;
      const dz = toNode.position.z - fromNode.position.z;
      const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (currentLength === 0) continue;

      const displacement = currentLength - conn.restLength;
      const forceMagnitude = -SPRING_K * displacement;
      const dirX = dx / currentLength;
      const dirY = dy / currentLength;
      const dirZ = dz / currentLength;

      const fromForces = forces.get(conn.fromId)!;
      fromForces.x -= forceMagnitude * dirX;
      fromForces.y -= forceMagnitude * dirY;
      fromForces.z -= forceMagnitude * dirZ;

      const toForces = forces.get(conn.toId)!;
      toForces.x += forceMagnitude * dirX;
      toForces.y += forceMagnitude * dirY;
      toForces.z += forceMagnitude * dirZ;
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (isDraggingNode && selectedNodeId === node.id) continue;

      const force = forces.get(node.id)!;
      node.velocity.x = (node.velocity.x + force.x * deltaTime) * SPRING_DAMPING;
      node.velocity.y = (node.velocity.y + force.y * deltaTime) * SPRING_DAMPING;
      node.velocity.z = (node.velocity.z + force.z * deltaTime) * SPRING_DAMPING;

      node.position.x += node.velocity.x * deltaTime;
      node.position.y += node.velocity.y * deltaTime;
      node.position.z += node.velocity.z * deltaTime;
    }

    this.enforceBoundsOnNodes(nodes);

    useStore.getState().setNodes(nodes);
  }

  private enforceBoundsOnNodes(nodes: SculptureNode[]): void {
    for (const node of nodes) {
      const dist = Math.sqrt(
        node.position.x * node.position.x +
        node.position.y * node.position.y +
        node.position.z * node.position.z
      );
      if (dist > BOUNDS_RADIUS) {
        const scale = BOUNDS_RADIUS / dist;
        node.position.x *= scale;
        node.position.y *= scale;
        node.position.z *= scale;
      }
    }
  }

  enforceBounds(): void {
    const { nodes } = useStore.getState();
    const updated = nodes.map((n) => {
      const dist = Math.sqrt(
        n.position.x * n.position.x +
        n.position.y * n.position.y +
        n.position.z * n.position.z
      );
      if (dist > BOUNDS_RADIUS) {
        const scale = BOUNDS_RADIUS / dist;
        return {
          ...n,
          position: {
            x: n.position.x * scale,
            y: n.position.y * scale,
            z: n.position.z * scale,
          },
        };
      }
      return n;
    });
    useStore.getState().setNodes(updated);
  }

  startTemplateTransition(template: Template): void {
    const state = useStore.getState();
    const fromNodes = state.nodes;
    const toNodes = template.sculpture.nodes;
    const fromConnections = state.connections;
    const toConnections = template.sculpture.connections;

    const maxNodeCount = Math.max(fromNodes.length, toNodes.length);

    const paddedFromNodes: SculptureNode[] = fromNodes.slice();
    const paddedToNodes: SculptureNode[] = toNodes.slice();

    while (paddedFromNodes.length < maxNodeCount) {
      paddedFromNodes.push({
        id: `__pad_from_${paddedFromNodes.length}`,
        position: { x: 0, y: 0, z: 0 },
        restPosition: { x: 0, y: 0, z: 0 },
        size: 1,
        color: '#ffffff',
        emissiveIntensity: 0,
        velocity: { x: 0, y: 0, z: 0 },
      });
    }

    while (paddedToNodes.length < maxNodeCount) {
      paddedToNodes.push({
        id: `__pad_to_${paddedToNodes.length}`,
        position: { x: 0, y: 0, z: 0 },
        restPosition: { x: 0, y: 0, z: 0 },
        size: 1,
        color: '#ffffff',
        emissiveIntensity: 0,
        velocity: { x: 0, y: 0, z: 0 },
      });
    }

    const transition: TemplateTransition = {
      fromNodes: paddedFromNodes,
      toNodes: paddedToNodes,
      fromConnections: fromConnections.slice(),
      toConnections: toConnections.slice(),
      startTime: Date.now(),
      duration: TRANSITION_DURATION,
    };

    useStore.getState().startTransition(transition);
  }

  updateTransition(): void {
    const { transitionState, transition } = useStore.getState();
    if (transitionState !== 'transitioning' || !transition) return;

    const now = Date.now();
    const rawT = (now - transition.startTime) / transition.duration;
    const t = Math.min(Math.max(rawT, 0), 1);

    const tEased =
      3 * (1 - t) * (1 - t) * t * 0.25 +
      3 * (1 - t) * t * t * 0.75 +
      t * t * t;

    const maxNodeCount = Math.max(transition.fromNodes.length, transition.toNodes.length);
    const interpolatedNodes: SculptureNode[] = [];

    for (let i = 0; i < maxNodeCount; i++) {
      const from = transition.fromNodes[i];
      const to = transition.toNodes[i];

      if (!from && !to) continue;

      const f = from || transition.toNodes[i];
      const target = to || transition.fromNodes[i];

      const position = {
        x: f.position.x + (target.position.x - f.position.x) * tEased,
        y: f.position.y + (target.position.y - f.position.y) * tEased,
        z: f.position.z + (target.position.z - f.position.z) * tEased,
      };

      const restPosition = {
        x: f.restPosition.x + (target.restPosition.x - f.restPosition.x) * tEased,
        y: f.restPosition.y + (target.restPosition.y - f.restPosition.y) * tEased,
        z: f.restPosition.z + (target.restPosition.z - f.restPosition.z) * tEased,
      };

      const size = f.size + (target.size - f.size) * tEased;
      const color = this.lerpColor(f.color, target.color, tEased);
      const emissiveIntensity = f.emissiveIntensity + (target.emissiveIntensity - f.emissiveIntensity) * tEased;

      interpolatedNodes.push({
        id: target.id || f.id,
        position,
        restPosition,
        size,
        color,
        emissiveIntensity,
        velocity: { x: 0, y: 0, z: 0 },
      });
    }

    const maxConnCount = Math.max(transition.fromConnections.length, transition.toConnections.length);
    const interpolatedConnections: Connection[] = [];

    for (let i = 0; i < maxConnCount; i++) {
      const from = transition.fromConnections[i];
      const to = transition.toConnections[i];

      if (from && to) {
        const strength = from.strength + (to.strength - from.strength) * tEased;
        const opacity = from.opacity + (to.opacity - from.opacity) * tEased;
        const restLength = from.restLength + (to.restLength - from.restLength) * tEased;
        interpolatedConnections.push({
          fromId: to.fromId,
          toId: to.toId,
          strength,
          opacity,
          restLength,
        });
      } else if (to) {
        const opacity = to.opacity * tEased;
        interpolatedConnections.push({
          fromId: to.fromId,
          toId: to.toId,
          strength: to.strength,
          opacity,
          restLength: to.restLength,
        });
      } else if (from) {
        const opacity = from.opacity * (1 - tEased);
        interpolatedConnections.push({
          fromId: from.fromId,
          toId: from.toId,
          strength: from.strength,
          opacity,
          restLength: from.restLength,
        });
      }
    }

    useStore.getState().applyTransitionFrame(interpolatedNodes, interpolatedConnections);

    if (t >= 1) {
      useStore.getState().endTransition();
    }
  }

  applyAudioData(data: FrequencyData): void {
    if (this.audioPaused || this.animationPaused) return;
    const state = useStore.getState();
    const { nodes, connections } = state;

    if (nodes.length === 0 && connections.length === 0) return;

    const targetHue = 0;
    const hueShiftAmount = data.low * 0.3;

    const updatedNodes = nodes.map((node) => {
      const color = new THREE.Color(node.color);
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);

      let hueDiff = targetHue - hsl.h;
      if (hueDiff > 0.5) hueDiff -= 1;
      if (hueDiff < -0.5) hueDiff += 1;
      const newHue = (hsl.h + hueDiff * hueShiftAmount + 1) % 1;

      const saturationBoost = data.low * 0.3;
      const newSaturation = Math.min(1, hsl.s * (1 + saturationBoost));

      color.setHSL(newHue, newSaturation, hsl.l);

      const baseSize = node.size;
      const sizeMultiplier = 0.5 + data.mid * 1.0;
      const newSize = Math.min(
        MAX_NODE_SIZE,
        Math.max(MIN_NODE_SIZE, baseSize * sizeMultiplier)
      );

      return {
        ...node,
        color: '#' + color.getHexString(),
        size: newSize,
      };
    });

    const time = Date.now() / 1000;
    const flickerRate = 0.5 + data.high * 1.5;
    const flicker = Math.sin(time * flickerRate * Math.PI * 2);

    const updatedConnections = connections.map((conn) => {
      const baseOpacity = conn.opacity;
      const modulated = baseOpacity * (1 + data.high * 0.5) * (1 + flicker * 0.15);
      const newOpacity = Math.min(
        MAX_CONNECTION_OPACITY,
        Math.max(MIN_CONNECTION_OPACITY, modulated)
      );

      return {
        ...conn,
        opacity: newOpacity,
      };
    });

    useStore.getState().setNodes(updatedNodes);
    useStore.getState().setConnections(updatedConnections);
  }

  async exportSnapshot(
    gl: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): Promise<void> {
    this.animationPaused = true;
    this.physicsPaused = true;
    this.audioPaused = true;

    const audioWasPlaying = this.externalAudioAnalyzer?.getIsPlaying() ?? false;
    if (audioWasPlaying) {
      this.externalAudioAnalyzer?.pause();
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    const originalSize = gl.getSize(new THREE.Vector2());
    const originalPixelRatio = gl.getPixelRatio();

    gl.setSize(1920, 1080);
    gl.setPixelRatio(1);
    gl.render(scene, camera);

    const dataUrl = gl.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `light-sculpture-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    gl.setSize(originalSize.x, originalSize.y);
    gl.setPixelRatio(originalPixelRatio);

    this.animationPaused = false;
    this.physicsPaused = false;
    this.audioPaused = false;

    if (audioWasPlaying) {
      this.externalAudioAnalyzer?.play();
    }
  }

  isAnimationPaused(): boolean {
    return this.animationPaused;
  }

  isPhysicsPaused(): boolean {
    return this.physicsPaused;
  }

  isAudioPaused(): boolean {
    return this.audioPaused;
  }

  lerpColor(color1: string, color2: string, t: number): string {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const result = new THREE.Color();
    result.lerpColors(c1, c2, t);
    return '#' + result.getHexString();
  }
}

export const sceneManager = new SceneManager();
