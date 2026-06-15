import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import { PixelEditorState, Action, Project, CLASSIC_PALETTE, RGB, Layer, Frame } from './types';
import { createEmptyPixels, deepCopyPixels, floodFill } from './utils/canvasUtils';
import { generateId } from './utils/colorUtils';

const DEFAULT_STATE: PixelEditorState = {
  project: {
    width: 32,
    height: 32,
    frames: [],
    currentFrameIndex: 0,
    currentLayerId: ''
  },
  tool: {
    currentTool: 'pencil',
    brushSize: 1
  },
  color: {
    palette: [...CLASSIC_PALETTE],
    currentColor: CLASSIC_PALETTE[14]
  },
  onionSkin: {
    enabled: true,
    frameCount: 2,
    opacity: 30
  },
  playback: {
    isPlaying: false,
    fps: 12
  },
  zoom: 16,
  offsetX: 0,
  offsetY: 0
};

function createLayer(name: string, width: number, height: number, opacity = 100, visible = true): Layer {
  return {
    id: generateId(),
    name,
    opacity,
    visible,
    pixels: createEmptyPixels(width, height)
  };
}

function createFrame(width: number, height: number, layers?: Layer[]): Frame {
  const frameLayers: Layer[] = layers && layers.length > 0
    ? layers.map(l => ({
        ...l,
        id: generateId(),
        pixels: deepCopyPixels(l.pixels)
      }))
    : [createLayer('线稿', width, height)];
  return {
    id: generateId(),
    layers: frameLayers
  };
}

function reducer(state: PixelEditorState, action: Action): PixelEditorState {
  switch (action.type) {
    case 'CREATE_PROJECT': {
      const { width, height } = action.payload;
      const firstFrame = createFrame(width, height);
      return {
        ...DEFAULT_STATE,
        project: {
          width,
          height,
          frames: [firstFrame],
          currentFrameIndex: 0,
          currentLayerId: firstFrame.layers[0].id
        },
        color: { ...state.color }
      };
    }

    case 'SET_TOOL':
      return { ...state, tool: { ...state.tool, currentTool: action.payload } };

    case 'SET_BRUSH_SIZE':
      return { ...state, tool: { ...state.tool, brushSize: action.payload } };

    case 'SET_COLOR':
      return { ...state, color: { ...state.color, currentColor: action.payload } };

    case 'ADD_PALETTE_COLOR':
      if (state.color.palette.some(c => c.r === action.payload.r && c.g === action.payload.g && c.b === action.payload.b)) {
        return state;
      }
      return {
        ...state,
        color: {
          ...state.color,
          palette: [...state.color.palette, action.payload].slice(0, 64)
        }
      };

    case 'SET_PIXEL': {
      const { x, y, color } = action.payload;
      const project = state.project;
      const frame = project.frames[project.currentFrameIndex];
      const layerIndex = frame.layers.findIndex(l => l.id === project.currentLayerId);
      if (layerIndex < 0) return state;
      if (x < 0 || x >= project.width || y < 0 || y >= project.height) return state;
      const newLayers = [...frame.layers];
      const newLayer = {
        ...newLayers[layerIndex],
        pixels: deepCopyPixels(newLayers[layerIndex].pixels)
      };
      newLayer.pixels[y][x] = color ? { ...color } : null;
      newLayers[layerIndex] = newLayer;
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex ? { ...f, layers: newLayers } : f
          )
        }
      };
    }

    case 'SET_PIXELS_BATCH': {
      const { pixels } = action.payload;
      const project = state.project;
      const frame = project.frames[project.currentFrameIndex];
      const layerIndex = frame.layers.findIndex(l => l.id === project.currentLayerId);
      if (layerIndex < 0) return state;
      const newLayers = [...frame.layers];
      const newLayer = {
        ...newLayers[layerIndex],
        pixels: deepCopyPixels(newLayers[layerIndex].pixels)
      };
      for (const { x, y, color } of pixels) {
        if (x >= 0 && x < project.width && y >= 0 && y < project.height) {
          newLayer.pixels[y][x] = color ? { ...color } : null;
        }
      }
      newLayers[layerIndex] = newLayer;
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex ? { ...f, layers: newLayers } : f
          )
        }
      };
    }

    case 'FILL_REGION': {
      const { x, y, color } = action.payload;
      const project = state.project;
      const frame = project.frames[project.currentFrameIndex];
      const layerIndex = frame.layers.findIndex(l => l.id === project.currentLayerId);
      if (layerIndex < 0) return state;
      const targetLayer = frame.layers[layerIndex];
      if (x < 0 || x >= project.width || y < 0 || y >= project.height) return state;
      const filledPixels = floodFill(targetLayer.pixels, x, y, color);
      const newLayers = [...frame.layers];
      newLayers[layerIndex] = { ...targetLayer, pixels: filledPixels };
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex ? { ...f, layers: newLayers } : f
          )
        }
      };
    }

    case 'ADD_FRAME': {
      const project = state.project;
      const lastFrame = project.frames[project.frames.length - 1];
      const newFrame = createFrame(project.width, project.height, lastFrame?.layers || []);
      return {
        ...state,
        project: {
          ...project,
          frames: [...project.frames, newFrame],
          currentFrameIndex: project.frames.length,
          currentLayerId: newFrame.layers[0].id
        }
      };
    }

    case 'DELETE_FRAME': {
      const index = action.payload;
      const project = state.project;
      if (project.frames.length <= 1) return state;
      const newFrames = project.frames.filter((_, i) => i !== index);
      const newIndex = Math.min(project.currentFrameIndex, newFrames.length - 1);
      return {
        ...state,
        project: {
          ...project,
          frames: newFrames,
          currentFrameIndex: Math.max(0, newIndex),
          currentLayerId: newFrames[Math.max(0, newIndex)].layers[0].id
        }
      };
    }

    case 'DUPLICATE_FRAME': {
      const index = action.payload;
      const project = state.project;
      const sourceFrame = project.frames[index];
      if (!sourceFrame) return state;
      const newFrame = createFrame(project.width, project.height, sourceFrame.layers);
      const newFrames = [
        ...project.frames.slice(0, index + 1),
        newFrame,
        ...project.frames.slice(index + 1)
      ];
      return {
        ...state,
        project: {
          ...project,
          frames: newFrames,
          currentFrameIndex: index + 1,
          currentLayerId: newFrame.layers[0].id
        }
      };
    }

    case 'MOVE_FRAME': {
      const { from, to } = action.payload;
      const project = state.project;
      if (from === to) return state;
      const newFrames = [...project.frames];
      const [removed] = newFrames.splice(from, 1);
      newFrames.splice(to, 0, removed);
      return { ...state, project: { ...project, frames: newFrames } };
    }

    case 'SET_CURRENT_FRAME': {
      const index = action.payload;
      const project = state.project;
      if (index < 0 || index >= project.frames.length) return state;
      return {
        ...state,
        project: {
          ...project,
          currentFrameIndex: index,
          currentLayerId: project.frames[index].layers[0]?.id || ''
        }
      };
    }

    case 'ADD_LAYER': {
      const project = state.project;
      const frame = project.frames[project.currentFrameIndex];
      if (frame.layers.length >= 8) return state;
      const newLayer = createLayer(`图层 ${frame.layers.length + 1}`, project.width, project.height);
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex
              ? { ...f, layers: [...f.layers, newLayer] }
              : f
          ),
          currentLayerId: newLayer.id
        }
      };
    }

    case 'DELETE_LAYER': {
      const layerId = action.payload;
      const project = state.project;
      const frame = project.frames[project.currentFrameIndex];
      if (frame.layers.length <= 1) return state;
      const newLayers = frame.layers.filter(l => l.id !== layerId);
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex ? { ...f, layers: newLayers } : f
          ),
          currentLayerId: newLayers[0].id
        }
      };
    }

    case 'SET_CURRENT_LAYER': {
      return {
        ...state,
        project: { ...state.project, currentLayerId: action.payload }
      };
    }

    case 'SET_LAYER_NAME': {
      const { id, name } = action.payload;
      const project = state.project;
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex
              ? { ...f, layers: f.layers.map(l => (l.id === id ? { ...l, name } : l)) }
              : f
          )
        }
      };
    }

    case 'SET_LAYER_OPACITY': {
      const { id, opacity } = action.payload;
      const project = state.project;
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex
              ? { ...f, layers: f.layers.map(l => (l.id === id ? { ...l, opacity } : l)) }
              : f
          )
        }
      };
    }

    case 'SET_LAYER_VISIBLE': {
      const { id, visible } = action.payload;
      const project = state.project;
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex
              ? { ...f, layers: f.layers.map(l => (l.id === id ? { ...l, visible } : l)) }
              : f
          )
        }
      };
    }

    case 'MOVE_LAYER': {
      const { from, to } = action.payload;
      const project = state.project;
      if (from === to) return state;
      const frame = project.frames[project.currentFrameIndex];
      const newLayers = [...frame.layers];
      const [removed] = newLayers.splice(from, 1);
      newLayers.splice(to, 0, removed);
      return {
        ...state,
        project: {
          ...project,
          frames: project.frames.map((f, i) =>
            i === project.currentFrameIndex ? { ...f, layers: newLayers } : f
          )
        }
      };
    }

    case 'SET_ZOOM': {
      const z = Math.max(4, Math.min(32, action.payload));
      return { ...state, zoom: z };
    }

    case 'SET_OFFSET':
      return { ...state, offsetX: action.payload.x, offsetY: action.payload.y };

    case 'SET_ONION_SKIN_ENABLED':
      return { ...state, onionSkin: { ...state.onionSkin, enabled: action.payload } };

    case 'SET_ONION_SKIN_FRAME_COUNT':
      return {
        ...state,
        onionSkin: {
          ...state.onionSkin,
          frameCount: Math.max(1, Math.min(5, action.payload))
        }
      };

    case 'SET_ONION_SKIN_OPACITY':
      return {
        ...state,
        onionSkin: {
          ...state.onionSkin,
          opacity: Math.max(10, Math.min(50, action.payload))
        }
      };

    case 'SET_PLAYING':
      return { ...state, playback: { ...state.playback, isPlaying: action.payload } };

    case 'SET_FPS':
      return {
        ...state,
        playback: {
          ...state.playback,
          fps: Math.max(4, Math.min(24, action.payload))
        }
      };

    case 'ADVANCE_FRAME': {
      const project = state.project;
      const nextIndex = (project.currentFrameIndex + 1) % project.frames.length;
      return {
        ...state,
        project: {
          ...project,
          currentFrameIndex: nextIndex
        }
      };
    }

    default:
      return state;
  }
}

const PixelContext = createContext<{
  state: PixelEditorState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function PixelProvider({ children, initialWidth = 32, initialHeight = 32 }: {
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
}) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      dispatch({ type: 'CREATE_PROJECT', payload: { width: initialWidth, height: initialHeight } });
    }
  }, [initialWidth, initialHeight]);

  return (
    <PixelContext.Provider value={{ state, dispatch }}>
      {children}
    </PixelContext.Provider>
  );
}

export function usePixelState() {
  const ctx = useContext(PixelContext);
  if (!ctx) throw new Error('usePixelState must be used within PixelProvider');
  return ctx;
}

export { reducer, DEFAULT_STATE, createLayer, createFrame };
