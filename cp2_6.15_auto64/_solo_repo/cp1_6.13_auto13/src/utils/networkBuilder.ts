import * as THREE from 'three';
import type {
  VisualizationData,
  Layer,
  NeuronData,
  ConnectionLine
} from '../types';

const LAYER_SPACING = 12;
const ROW_SPACING = 3;
const COL_SPACING = 3.5;

const NEURON_RADIUS: Record<string, number> = {
  input: 1.2,
  hidden: 1.0,
  output: 0.8
};

const LAYER_COLORS: Record<string, number> = {
  input: 0x3b82f6,
  hidden: 0x8b5cf6,
  output: 0xf97316
};

const COLOR_START = '#cccccc';
const COLOR_END = '#ff8800';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      }
    : { r: 0.8, g: 0.8, b: 0.8 };
}

function lerpColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  t: number
): THREE.Color {
  const clampedT = clamp(t, 0, 1);
  return new THREE.Color(
    color1.r + (color2.r - color1.r) * clampedT,
    color1.g + (color2.g - color1.g) * clampedT,
    color1.b + (color2.b - color1.b) * clampedT
  );
}

function getWeightColor(weight: number, maxWeight: number): THREE.Color {
  const normalized = clamp(Math.abs(weight) / Math.max(maxWeight, 0.001), 0, 1);
  const color1 = hexToRgb(COLOR_START);
  const color2 = hexToRgb(COLOR_END);
  return lerpColor(color1, color2, normalized);
}

function calculateGridPosition(
  index: number,
  total: number,
  layerZ: number
): { x: number; y: number; z: number } {
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const row = Math.floor(index / cols);
  const col = index % cols;

  const offsetX = ((cols - 1) * COL_SPACING) / 2;
  const offsetY = ((rows - 1) * ROW_SPACING) / 2;

  return {
    x: col * COL_SPACING - offsetX,
    y: offsetY - row * ROW_SPACING,
    z: layerZ
  };
}

export interface NetworkObjects {
  scene: THREE.Group;
  neurons: Map<string, THREE.Mesh>;
  neuronData: Map<string, NeuronData>;
  connections: Map<string, THREE.Line>;
  connectionData: Map<string, ConnectionLine>;
  layerGroups: Map<string, THREE.Group>;
  layerLabels: Map<string, THREE.Sprite>;
  connectionLabels: Map<string, THREE.Sprite>;
}

export function buildNetwork(
  data: VisualizationData
): {
  objects: NetworkObjects;
  neuronDataList: NeuronData[];
  connectionDataList: ConnectionLine[];
} {
  const group = new THREE.Group();

  const neurons = new Map<string, THREE.Mesh>();
  const neuronData = new Map<string, NeuronData>();
  const neuronDataList: NeuronData[] = [];
  const connections = new Map<string, THREE.Line>();
  const connectionData = new Map<string, ConnectionLine>();
  const connectionDataList: ConnectionLine[] = [];
  const layerGroups = new Map<string, THREE.Group>();
  const layerLabels = new Map<string, THREE.Sprite>();
  const connectionLabels = new Map<string, THREE.Sprite>();

  const totalLayers = data.layers.length;
  const totalWidth = (totalLayers - 1) * LAYER_SPACING;
  const startZ = -totalWidth / 2;

  const allWeights: number[] = [];
  data.connectionMatrix.forEach(layerConns => {
    layerConns.forEach(neuronConns => {
      neuronConns.forEach(conn => {
        allWeights.push(Math.abs(conn.weight));
      });
    });
  });
  const maxWeight = Math.max(...allWeights, 0.001);

  data.layers.forEach((layer: Layer, layerIndex: number) => {
    const layerGroup = new THREE.Group();
    layerGroup.name = layer.id;
    layerGroups.set(layer.id, layerGroup);

    const layerZ = startZ + layerIndex * LAYER_SPACING;

    for (let i = 0; i < layer.neurons; i++) {
      const position = calculateGridPosition(i, layer.neurons, layerZ);
      const neuronId = `${layer.id}-neuron-${i}`;
      const radius = NEURON_RADIUS[layer.type];

      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: LAYER_COLORS[layer.type],
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0
      });
      (material as any)._materialType = 'neuron';
      (material as any)._layerId = layer.id;

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(position.x, position.y, position.z);
      sphere.userData = { neuronId, layerType: layer.type };

      const inputWeights: number[] = [];
      const outputWeights: number[] = [];

      if (layerIndex > 0) {
        const prevConnections = data.connectionMatrix[layerIndex - 1];
        if (prevConnections) {
          prevConnections.forEach(neuronConns => {
            const conn = neuronConns.find(c => c.toNeuron === i);
            if (conn) inputWeights.push(conn.weight);
          });
        }
      }

      if (layerIndex < data.connectionMatrix.length) {
        const nextConnections = data.connectionMatrix[layerIndex];
        if (nextConnections && nextConnections[i]) {
          nextConnections[i].forEach(conn => {
            outputWeights.push(conn.weight);
          });
        }
      }

      const nData: NeuronData = {
        id: neuronId,
        layerId: layer.id,
        layerName: layer.name,
        layerType: layer.type,
        neuronIndex: i,
        position,
        radius,
        inputWeights,
        outputWeights
      };

      neurons.set(neuronId, sphere);
      neuronData.set(neuronId, nData);
      neuronDataList.push(nData);
      layerGroup.add(sphere);
    }

    const labelCanvas = document.createElement('canvas');
    const labelContext = labelCanvas.getContext('2d')!;
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    labelContext.fillStyle = 'rgba(0,0,0,0)';
    labelContext.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
    labelContext.font = 'bold 48px Arial';
    labelContext.fillStyle = '#ffffff';
    labelContext.textAlign = 'center';
    labelContext.textBaseline = 'middle';
    labelContext.fillText(layer.name, labelCanvas.width / 2, labelCanvas.height / 2);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0,
      depthTest: false
    });
    (labelMaterial as any)._materialType = 'layerLabel';
    (labelMaterial as any)._layerId = layer.id;

    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.position.set(0, 8, layerZ);
    labelSprite.scale.set(8, 2, 1);
    labelSprite.renderOrder = 999;
    layerLabels.set(layer.id, labelSprite);
    layerGroup.add(labelSprite);

    group.add(layerGroup);
  });

  data.connectionMatrix.forEach((layerConns, layerIndex) => {
    const fromLayer = data.layers[layerIndex];
    const toLayer = data.layers[layerIndex + 1];
    const fromGroup = layerGroups.get(fromLayer.id)!;

    layerConns.forEach((neuronConns, fromNeuronIdx) => {
      neuronConns.forEach((conn, toNeuronIdx) => {
        const fromNeuronId = `${fromLayer.id}-neuron-${fromNeuronIdx}`;
        const toNeuronId = `${toLayer.id}-neuron-${toNeuronIdx}`;
        const connectionId = `${fromNeuronId}-${toNeuronId}`;

        const fromPos = neuronData.get(fromNeuronId)!.position;
        const toPos = neuronData.get(toNeuronId)!.position;

        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          fromPos.x, fromPos.y, fromPos.z,
          toPos.x, toPos.y, toPos.z
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const lineColor = getWeightColor(conn.weight, maxWeight);

        const material = new THREE.LineBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: 0
        });
        (material as any)._materialType = 'connection';
        (material as any)._layerId = fromLayer.id;
        (material as any)._baseOpacity = 0.3;

        const line = new THREE.Line(geometry, material);
        line.userData = { connectionId, weight: conn.weight };

        const connData: ConnectionLine = {
          id: connectionId,
          fromNeuronId,
          toNeuronId,
          fromLayerIndex: layerIndex,
          toLayerIndex: layerIndex + 1,
          weight: conn.weight,
          weightNormalized: clamp(Math.abs(conn.weight) / maxWeight, 0, 1)
        };

        connections.set(connectionId, line);
        connectionData.set(connectionId, connData);
        connectionDataList.push(connData);
        fromGroup.add(line);

        const connLabelCanvas = document.createElement('canvas');
        const connLabelContext = connLabelCanvas.getContext('2d')!;
        connLabelCanvas.width = 256;
        connLabelCanvas.height = 64;
        connLabelContext.fillStyle = 'rgba(0,0,0,0.7)';
        connLabelContext.fillRect(0, 0, connLabelCanvas.width, connLabelCanvas.height);
        connLabelContext.font = 'bold 24px Arial';
        connLabelContext.fillStyle = '#ffffff';
        connLabelContext.textAlign = 'center';
        connLabelContext.textBaseline = 'middle';
        connLabelContext.fillText(conn.weight.toFixed(2), connLabelCanvas.width / 2, connLabelCanvas.height / 2);

        const connLabelTexture = new THREE.CanvasTexture(connLabelCanvas);
        const connLabelMaterial = new THREE.SpriteMaterial({
          map: connLabelTexture,
          transparent: true,
          opacity: 0,
          depthTest: false
        });
        (connLabelMaterial as any)._materialType = 'connectionLabel';
        (connLabelMaterial as any)._layerId = fromLayer.id;

        const connLabelSprite = new THREE.Sprite(connLabelMaterial);
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const midZ = (fromPos.z + toPos.z) / 2;
        connLabelSprite.position.set(midX, midY, midZ);
        connLabelSprite.scale.set(2, 0.5, 1);
        connLabelSprite.renderOrder = 1000;
        connectionLabels.set(connectionId, connLabelSprite);
        fromGroup.add(connLabelSprite);
      });
    });
  });

  return {
    objects: {
      scene: group,
      neurons,
      neuronData,
      connections,
      connectionData,
      layerGroups,
      layerLabels,
      connectionLabels
    },
    neuronDataList,
    connectionDataList
  };
}

export function fadeInAnimation(
  objects: NetworkObjects,
  layers: Layer[],
  onComplete?: () => void
): () => void {
  const startTime = performance.now();
  const layerDelay = 300;
  let animationId: number;
  let isCancelled = false;

  const neuronMaterials: Array<{ mat: THREE.MeshStandardMaterial; layerId: string; initialOpacity: number }> = [];
  const connectionMaterials: Array<{ mat: THREE.LineBasicMaterial; layerId: string; initialOpacity: number }> = [];
  const layerLabelMaterials: Array<{ mat: THREE.SpriteMaterial; layerId: string; initialOpacity: number }> = [];
  const connectionLabelMaterials: Array<{ mat: THREE.SpriteMaterial; layerId: string; initialOpacity: number }> = [];

  objects.layerGroups.forEach((group, layerId) => {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          const mat = m as THREE.MeshStandardMaterial;
          neuronMaterials.push({ mat, layerId, initialOpacity: mat.opacity });
        });
      } else if (child instanceof THREE.Line && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          const mat = m as THREE.LineBasicMaterial;
          connectionMaterials.push({ mat, layerId, initialOpacity: mat.opacity });
        });
      } else if (child instanceof THREE.Sprite && child.material) {
        const mat = child.material as THREE.SpriteMaterial;
        const matType = (mat as any)._materialType;
        if (matType === 'layerLabel') {
          layerLabelMaterials.push({ mat, layerId, initialOpacity: mat.opacity });
        } else if (matType === 'connectionLabel') {
          connectionLabelMaterials.push({ mat, layerId, initialOpacity: mat.opacity });
        }
      }
    });
  });

  function getLayerIndex(layerId: string): number {
    return layers.findIndex(l => l.id === layerId);
  }

  function animate() {
    if (isCancelled) return;
    
    const elapsed = performance.now() - startTime;
    let allComplete = true;

    neuronMaterials.forEach(({ mat, layerId }) => {
      const layerIdx = getLayerIndex(layerId);
      const layerStart = layerIdx * layerDelay;
      const layerElapsed = Math.max(0, elapsed - layerStart);
      const layerDuration = 2000;
      const progress = Math.min(layerElapsed / layerDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      mat.opacity = eased;
      if (progress < 1) allComplete = false;
    });

    connectionMaterials.forEach(({ mat, layerId }) => {
      const layerIdx = getLayerIndex(layerId);
      const layerStart = layerIdx * layerDelay;
      const layerElapsed = Math.max(0, elapsed - layerStart);
      const layerDuration = 2000;
      const progress = Math.min(layerElapsed / layerDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      mat.opacity = eased * 0.3;
      if (progress < 1) allComplete = false;
    });

    layerLabelMaterials.forEach(({ mat, layerId }) => {
      const layerIdx = getLayerIndex(layerId);
      const layerStart = layerIdx * layerDelay;
      const layerElapsed = Math.max(0, elapsed - layerStart);
      const layerDuration = 2000;
      const progress = Math.min(layerElapsed / layerDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      mat.opacity = eased;
      if (progress < 1) allComplete = false;
    });

    if (!allComplete) {
      animationId = requestAnimationFrame(animate);
    } else {
      if (onComplete && !isCancelled) {
        onComplete();
      }
    }
  }

  animate();

  return () => {
    isCancelled = true;
    cancelAnimationFrame(animationId);
    neuronMaterials.forEach(({ mat, initialOpacity }) => {
      mat.opacity = initialOpacity;
    });
    connectionMaterials.forEach(({ mat, initialOpacity }) => {
      mat.opacity = initialOpacity;
    });
    layerLabelMaterials.forEach(({ mat, initialOpacity }) => {
      mat.opacity = initialOpacity;
    });
    connectionLabelMaterials.forEach(({ mat, initialOpacity }) => {
      mat.opacity = initialOpacity;
    });
  };
}

export function highlightNeuron(
  objects: NetworkObjects,
  neuronId: string | null,
  showConnectionLabels: boolean,
  showLayerLabels: boolean
) {
  if (!neuronId) {
    objects.neurons.forEach((neuron) => {
      const mat = neuron.material as THREE.MeshStandardMaterial;
      mat.opacity = 1;
    });

    objects.connections.forEach((conn) => {
      const mat = conn.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3;
    });

    objects.connectionLabels.forEach((label) => {
      const mat = label.material as THREE.SpriteMaterial;
      mat.opacity = showConnectionLabels ? 1 : 0;
    });

    objects.layerLabels.forEach((label) => {
      const mat = label.material as THREE.SpriteMaterial;
      mat.opacity = showLayerLabels ? 1 : 0;
    });
    return;
  }

  const connectedConnectionIds = new Set<string>();

  objects.connectionData.forEach((connData, connId) => {
    if (connData.fromNeuronId === neuronId || connData.toNeuronId === neuronId) {
      connectedConnectionIds.add(connId);
    }
  });

  const connectedNeuronIds = new Set<string>([neuronId]);
  objects.connectionData.forEach((connData) => {
    if (connData.fromNeuronId === neuronId) {
      connectedNeuronIds.add(connData.toNeuronId);
    }
    if (connData.toNeuronId === neuronId) {
      connectedNeuronIds.add(connData.fromNeuronId);
    }
  });

  objects.neurons.forEach((neuron, nId) => {
    const mat = neuron.material as THREE.MeshStandardMaterial;
    mat.opacity = connectedNeuronIds.has(nId) ? 1 : 0.1;
  });

  objects.connections.forEach((conn, connId) => {
    const mat = conn.material as THREE.LineBasicMaterial;
    mat.opacity = connectedConnectionIds.has(connId) ? 0.8 : 0.1;
  });

  objects.connectionLabels.forEach((label, connId) => {
    const mat = label.material as THREE.SpriteMaterial;
    mat.opacity = showConnectionLabels && connectedConnectionIds.has(connId) ? 1 : 0;
  });

  objects.layerLabels.forEach((label) => {
    const mat = label.material as THREE.SpriteMaterial;
    mat.opacity = showLayerLabels ? 1 : 0.3;
  });
}

export function updateLabelsVisibility(
  objects: NetworkObjects,
  showConnectionLabels: boolean,
  showLayerLabels: boolean,
  highlightedNeuronId: string | null
) {
  objects.layerLabels.forEach((label) => {
    const mat = label.material as THREE.SpriteMaterial;
    if (highlightedNeuronId) {
      mat.opacity = showLayerLabels ? 1 : 0.3;
    } else {
      mat.opacity = showLayerLabels ? 1 : 0;
    }
  });

  const connectedConnectionIds = new Set<string>();
  if (highlightedNeuronId) {
    objects.connectionData.forEach((connData, connId) => {
      if (connData.fromNeuronId === highlightedNeuronId || connData.toNeuronId === highlightedNeuronId) {
        connectedConnectionIds.add(connId);
      }
    });
  }

  objects.connectionLabels.forEach((label, connId) => {
    const mat = label.material as THREE.SpriteMaterial;
    if (highlightedNeuronId) {
      mat.opacity = showConnectionLabels && connectedConnectionIds.has(connId) ? 1 : 0;
    } else {
      mat.opacity = showConnectionLabels ? 1 : 0;
    }
  });
}

export function disposeNetwork(objects: NetworkObjects) {
  objects.neurons.forEach((neuron) => {
    neuron.geometry.dispose();
    if (Array.isArray(neuron.material)) {
      neuron.material.forEach(m => m.dispose());
    } else {
      neuron.material.dispose();
    }
  });

  objects.connections.forEach((conn) => {
    conn.geometry.dispose();
    if (Array.isArray(conn.material)) {
      conn.material.forEach(m => m.dispose());
    } else {
      conn.material.dispose();
    }
  });

  objects.layerLabels.forEach((label) => {
    const material = label.material as THREE.SpriteMaterial;
    if (material.map) {
      material.map.dispose();
    }
    material.dispose();
  });

  objects.connectionLabels.forEach((label) => {
    const material = label.material as THREE.SpriteMaterial;
    if (material.map) {
      material.map.dispose();
    }
    material.dispose();
  });

  objects.scene.clear();
}

export { LAYER_COLORS };
