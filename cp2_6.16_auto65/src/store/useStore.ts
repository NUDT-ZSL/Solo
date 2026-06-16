import { create } from 'zustand';
import {
  SculptureNode,
  Connection,
  Template,
  ColorScheme,
  FrequencyData,
  TemplateTransition,
  TransitionState,
  MAX_NODES,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  nodes: SculptureNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  selectedColor: string;
  connectionOpacity: number;
  templates: Template[];
  colorSchemes: ColorScheme[];
  frequencyData: FrequencyData;
  isPlaying: boolean;
  audioProgress: number;
  audioDuration: number;
  transitionState: TransitionState;
  transition: TemplateTransition | null;
  panelOpen: boolean;
  isDraggingNode: boolean;
  shiftHeld: boolean;

  addNode: (position: { x: number; y: number; z: number }) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number; z: number }) => void;
  updateNodeSize: (id: string, size: number) => void;
  updateNodeColor: (id: string, color: string) => void;
  selectNode: (id: string | null) => void;
  setSelectedColor: (color: string) => void;
  setConnectionOpacity: (opacity: number) => void;
  updateConnectionStrength: (fromId: string, toId: string, strength: number) => void;
  setFrequencyData: (data: FrequencyData) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudioProgress: (progress: number) => void;
  setAudioDuration: (duration: number) => void;
  loadTemplate: (template: Template) => void;
  startTransition: (transition: TemplateTransition) => void;
  endTransition: () => void;
  applyTransitionFrame: (nodes: SculptureNode[], connections: Connection[]) => void;
  setTemplates: (templates: Template[]) => void;
  addTemplate: (template: Template) => void;
  removeTemplate: (id: string) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setIsDraggingNode: (dragging: boolean) => void;
  setShiftHeld: (held: boolean) => void;
  setNodes: (nodes: SculptureNode[]) => void;
  setConnections: (connections: Connection[]) => void;
  resetSculpture: () => void;
}

const createDefaultNode = (position: { x: number; y: number; z: number }): SculptureNode => ({
  id: uuidv4(),
  position: { ...position },
  restPosition: { ...position },
  size: 1,
  color: '#6c63ff',
  emissiveIntensity: 2,
  velocity: { x: 0, y: 0, z: 0 },
});

export const useStore = create<AppState>((set, get) => ({
  nodes: [],
  connections: [],
  selectedNodeId: null,
  selectedColor: '#6c63ff',
  connectionOpacity: 0.5,
  templates: [],
  colorSchemes: [
    { id: 'nebula', name: '星云', colors: ['#6c63ff', '#ff6b9d', '#00d4ff', '#ff9a56', '#a855f7'] },
    { id: 'crystal', name: '晶体', colors: ['#00ffcc', '#0088ff', '#ffffff', '#66ffdd', '#0044aa'] },
    { id: 'coral', name: '珊瑚', colors: ['#ff6b6b', '#ffa07a', '#ff4757', '#ff7675', '#e17055'] },
    { id: 'em', name: '电磁', colors: ['#00ff88', '#ffff00', '#ff00ff', '#00ffff', '#88ff00'] },
    { id: 'petal', name: '花瓣', colors: ['#ff69b4', '#ffb6c1', '#dda0dd', '#ff1493', '#c71585'] },
    { id: 'jelly', name: '水母', colors: ['#00bfff', '#1e90ff', '#00ced1', '#48d1cc', '#7fffd4'] },
  ],
  frequencyData: { low: 0, mid: 0, high: 0 },
  isPlaying: false,
  audioProgress: 0,
  audioDuration: 0,
  transitionState: 'idle',
  transition: null,
  panelOpen: true,
  isDraggingNode: false,
  shiftHeld: false,

  addNode: (position) => {
    const { nodes, connections } = get();
    if (nodes.length >= MAX_NODES) return;
    const newNode = createDefaultNode(position);
    const newConnections: Connection[] = [];
    if (nodes.length > 0) {
      const nearestNodes = [...nodes]
        .sort((a, b) => {
          const da = Math.hypot(a.position.x - position.x, a.position.y - position.y, a.position.z - position.z);
          const db = Math.hypot(b.position.x - position.x, b.position.y - position.y, b.position.z - position.z);
          return da - db;
        })
        .slice(0, 3);
      for (const n of nearestNodes) {
        const dist = Math.hypot(
          n.position.x - position.x,
          n.position.y - position.y,
          n.position.z - position.z
        );
        newConnections.push({
          fromId: n.id,
          toId: newNode.id,
          strength: 0.5,
          opacity: 0.5,
          restLength: dist,
        });
      }
    }
    set({
      nodes: [...nodes, newNode],
      connections: [...connections, ...newConnections],
    });
  },

  removeNode: (id) => {
    const { nodes, connections } = get();
    set({
      nodes: nodes.filter((n) => n.id !== id),
      connections: connections.filter((c) => c.fromId !== id && c.toId !== id),
    });
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position: { ...position } } : n
      ),
    }));
  },

  updateNodeSize: (id, size) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, size } : n
      ),
    }));
  },

  updateNodeColor: (id, color) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, color } : n
      ),
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  setSelectedColor: (color) => {
    const { selectedNodeId, nodes } = get();
    if (selectedNodeId) {
      set({
        selectedColor: color,
        nodes: nodes.map((n) =>
          n.id === selectedNodeId ? { ...n, color } : n
        ),
      });
    } else {
      set({ selectedColor: color });
    }
  },
  setConnectionOpacity: (opacity) => set({ connectionOpacity: opacity }),

  updateConnectionStrength: (fromId, toId, strength) => {
    set((state) => ({
      connections: state.connections.map((c) =>
        (c.fromId === fromId && c.toId === toId) ||
        (c.fromId === toId && c.toId === fromId)
          ? { ...c, strength }
          : c
      ),
    }));
  },

  setFrequencyData: (data) => set({ frequencyData: data }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAudioProgress: (progress) => set({ audioProgress: progress }),
  setAudioDuration: (duration) => set({ audioDuration: duration }),

  loadTemplate: (template) => {
    const nodes = template.sculpture.nodes.map((n) => ({
      ...n,
      velocity: { x: 0, y: 0, z: 0 },
      restPosition: { ...n.position },
    }));
    const connections = template.sculpture.connections.map((c) => ({ ...c }));
    set({ nodes, connections });
  },

  startTransition: (transition) => {
    set({ transitionState: 'transitioning', transition });
  },

  endTransition: () => {
    set({ transitionState: 'idle', transition: null });
  },

  applyTransitionFrame: (nodes, connections) => {
    set({ nodes, connections });
  },

  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) =>
    set((state) => ({ templates: [...state.templates, template] })),
  removeTemplate: (id) =>
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setIsDraggingNode: (dragging) => set({ isDraggingNode: dragging }),
  setShiftHeld: (held) => set({ shiftHeld: held }),
  setNodes: (nodes) => set({ nodes }),
  setConnections: (connections) => set({ connections }),
  resetSculpture: () => set({ nodes: [], connections: [], selectedNodeId: null }),
}));
