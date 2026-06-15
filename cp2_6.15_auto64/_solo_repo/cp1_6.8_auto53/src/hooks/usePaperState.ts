import { useState, useCallback, useRef } from 'react';
import { PaperModule, PaperConnection, ToolType, ModuleType } from '../PaperEngine';

interface StateSnapshot {
  modules: PaperModule[];
  connections: PaperConnection[];
}

let nextModuleId = 1;
let nextConnectionId = 1;

const generateModuleId = () => `mod_${nextModuleId++}`;
const generateConnectionId = (fromId: string, toId: string) => `${fromId}::${toId}`;

export function usePaperState() {
  const [modules, setModules] = useState<PaperModule[]>([]);
  const [connections, setConnections] = useState<PaperConnection[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('select');

  const undoStack = useRef<StateSnapshot[]>([]);
  const redoStack = useRef<StateSnapshot[]>([]);

  const pushUndo = useCallback(() => {
    undoStack.current.push({
      modules: JSON.parse(JSON.stringify(modules)),
      connections: JSON.parse(JSON.stringify(connections)),
    });
    if (undoStack.current.length > 50) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, [modules, connections]);

  const addModule = useCallback(
    (partial: { type: ModuleType; x: number; y: number; angle: number; scale: number }) => {
      pushUndo();
      const mod: PaperModule = {
        id: generateModuleId(),
        type: partial.type,
        x: partial.x,
        y: partial.y,
        angle: partial.angle,
        scale: partial.scale,
      };
      setModules((prev) => [...prev, mod]);
    },
    [pushUndo]
  );

  const removeModule = useCallback(
    (id: string) => {
      pushUndo();
      setModules((prev) => prev.filter((m) => m.id !== id));
      setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
      setSelectedModuleId((prev) => (prev === id ? null : prev));
    },
    [pushUndo]
  );

  const updateModule = useCallback(
    (id: string, updates: Partial<PaperModule>) => {
      setModules((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const addConnection = useCallback(
    (fromId: string, toId: string) => {
      const exists = connections.some(
        (c) =>
          (c.fromId === fromId && c.toId === toId) ||
          (c.fromId === toId && c.toId === fromId)
      );
      if (exists || fromId === toId) return;

      pushUndo();
      const conn: PaperConnection = {
        id: generateConnectionId(fromId, toId),
        fromId,
        toId,
      };
      setConnections((prev) => [...prev, conn]);
    },
    [connections, pushUndo]
  );

  const removeConnection = useCallback(
    (id: string) => {
      pushUndo();
      setConnections((prev) => prev.filter((c) => c.id !== id));
    },
    [pushUndo]
  );

  const selectModule = useCallback((id: string | null) => {
    setSelectedModuleId(id);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const current: StateSnapshot = {
      modules: JSON.parse(JSON.stringify(modules)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
    redoStack.current.push(current);

    const prev = undoStack.current.pop()!;
    setModules(prev.modules);
    setConnections(prev.connections);
    setSelectedModuleId(null);
  }, [modules, connections]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const current: StateSnapshot = {
      modules: JSON.parse(JSON.stringify(modules)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
    undoStack.current.push(current);

    const next = redoStack.current.pop()!;
    setModules(next.modules);
    setConnections(next.connections);
    setSelectedModuleId(null);
  }, [modules, connections]);

  return {
    modules,
    connections,
    selectedModuleId,
    activeTool,
    addModule,
    removeModule,
    updateModule,
    addConnection,
    removeConnection,
    selectModule,
    setActiveTool,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
