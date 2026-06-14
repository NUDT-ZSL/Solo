import type { DialogueNode, Connection, SimulationState } from '../types';
import { getNodePortCount } from '../types';
import { eventBus } from './eventBus';

export function getOutgoingConnections(nodeId: string, connections: Connection[]): Connection[] {
  return connections.filter(c => c.fromId === nodeId).sort((a, b) => a.fromPort - b.fromPort);
}

export function evaluateCondition(condition: string, context: Record<string, unknown> = {}): boolean {
  if (!condition || !condition.trim()) return true;
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return (${condition});`);
    const result = fn(...values);
    return Boolean(result);
  } catch {
    return true;
  }
}

export function getAvailableOptions(
  node: DialogueNode | undefined,
  connections: Connection[],
  context: Record<string, unknown> = {}
): Array<{ text: string; connectionId: string; enabled: boolean }> {
  if (!node) return [];
  const outConns = getOutgoingConnections(node.id, connections);
  const portCount = getNodePortCount(node.type);
  const options: Array<{ text: string; connectionId: string; enabled: boolean }> = [];

  for (let port = 0; port < portCount; port++) {
    const conn = outConns.find(c => c.fromPort === port);
    if (!conn) continue;
    let text = node.optionTexts[port] || '';
    let enabled = true;

    if (node.type === 'condition') {
      text = port === 0 ? (node.optionTexts[0] || '满足条件') : (node.optionTexts[1] || '不满足');
      if (port === 0) {
        enabled = evaluateCondition(node.condition, context);
      } else {
        enabled = !evaluateCondition(node.condition, context);
      }
    } else if (node.type === 'choice') {
      text = node.optionTexts[port] || `选项 ${port + 1}`;
    } else if (node.type === 'dialogue') {
      text = '继续';
    } else if (node.type === 'jump') {
      text = '跳转';
    }
    options.push({ text, connectionId: conn.id, enabled });
  }
  return options;
}

export class Simulator {
  private nodes: DialogueNode[] = [];
  private connections: Connection[] = [];
  private state: SimulationState = {
    currentNodeId: null,
    visitedNodeIds: [],
    visitedConnectionIds: [],
    isRunning: false,
  };
  private context: Record<string, unknown> = {
    playerLevel: 1,
    hasItem: (_id: string) => false,
  };

  setData(nodes: DialogueNode[], connections: Connection[]) {
    this.nodes = nodes;
    this.connections = connections;
  }

  setContext(context: Record<string, unknown>) {
    this.context = { ...this.context, ...context };
  }

  getState(): SimulationState {
    return { ...this.state };
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  getCurrentNode(): DialogueNode | undefined {
    if (!this.state.currentNodeId) return undefined;
    return this.nodes.find(n => n.id === this.state.currentNodeId);
  }

  start(startNodeId?: string) {
    let startId: string | null = null;
    if (startNodeId) {
      startId = startNodeId;
    } else {
      const dialogueNodes = this.nodes.filter(n => n.type === 'dialogue');
      if (dialogueNodes.length > 0) {
        startId = dialogueNodes[0].id;
      } else if (this.nodes.length > 0) {
        startId = this.nodes[0].id;
      }
    }
    this.state = {
      currentNodeId: startId,
      visitedNodeIds: startId ? [startId] : [],
      visitedConnectionIds: [],
      isRunning: true,
    };
    this.emitPath();
    return this.getCurrentNode();
  }

  stop() {
    this.state = {
      currentNodeId: null,
      visitedNodeIds: [],
      visitedConnectionIds: [],
      isRunning: false,
    };
    this.emitPath();
  }

  chooseConnection(connectionId: string): DialogueNode | undefined {
    const conn = this.connections.find(c => c.id === connectionId);
    if (!conn) return undefined;
    this.state.visitedConnectionIds.push(connectionId);
    this.state.currentNodeId = conn.toId;
    if (conn.toId && !this.state.visitedNodeIds.includes(conn.toId)) {
      this.state.visitedNodeIds.push(conn.toId);
    }
    this.emitPath();
    const currentNode = this.getCurrentNode();
    if (currentNode && currentNode.type === 'condition') {
      const options = getAvailableOptions(currentNode, this.connections, this.context);
      const autoChoice = options.find(o => o.enabled);
      if (autoChoice) {
        return this.chooseConnection(autoChoice.connectionId);
      }
    }
    if (currentNode && currentNode.type === 'jump') {
      const options = getAvailableOptions(currentNode, this.connections, this.context);
      if (options.length > 0) {
        return this.chooseConnection(options[0].connectionId);
      }
    }
    if (currentNode && currentNode.type === 'dialogue') {
      const options = getAvailableOptions(currentNode, this.connections, this.context);
      if (options.length === 1 && options[0].text === '继续') {
      }
    }
    return currentNode;
  }

  advance(): DialogueNode | undefined {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return undefined;
    const options = getAvailableOptions(currentNode, this.connections, this.context);
    if (currentNode.type === 'end') return undefined;
    if (options.length === 0) return undefined;
    if (currentNode.type === 'dialogue' || currentNode.type === 'jump' || currentNode.type === 'condition') {
      const firstEnabled = options.find(o => o.enabled);
      if (firstEnabled) {
        return this.chooseConnection(firstEnabled.connectionId);
      }
    }
    return currentNode;
  }

  getOptions(): Array<{ text: string; connectionId: string; enabled: boolean }> {
    const current = this.getCurrentNode();
    if (!current) return [];
    return getAvailableOptions(current, this.connections, this.context);
  }

  private emitPath() {
    eventBus.emit('simulation:path', {
      visitedNodeIds: this.state.visitedNodeIds,
      visitedConnectionIds: this.state.visitedConnectionIds,
      currentNodeId: this.state.currentNodeId,
    });
  }
}

export const simulator = new Simulator();
