export interface LayerConfig {
  name: string;
  type: 'input' | 'hidden' | 'output';
  neurons: number;
  activation: string;
}

export interface Connection {
  from: number;
  to: number;
  weight?: number;
}

export interface ModelConfig {
  layers: LayerConfig[];
  connections?: Connection[][];
}

export interface Layer {
  id: string;
  name: string;
  type: 'input' | 'hidden' | 'output';
  neurons: number;
  activation: string;
  index: number;
}

export interface WeightConnection {
  fromLayer: number;
  toLayer: number;
  fromNeuron: number;
  toNeuron: number;
  weight: number;
}

export interface VisualizationData {
  modelId?: string;
  name?: string;
  layers: Layer[];
  connectionMatrix: WeightConnection[][][];
  totalNeurons: number;
  totalConnections: number;
}

export interface NeuronData {
  id: string;
  layerId: string;
  layerName: string;
  layerType: 'input' | 'hidden' | 'output';
  neuronIndex: number;
  position: { x: number; y: number; z: number };
  radius: number;
  inputWeights?: number[];
  outputWeights?: number[];
}

export interface ConnectionLine {
  id: string;
  fromNeuronId: string;
  toNeuronId: string;
  fromLayerIndex: number;
  toLayerIndex: number;
  weight: number;
  weightNormalized: number;
}

export interface SavedModel {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface HighlightState {
  neuronId: string | null;
  connectionIds: Set<string>;
}
