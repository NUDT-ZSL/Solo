import EventEmitter from 'eventemitter3';

export const eventBus = new EventEmitter();

export type NodeAddPayload = { type: import('../types').NodeType; x: number; y: number };
export type NodeRemovePayload = { id: string };
export type NodeMovePayload = { id: string; x: number; y: number };
export type NodeUpdatePayload = { id: string; changes: Partial<import('../types').DialogueNode> };
export type NodeSelectPayload = { id: string | null };
export type ConnectionAddPayload = { fromId: string; toId: string; fromPort: number };
export type ConnectionRemovePayload = { id: string };
export type SimulationChoosePayload = { connectionId: string };
export type SimulationPathPayload = {
  visitedNodeIds: string[];
  visitedConnectionIds: string[];
  currentNodeId: string | null;
};
export type TreeImportPayload = import('../types').ExportData;
export type TreeExportPayload = void;

export interface EditorEvents {
  'node:add': NodeAddPayload;
  'node:remove': NodeRemovePayload;
  'node:move': NodeMovePayload;
  'node:update': NodeUpdatePayload;
  'node:select': NodeSelectPayload;
  'connection:add': ConnectionAddPayload;
  'connection:remove': ConnectionRemovePayload;
  'simulation:start': void;
  'simulation:choose': SimulationChoosePayload;
  'simulation:stop': void;
  'simulation:path': SimulationPathPayload;
  'tree:export': TreeExportPayload;
  'tree:import': TreeImportPayload;
  'tree:reset': void;
  'canvas:drop': { clientX: number; clientY: number; type: import('../types').NodeType };
  'connection:start-drag': { fromId: string; fromPort: number; clientX: number; clientY: number };
  'connection:drag': { clientX: number; clientY: number };
  'connection:end-drag': { toId: string | null; clientX: number; clientY: number };
}

export type EditorEventType = keyof EditorEvents;
