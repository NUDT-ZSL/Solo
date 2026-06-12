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

const NEURON_RADIUS = {
  input: 1.2,
  hidden: 1.0,
  output: 0.8
};

const LAYER_COLORS = {
  input: 0x3b82f6,
  hidden: 0x8b5cf6,
  output: 0xf97316
};

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
  return new THREE.Color(
    color1.r + (color2.r - color1.r) * t,
    color1.g + (color2.g - color1.g) * t,
    color1.b + (color2.b - color1.b) * t
  );
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
  const maxWeight = Math.max(...allWeights, 1);

  data.layers.forEach((layer: Layer, layerIndex: number) => {
    const layerGroup = new THREE.Group();
    layerGroup.name = layer.id;
    layerGroups.set(layer.id, layerGroup);

    const layerZ = startZ + layerIndex * LAYER_SPACING;
    const neuronPositions: Map<number, THREE.Vector3> = new Map();

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
      neuronPositions.set(i, new THREE.Vector3(position.x, position.y, position.z));
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
      opacity: 0
    });
    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.position.set(0, 8, layerZ);
    labelSprite.scale.set(8, 2, 1);
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

        const weightNormalized = Math.min(Math.abs(conn.weight) / maxWeight, 1);
        const color1 = hexToRgb('#cccccc');
        const color2 = hexToRgb('#ff8800');
        const lineColor = lerpColor(color1, color2, weightNormalized);

        const material = new THREE.LineBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: 0
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { connectionId, weight: conn.weight };

        const connData: ConnectionLine = {
          id: connectionId,
          fromNeuronId,
          toNeuronId,
          weight: conn.weight,
          weightNormalized
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
          opacity: 0
        });
        const connLabelSprite = new THREE.Sprite(connLabelMaterial);
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const midZ = (fromPos.z + toPos.z) / 2;
        connLabelSprite.position.set(midX, midY, midZ);
        connLabelSprite.scale.set(2, 0.5, 1);
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
  const totalDuration = 30000;
  const layerDelay = 300;
  let animationId: number;

  const allMaterials: THREE.Material[] = [];

  objects.layerGroups.forEach((group, layerId) => {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          (m as any)._initialOpacity = (m as any).opacity;
          (m as any)._layerId = layerId;
          allMaterials.push(m);
        });
      } else if (child instanceof THREE.Line && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          (m as any)._initialOpacity = (m as any).opacity;
          (m as any)._layerId = layerId;
          allMaterials.push(m);
        });
      } else if (child instanceof THREE.Sprite && child.material) {
        (child.material as any)._initialOpacity = (child.material as any).opacity;
        (child.material as any)._layerId = layerId;
        allMaterials.push(child.material);
      }
    });
  });

  function animate() {
    const elapsed = performance.now() - startTime;

    allMaterials.forEach((mat: any) => {
      const layerIdx = layers.findIndex(l => l.id === mat._layerId);
      const layerStart = layerIdx * layerDelay;
      const layerElapsed = Math.max(0, elapsed - layerStart);
      const layerDuration = 2000;
      const progress = Math.min(layerElapsed / layerDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      mat.opacity = eased * 0.3;
    });

    if (elapsed < totalDuration) {
      animationId = requestAnimationFrame(animate);
    } else {
      allMaterials.forEach((mat: any) => {
        mat.opacity = 0.3;
      });
      if (onComplete) onComplete();
    }
  }

  animate();

  return () => {
    cancelAnimationFrame(animationId);
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
    const targetOpacity = showLayerLabels ? 1 : 0;
    mat.opacity = highlightedNeuronId ? (showLayerLabels ? 1 : 0.3) : targetOpacity;
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

export { LAYER_COLORS };
