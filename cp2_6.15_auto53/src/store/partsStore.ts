import { create } from 'zustand';
import * as THREE from 'three';

export type PartType = 'tenon' | 'mortise' | 'dovetail_tenon' | 'dovetail_mortise' | 'l_tenon' | 'l_mortise';

export type MaterialType = 'oak' | 'walnut' | 'cherry' | 'maple';

export interface Part {
  id: string;
  type: PartType;
  name: string;
  material: MaterialType;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  isSelected: boolean;
  isDragging: boolean;
  connectedTo: string[];
  connectionOrder: number;
  dimensions: { width: number; height: number; depth: number };
  interfacePoint: THREE.Vector3;
  interfaceNormal: THREE.Vector3;
}

export interface Connection {
  id: string;
  partAId: string;
  partBId: string;
  isActive: boolean;
  timestamp: number;
}

interface PartsState {
  parts: Part[];
  connections: Connection[];
  selectedPartId: string | null;
  hoveredConnection: { partAId: string; partBId: string } | null;
  isAnimating: boolean;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;

  addPart: (type: PartType, position?: THREE.Vector3) => string;
  removePart: (id: string) => void;
  updatePart: (id: string, updates: Partial<Part>) => void;
  selectPart: (id: string | null) => void;
  setPartPosition: (id: string, position: THREE.Vector3) => void;
  setPartRotation: (id: string, rotation: THREE.Euler) => void;
  rotatePartBy: (id: string, angleY: number) => void;
  startDrag: (id: string) => void;
  endDrag: (id: string) => void;
  duplicatePart: (id: string) => string;
  addConnection: (partAId: string, partBId: string) => void;
  removeConnection: (connectionId: string) => void;
  removeConnectionsForPart: (partId: string) => void;
  setHoveredConnection: (conn: { partAId: string; partBId: string } | null) => void;
  setIsAnimating: (value: boolean) => void;
  setCameraPosition: (pos: THREE.Vector3) => void;
  setCameraTarget: (target: THREE.Vector3) => void;
  resetCamera: () => void;
  disassembleAll: () => void;
  disassemblePart: (partId: string) => void;
  resetAll: () => void;
}

let partCounter = 0;
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${partCounter++}`;

export const PART_DEFINITIONS: Record<PartType, { name: string; dimensions: { width: number; height: number; depth: number } }> = {
  tenon: { name: '直榫头', dimensions: { width: 2, height: 0.6, depth: 1.2 } },
  mortise: { name: '直卯眼', dimensions: { width: 2, height: 1.2, depth: 1.2 } },
  dovetail_tenon: { name: '燕尾榫头', dimensions: { width: 2, height: 0.6, depth: 1.2 } },
  dovetail_mortise: { name: '燕尾卯眼', dimensions: { width: 2, height: 1.2, depth: 1.2 } },
  l_tenon: { name: 'L型榫头', dimensions: { width: 1.8, height: 0.6, depth: 1.8 } },
  l_mortise: { name: 'L型卯眼', dimensions: { width: 1.8, height: 1.2, depth: 1.8 } },
};

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  oak: '#c8a876',
  walnut: '#6b4423',
  cherry: '#a0522d',
  maple: '#f0d8a8',
};

const DEFAULT_CAMERA_POS = new THREE.Vector3(8, 8, 8);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

export const usePartsStore = create<PartsState>((set, get) => ({
  parts: [],
  connections: [],
  selectedPartId: null,
  hoveredConnection: null,
  isAnimating: false,
  cameraPosition: DEFAULT_CAMERA_POS.clone(),
  cameraTarget: DEFAULT_CAMERA_TARGET.clone(),

  addPart: (type, position) => {
    const def = PART_DEFINITIONS[type];
    const id = generateId('part');
    const isTenon = type.includes('tenon');
    const ifaceZ = isTenon ? def.dimensions.depth / 2 : -def.dimensions.depth / 2;
    const newPart: Part = {
      id,
      type,
      name: def.name,
      material: 'oak',
      position: position ? position.clone() : new THREE.Vector3(0, def.dimensions.height / 2, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      isSelected: false,
      isDragging: false,
      connectedTo: [],
      connectionOrder: 0,
      dimensions: { ...def.dimensions },
      interfacePoint: new THREE.Vector3(0, 0, ifaceZ),
      interfaceNormal: new THREE.Vector3(0, 0, isTenon ? 1 : -1),
    };
    set((state) => ({
      parts: [...state.parts, newPart],
      selectedPartId: id,
    }));
    return id;
  },

  removePart: (id) => {
    const state = get();
    const part = state.parts.find(p => p.id === id);
    if (!part) return;
    const relatedConns = state.connections.filter(
      c => c.partAId === id || c.partBId === id
    );
    const remainingConns = state.connections.filter(
      c => c.partAId !== id && c.partBId !== id
    );
    const updatedParts = state.parts
      .filter(p => p.id !== id)
      .map(p => {
        if (relatedConns.some(c => c.partAId === p.id || c.partBId === p.id)) {
          return { ...p, connectedTo: p.connectedTo.filter(cid => cid !== id) };
        }
        return p;
      });
    set({
      parts: updatedParts,
      connections: remainingConns,
      selectedPartId: state.selectedPartId === id ? null : state.selectedPartId,
    });
  },

  updatePart: (id, updates) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  },

  selectPart: (id) => {
    set((state) => ({
      parts: state.parts.map(p => ({ ...p, isSelected: p.id === id })),
      selectedPartId: id,
    }));
  },

  setPartPosition: (id, position) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === id ? { ...p, position: position.clone() } : p),
    }));
  },

  setPartRotation: (id, rotation) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === id ? { ...p, rotation: rotation.clone() } : p),
    }));
  },

  rotatePartBy: (id, angleY) => {
    set((state) => ({
      parts: state.parts.map(p => {
        if (p.id !== id) return p;
        const newRot = new THREE.Euler(p.rotation.x, p.rotation.y + angleY, p.rotation.z);
        return { ...p, rotation: newRot };
      }),
    }));
  },

  startDrag: (id) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === id ? { ...p, isDragging: true } : p),
    }));
  },

  endDrag: (id) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === id ? { ...p, isDragging: false } : p),
    }));
  },

  duplicatePart: (id) => {
    const state = get();
    const original = state.parts.find(p => p.id === id);
    if (!original) return '';
    const newId = generateId('part');
    const newPart: Part = {
      ...original,
      id: newId,
      position: new THREE.Vector3(
        original.position.x + 1,
        original.position.y,
        original.position.z + 1
      ),
      connectedTo: [],
      connectionOrder: 0,
      isSelected: true,
      isDragging: false,
    };
    set((state) => ({
      parts: [
        ...state.parts.map(p => ({ ...p, isSelected: false })),
        newPart,
      ],
      selectedPartId: newId,
    }));
    return newId;
  },

  addConnection: (partAId, partBId) => {
    const state = get();
    const exists = state.connections.some(
      c => (c.partAId === partAId && c.partBId === partBId) ||
           (c.partAId === partBId && c.partBId === partAId)
    );
    if (exists) return;
    const connId = generateId('conn');
    const order = state.connections.length + 1;
    set((state) => ({
      connections: [...state.connections, {
        id: connId,
        partAId,
        partBId,
        isActive: true,
        timestamp: Date.now(),
      }],
      parts: state.parts.map(p => {
        if (p.id === partAId) {
          return { ...p, connectedTo: [...p.connectedTo, partBId], connectionOrder: p.connectionOrder || order };
        }
        if (p.id === partBId) {
          return { ...p, connectedTo: [...p.connectedTo, partAId], connectionOrder: p.connectionOrder || order + 1 };
        }
        return p;
      }),
    }));
  },

  removeConnection: (connectionId) => {
    const state = get();
    const conn = state.connections.find(c => c.id === connectionId);
    if (!conn) return;
    set((state) => ({
      connections: state.connections.filter(c => c.id !== connectionId),
      parts: state.parts.map(p => {
        if (p.id === conn.partAId) return { ...p, connectedTo: p.connectedTo.filter(id => id !== conn.partBId) };
        if (p.id === conn.partBId) return { ...p, connectedTo: p.connectedTo.filter(id => id !== conn.partAId) };
        return p;
      }),
    }));
  },

  removeConnectionsForPart: (partId) => {
    const state = get();
    const connsToRemove = state.connections.filter(
      c => c.partAId === partId || c.partBId === partId
    );
    if (connsToRemove.length === 0) return;
    const otherPartIds = new Set<string>();
    connsToRemove.forEach(c => {
      if (c.partAId !== partId) otherPartIds.add(c.partAId);
      if (c.partBId !== partId) otherPartIds.add(c.partBId);
    });
    set((state) => ({
      connections: state.connections.filter(
        c => c.partAId !== partId && c.partBId !== partId
      ),
      parts: state.parts.map(p => {
        if (p.id === partId) return { ...p, connectedTo: [] };
        if (otherPartIds.has(p.id)) {
          return { ...p, connectedTo: p.connectedTo.filter(id => id !== partId) };
        }
        return p;
      }),
    }));
  },

  setHoveredConnection: (conn) => set({ hoveredConnection: conn }),

  setIsAnimating: (value) => set({ isAnimating: value }),

  setCameraPosition: (pos) => set({ cameraPosition: pos.clone() }),
  setCameraTarget: (target) => set({ cameraTarget: target.clone() }),

  resetCamera: () => {
    set({
      cameraPosition: DEFAULT_CAMERA_POS.clone(),
      cameraTarget: DEFAULT_CAMERA_TARGET.clone(),
    });
  },

  disassembleAll: () => {
    const state = get();
    set({
      connections: [],
      parts: state.parts.map(p => ({
        ...p,
        connectedTo: [],
        connectionOrder: 0,
      })),
    });
  },

  disassemblePart: (partId) => {
    get().removeConnectionsForPart(partId);
  },

  resetAll: () => {
    set({
      parts: [],
      connections: [],
      selectedPartId: null,
      hoveredConnection: null,
      isAnimating: false,
      cameraPosition: DEFAULT_CAMERA_POS.clone(),
      cameraTarget: DEFAULT_CAMERA_TARGET.clone(),
    });
  },
}));
