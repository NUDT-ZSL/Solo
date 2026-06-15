export type NodeType = 'dialogue' | 'choice' | 'condition' | 'jump' | 'end';

export interface DialogueNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  text: string;
  characterName: string;
  condition: string;
  optionTexts: string[];
  jumpTargetId: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  fromPort: number;
}

export interface SimulationState {
  currentNodeId: string | null;
  visitedNodeIds: string[];
  visitedConnectionIds: string[];
  isRunning: boolean;
}

export interface ExportData {
  nodes: DialogueNode[];
  connections: Connection[];
  version: string;
  exportedAt: string;
}

export const NODE_DEFS: { type: NodeType; label: string; icon: string; color: string }[] = [
  { type: 'dialogue', label: '对话节点', icon: '💬', color: '#ff7849' },
  { type: 'choice', label: '选项节点', icon: '🔀', color: '#ffb347' },
  { type: 'condition', label: '条件分支', icon: '⚙️', color: '#00ffc8' },
  { type: 'jump', label: '跳转节点', icon: '↪️', color: '#2196f3' },
  { type: 'end', label: '结束节点', icon: '⏹️', color: '#ff4444' },
];

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 100;
export const GRID_SIZE = 40;
export const PANEL_LEFT_WIDTH = 220;
export const PANEL_RIGHT_WIDTH = 280;
export const HEADER_HEIGHT = 56;
export const SIM_BAR_HEIGHT = 48;

export function getNodePortCount(type: NodeType): number {
  switch (type) {
    case 'dialogue': return 1;
    case 'choice': return 4;
    case 'condition': return 2;
    case 'jump': return 1;
    case 'end': return 0;
  }
}

export function getNodeTypeColor(type: NodeType): string {
  const def = NODE_DEFS.find(d => d.type === type);
  return def ? def.color : '#ff7849';
}

export function getNodeTypeLabel(type: NodeType): string {
  const def = NODE_DEFS.find(d => d.type === type);
  return def ? def.label : type;
}

export function generateId(): string {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

export function createDefaultNode(type: NodeType, x: number, y: number): DialogueNode {
  return {
    id: generateId(),
    type,
    x,
    y,
    text: type === 'end' ? '对话结束' : type === 'dialogue' ? '输入对话文本...' : '',
    characterName: '',
    condition: '',
    optionTexts: type === 'choice' ? ['选项 1', '选项 2', '', ''] : type === 'condition' ? ['满足条件', '不满足'] : [''],
    jumpTargetId: '',
  };
}
