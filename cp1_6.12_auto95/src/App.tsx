import { useState, useCallback, useEffect, useMemo } from 'react';
import DecisionTree from './components/DecisionTree';
import StatsPanel from './components/StatsPanel';
import { runSimulation, formatReplaySummary } from './utils/simulator';
import type {
  DecisionNode,
  TreeNode,
  SimulateResponse,
  ReplayRecord,
  NodeResult,
} from './utils/types';

const sampleTreeData: TreeNode = {
  id: 'root',
  name: '关卡开始',
  depth: 0,
  expanded: true,
  children: [
    {
      id: 'n1',
      name: '对话选项A',
      depth: 1,
      expanded: true,
      children: [
        {
          id: 'n1-1',
          name: '移动路径A1',
          depth: 2,
          expanded: false,
          children: [
            { id: 'n1-1-1', name: '战斗-胜利', depth: 3, expanded: false, children: [] },
            { id: 'n1-1-2', name: '战斗-失败', depth: 3, expanded: false, children: [] },
          ],
        },
        {
          id: 'n1-2',
          name: '移动路径A2',
          depth: 2,
          expanded: false,
          children: [
            { id: 'n1-2-1', name: '遭遇NPC', depth: 3, expanded: false, children: [] },
          ],
        },
      ],
    },
    {
      id: 'n2',
      name: '对话选项B',
      depth: 1,
      expanded: true,
      children: [
        {
          id: 'n2-1',
          name: '移动路径B1',
          depth: 2,
          expanded: false,
          children: [
            { id: 'n2-1-1', name: '陷阱触发', depth: 3, expanded: false, children: [] },
            { id: 'n2-1-2', name: '安全通过', depth: 3, expanded: false, children: [] },
          ],
        },
        {
          id: 'n2-2',
          name: '移动路径B2',
          depth: 2,
          expanded: false,
          children: [
            { id: 'n2-2-1', name: '隐藏宝箱', depth: 3, expanded: false, children: [] },
            { id: 'n2-2-2', name: 'Boss战', depth: 3, expanded: false, children: [] },
          ],
        },
      ],
    },
    {
      id: 'n3',
      name: '对话选项C',
      depth: 1,
      expanded: true,
      children: [
        {
          id: 'n3-1',
          name: '分支剧情C1',
          depth: 2,
          expanded: false,
          children: [
            { id: 'n3-1-1', name: '结局-和平', depth: 3, expanded: false, children: [] },
          ],
        },
      ],
    },
  ],
};

export default function App() {
  const [treeData, setTreeData] = useState<TreeNode>(sampleTreeData);
  const [decisionChain, setDecisionChain] = useState<DecisionNode[]>([]);
  const [simulateResult, setSimulateResult] = useState<SimulateResponse | null>(null);
  const [replayHistory, setReplayHistory] = useState<ReplayRecord[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [replayingNodeIds, setReplayingNodeIds] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNodeClick = useCallback((node: DecisionNode) => {
    setSelectedNodeId(node.id);
    setDecisionChain((prev) => {
      const exists = prev.find((n) => n.id === node.id);
      if (exists) return prev;
      const chainIds = prev.map((n) => n.id);
      const filtered = prev.filter((n) => {
        const idx = chainIds.indexOf(n.id);
        const nodeIdx = chainIds.indexOf(node.parentId ?? '');
        if (node.parentId && n.id === node.parentId) return true;
        if (nodeIdx >= 0) return idx <= nodeIdx;
        return n.depth < node.depth;
      });
      return [...filtered, { id: node.id, name: node.name, depth: node.depth, parentId: node.parentId }];
    });
  }, []);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setTreeData((prev) => {
      const toggle = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        return { ...node, children: node.children.map(toggle) };
      };
      return toggle(prev);
    });
  }, []);

  const handleRunSimulation = useCallback(async () => {
    if (decisionChain.length === 0 || isSimulating) return;
    setIsSimulating(true);
    try {
      const result = await runSimulation(decisionChain);
      setSimulateResult(result);
      const record: ReplayRecord = {
        id: `r-${Date.now()}`,
        timestamp: Date.now(),
        decisionChain: [...decisionChain],
        summary: formatReplaySummary(decisionChain),
        result,
      };
      setReplayHistory((prev) => [record, ...prev].slice(0, 5));
    } catch (error) {
      console.error('模拟运行失败', error);
    } finally {
      setIsSimulating(false);
    }
  }, [decisionChain, isSimulating]);

  const handleClearChain = useCallback(() => {
    setDecisionChain([]);
    setSelectedNodeId(null);
    setSimulateResult(null);
  }, []);

  const handleReplay = useCallback((record: ReplayRecord) => {
    const chain = record.decisionChain;
    setSimulateResult(record.result);
    setReplayingNodeIds([]);
    chain.forEach((node, index) => {
      setTimeout(() => {
        setReplayingNodeIds((prev) => [...prev, node.id]);
        setTimeout(() => {
          setReplayingNodeIds((prev) => prev.filter((id) => id !== node.id));
        }, 400);
      }, index * 500);
    });
  }, []);

  const nodeStatusMap = useMemo(() => {
    const map = new Map<string, NodeResult>();
    simulateResult?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [simulateResult]);

  const edgeTriggeredMap = useMemo(() => {
    const map = new Map<string, boolean>();
    simulateResult?.edges.forEach((e) => {
      map.set(`${e.source}->${e.target}`, e.triggered);
    });
    return map;
  }, [simulateResult]);

  return (
    <div className="app-container">
      <div className="main-area">
        <div className="toolbar">
          <span className="app-title">BranchVoyage</span>
          {decisionChain.length > 0 && (
            <div className="chain-indicator">
              <span>决策链:</span>
              <span className="chain-pill">{decisionChain.length} 个节点</span>
            </div>
          )}
          {decisionChain.length > 0 && (
            <button className="clear-chain-btn" onClick={handleClearChain}>
              清空
            </button>
          )}
          <button
            className="run-button"
            onClick={handleRunSimulation}
            disabled={decisionChain.length === 0 || isSimulating}
          >
            {isSimulating ? '模拟中...' : '运行模拟'}
          </button>
        </div>
        <div className="tree-container">
          <DecisionTree
            treeData={treeData}
            decisionChain={decisionChain}
            selectedNodeId={selectedNodeId}
            replayingNodeIds={replayingNodeIds}
            nodeStatusMap={nodeStatusMap}
            edgeTriggeredMap={edgeTriggeredMap}
            onNodeClick={handleNodeClick}
            onToggleExpand={handleToggleExpand}
          />
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot green" />
              <span>已触发</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot orange" />
              <span>部分触发</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot gray" />
              <span>未触发</span>
            </div>
          </div>
        </div>
      </div>

      <StatsPanel
        simulateResult={simulateResult}
        replayHistory={replayHistory}
        onReplay={handleReplay}
        isMobile={isMobile}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((o) => !o)}
      />
    </div>
  );
}
