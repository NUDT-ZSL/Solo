export type ElementType =
  | 'grass'
  | 'dirt'
  | 'sand'
  | 'water'
  | 'rock'
  | 'tree'
  | 'building'
  | 'start'
  | 'end';

export interface ElementProperties {
  opacity?: number;
  rotation?: number;
}

export interface GridElement {
  id: string;
  type: ElementType;
  gridX: number;
  gridY: number;
  properties: ElementProperties;
  placedAt: number;
}

export type ToolMode = 'place' | 'pan' | 'select';

export interface EditorStateShape {
  gridSize: number;
  cellSize: number;
  elements: GridElement[];
  selectedElementId: string | null;
  selectedTool: ElementType | null;
  toolMode: ToolMode;
  zoom: number;
  panX: number;
  panY: number;
  showCollisionLayer: boolean;
  animatingCells: { key: string; startTime: number; type: 'place' | 'delete' }[];
}

export type Action =
  | { type: 'SELECT_TOOL'; payload: ElementType | null }
  | { type: 'SET_TOOL_MODE'; payload: ToolMode }
  | { type: 'PLACE_ELEMENT'; payload: GridElement }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'DELETE_ELEMENT_AT'; payload: { gridX: number; gridY: number } }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'ROTATE_ELEMENT'; payload: { id: string; degrees: number } }
  | { type: 'UPDATE_ELEMENT_PROPERTIES'; payload: { id: string; properties: Partial<ElementProperties> } }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'ADJUST_PAN'; payload: { dx: number; dy: number } }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'TOGGLE_COLLISION_LAYER' }
  | { type: 'ADD_ANIMATING_CELL'; payload: { key: string; type: 'place' | 'delete' } }
  | { type: 'CLEAR_ANIMATING_CELLS' }
  | { type: 'REPLACE_STATE'; payload: Partial<EditorStateShape> }
  | { type: 'CLEAR_ALL' };

export const ELEMENT_COLORS: Record<ElementType, string> = {
  grass: '#4ade80',
  dirt: '#a16207',
  sand: '#fde68a',
  water: '#60a5fa',
  rock: '#78716c',
  tree: '#166534',
  building: '#92400e',
  start: '#22c55e',
  end: '#ef4444'
};

export const ELEMENT_LABELS: Record<ElementType, string> = {
  grass: '草地',
  dirt: '泥土',
  sand: '沙地',
  water: '水体',
  rock: '岩石',
  tree: '树木',
  building: '建筑物',
  start: '起点',
  end: '终点'
};

export const COLLIDABLE_TYPES: ElementType[] = ['water', 'rock', 'building'];

export const createInitialState = (
  gridSize: number = 20,
  cellSize: number = 60
): EditorStateShape => ({
  gridSize,
  cellSize,
  elements: [],
  selectedElementId: null,
  selectedTool: null,
  toolMode: 'place',
  zoom: 1,
  panX: 0,
  panY: 0,
  showCollisionLayer: true,
  animatingCells: []
});

const clampZoom = (z: number): number => Math.max(0.5, Math.min(3, z));

const cellKey = (x: number, y: number) => `${x},${y}`;

export const editorReducer = (
  state: EditorStateShape,
  action: Action
): EditorStateShape => {
  switch (action.type) {
    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.payload, selectedElementId: null };

    case 'SET_TOOL_MODE':
      return { ...state, toolMode: action.payload };

    case 'PLACE_ELEMENT': {
      const existing = state.elements.findIndex(
        e => e.gridX === action.payload.gridX && e.gridY === action.payload.gridY
      );
      let newElements = state.elements.slice();
      let removedId: string | null = null;
      if (existing >= 0) {
        removedId = newElements[existing].id;
        newElements.splice(existing, 1);
      }
      if (action.payload.type === 'start' || action.payload.type === 'end') {
        newElements = newElements.filter(e => e.type !== action.payload.type);
      }
      newElements.push(action.payload);
      const newAnimating = state.animatingCells.slice();
      if (removedId) {
        const removed = state.elements[existing];
        if (removed) {
          newAnimating.push({
            key: cellKey(removed.gridX, removed.gridY),
            startTime: performance.now(),
            type: 'delete'
          });
        }
      }
      newAnimating.push({
        key: cellKey(action.payload.gridX, action.payload.gridY),
        startTime: performance.now(),
        type: 'place'
      });
      return {
        ...state,
        elements: newElements,
        animatingCells: newAnimating
      };
    }

    case 'DELETE_ELEMENT': {
      const target = state.elements.find(e => e.id === action.payload);
      const filtered = state.elements.filter(e => e.id !== action.payload);
      const newAnimating = state.animatingCells.slice();
      if (target) {
        newAnimating.push({
          key: cellKey(target.gridX, target.gridY),
          startTime: performance.now(),
          type: 'delete'
        });
      }
      return {
        ...state,
        elements: filtered,
        selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId,
        animatingCells: newAnimating
      };
    }

    case 'DELETE_ELEMENT_AT': {
      const target = state.elements.find(
        e => e.gridX === action.payload.gridX && e.gridY === action.payload.gridY
      );
      if (!target) return state;
      const filtered = state.elements.filter(e => e.id !== target.id);
      const newAnimating = state.animatingCells.slice();
      newAnimating.push({
        key: cellKey(target.gridX, target.gridY),
        startTime: performance.now(),
        type: 'delete'
      });
      return {
        ...state,
        elements: filtered,
        selectedElementId: state.selectedElementId === target.id ? null : state.selectedElementId,
        animatingCells: newAnimating
      };
    }

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload };

    case 'ROTATE_ELEMENT': {
      const newElements = state.elements.map(e => {
        if (e.id !== action.payload.id) return e;
        const current = e.properties.rotation || 0;
        return {
          ...e,
          properties: { ...e.properties, rotation: (current + action.payload.degrees) % 360 }
        };
      });
      return { ...state, elements: newElements };
    }

    case 'UPDATE_ELEMENT_PROPERTIES': {
      const newElements = state.elements.map(e => {
        if (e.id !== action.payload.id) return e;
        return {
          ...e,
          properties: { ...e.properties, ...action.payload.properties }
        };
      });
      return { ...state, elements: newElements };
    }

    case 'SET_ZOOM':
      return { ...state, zoom: clampZoom(action.payload) };

    case 'ADJUST_PAN':
      return {
        ...state,
        panX: state.panX + action.payload.dx,
        panY: state.panY + action.payload.dy
      };

    case 'SET_PAN':
      return { ...state, panX: action.payload.x, panY: action.payload.y };

    case 'TOGGLE_COLLISION_LAYER':
      return { ...state, showCollisionLayer: !state.showCollisionLayer };

    case 'ADD_ANIMATING_CELL':
      return {
        ...state,
        animatingCells: [
          ...state.animatingCells,
          { key: action.payload.key, startTime: performance.now(), type: action.payload.type }
        ]
      };

    case 'CLEAR_ANIMATING_CELLS': {
      const now = performance.now();
      return {
        ...state,
        animatingCells: state.animatingCells.filter(a => now - a.startTime < 250)
      };
    }

    case 'REPLACE_STATE':
      return { ...state, ...action.payload };

    case 'CLEAR_ALL':
      return {
        ...state,
        elements: [],
        selectedElementId: null,
        animatingCells: []
      };

    default:
      return state;
  }
};
