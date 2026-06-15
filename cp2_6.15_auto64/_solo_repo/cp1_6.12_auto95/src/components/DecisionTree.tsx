import { useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  ReactFlowInstance,
} from 'reactflow';
import type { TreeNode, DecisionNode, NodeResult, NodeStatus } from '../utils/types';

interface CustomNodeData {
  label: string;
  status?: NodeStatus;
  selected?: boolean;
  replaying?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onClick?: () => void;
}

function CustomNode({ data, selected }: { data: CustomNodeData; selected?: boolean }) {
  const statusClass = data.status ? `status-${data.status}` : '';
  const extraClass = data.replaying ? 'replaying' : selected ? 'selected' : '';
  return (
    <div
      className={`custom-node ${statusClass} ${extraClass}`}
      onClick={data.onClick}
    >
      {data.hasChildren && (
        <button
          className="expand-toggle"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleExpand?.();
          }}
        >
          {data.expanded ? '−' : '+'}
        </button>
      )}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

interface DecisionTreeProps {
  treeData: TreeNode;
  decisionChain: DecisionNode[];
  selectedNodeId: string | null;
  replayingNodeIds: string[];
  nodeStatusMap: Map<string, NodeResult>;
  edgeTriggeredMap: Map<string, boolean>;
  onNodeClick: (node: DecisionNode) => void;
  onToggleExpand: (nodeId: string) => void;
}

const NODE_WIDTH = 120;
const H_GAP = 40;
const V_GAP = 90;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

function layoutTree(
  root: TreeNode,
  statusMap: Map<string, NodeResult>,
  edgeMap: Map<string, boolean>,
  selectedId: string | null,
  replayingIds: string[],
  onNodeClick: (n: DecisionNode) => void,
  onToggle: (id: string) => void,
): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visibleIds = new Set<string>();

  function markVisible(node: TreeNode) {
    visibleIds.add(node.id);
    if (node.expanded) {
      node.children.forEach(markVisible);
    }
  }
  markVisible(root);

  function measure(node: TreeNode): { width: number; subtree: Map<string, { left: number; right: number }> } {
    const subtree = new Map<string, { left: number; right: number }>();
    if (!visibleIds.has(node.id)) {
      subtree.set(node.id, { left: 0, right: 0 });
      return { width: 0, subtree };
    }
    if (!node.expanded || node.children.length === 0) {
      subtree.set(node.id, { left: 0, right: NODE_WIDTH });
      return { width: NODE_WIDTH, subtree };
    }
    let totalWidth = 0;
    const childMeasures: { width: number; subtree: Map<string, { left: number; right: number }> }[] = [];
    node.children.forEach((child, idx) => {
      const m = measure(child);
      childMeasures.push(m);
      if (idx > 0) totalWidth += H_GAP;
      totalWidth += m.width;
      m.subtree.forEach((v, k) => subtree.set(k, { left: v.left, right: v.right }));
    });
    let cursor = 0;
    node.children.forEach((_child, idx) => {
      const m = childMeasures[idx];
      const offset = cursor;
      m.subtree.forEach((v, k) => {
        subtree.set(k, { left: v.left + offset, right: v.right + offset });
      });
      cursor += m.width + H_GAP;
    });
    const center = totalWidth / 2;
    subtree.set(node.id, { left: center - NODE_WIDTH / 2, right: center + NODE_WIDTH / 2 });
    return { width: Math.max(NODE_WIDTH, totalWidth), subtree };
  }

  const { subtree } = measure(root);

  function build(node: TreeNode, depth: number, parentId: string | null) {
    if (!visibleIds.has(node.id)) return;
    const pos = subtree.get(node.id)!;
    const status = statusMap.get(node.id)?.status;
    const decisionNode: DecisionNode = {
      id: node.id,
      name: node.label,
      depth,
      parentId,
    };
    nodes.push({
      id: node.id,
      type: 'custom',
      position: { x: pos.left, y: depth * V_GAP },
      data: {
        label: node.label,
        status,
        selected: node.id === selectedId,
        replaying: replayingIds.includes(node.id),
        hasChildren: node.children.length > 0,
        expanded: node.expanded,
        onClick: () => onNodeClick(decisionNode),
        onToggleExpand: () => onToggle(node.id),
      } as CustomNodeData,
    });
    if (parentId) {
      const key = `${parentId}->${node.id}`;
      const triggered = edgeMap.get(key) ?? false;
      edges.push({
        id: key,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: triggered,
        style: {
          stroke: triggered ? '#42A5F5' : '#555555',
          strokeWidth: triggered ? 3 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: triggered ? '#42A5F5' : '#555555',
        },
      });
    }
    if (node.expanded) {
      node.children.forEach((child) => build(child, depth + 1, node.id));
    }
  }

  build(root, 0, null);

  return { nodes, edges };
}

const nodeTypes = { custom: CustomNode };

export default function DecisionTree(props: DecisionTreeProps) {
  const {
    treeData,
    nodeStatusMap,
    edgeTriggeredMap,
    selectedNodeId,
    replayingNodeIds,
    onNodeClick,
    onToggleExpand,
  } = props;

  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const initial = useMemo(
    () => layoutTree(treeData, nodeStatusMap, edgeTriggeredMap, selectedNodeId, replayingNodeIds, onNodeClick, onToggleExpand),
    [treeData, nodeStatusMap, edgeTriggeredMap, selectedNodeId, replayingNodeIds, onNodeClick, onToggleExpand],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const { nodes: ns, edges: es } = layoutTree(
      treeData,
      nodeStatusMap,
      edgeTriggeredMap,
      selectedNodeId,
      replayingNodeIds,
      onNodeClick,
      onToggleExpand,
    );
    setNodes(ns);
    setEdges(es);
  }, [treeData, nodeStatusMap, edgeTriggeredMap, selectedNodeId, replayingNodeIds, onNodeClick, onToggleExpand, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
    instance.fitView({ padding: 0.2 });
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onInit={onInit}
      fitView
      minZoom={0.5}
      maxZoom={3}
      panOnDrag
      zoomOnScroll
      nodesDraggable
      proOptions={{ hideAttribution: true }}
      style={{ background: 'transparent' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.05)" />
      <Controls
        showInteractive={false}
        style={{
          background: 'rgba(42,42,62,0.9)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      />
      <MiniMap
        pannable
        zoomable
        style={{
          background: 'rgba(42,42,62,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
        }}
        nodeColor={() => '#42A5F5'}
        maskColor="rgba(30,30,46,0.7)"
      />
    </ReactFlow>
  );
}
