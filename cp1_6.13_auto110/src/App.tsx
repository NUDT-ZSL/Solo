import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NodeData, EdgeData, NodeType } from '@/types';
import { DataService } from '@/modules/DataService';
import Scene from '@/components/Scene';
import ControlPanel from '@/components/ControlPanel';
import styles from './App.module.css';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<NodeType[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [focusTarget, setFocusTarget] = useState<{ nodeId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const initialNodesRef = useRef<NodeData[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { nodes: fetchedNodes, edges: fetchedEdges } =
          await DataService.fetchAllData();
        setNodes(fetchedNodes);
        setEdges(fetchedEdges);
        initialNodesRef.current = JSON.parse(JSON.stringify(fetchedNodes));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedNode = useMemo(() => {
    return selectedNodeId
      ? nodes.find(n => n.id === selectedNodeId) || null
      : null;
  }, [nodes, selectedNodeId]);

  const connectionCount = useMemo(() => {
    if (!selectedNodeId) return 0;
    return edges.filter(
      e => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
    ).length;
  }, [edges, selectedNodeId]);

  const handleNodeClick = useCallback((node: NodeData | null) => {
    setSelectedNodeId(node ? node.id : null);
  }, []);

  const handleNodeHover = useCallback((node: NodeData | null) => {
    setHoveredNodeId(node ? node.id : null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchFilter(value);
  }, []);

  const handleHiddenTypesChange = useCallback((types: NodeType[]) => {
    setHiddenTypes(types);
  }, []);

  const handleResetLayout = useCallback(() => {
    if (initialNodesRef.current.length > 0) {
      setNodes(JSON.parse(JSON.stringify(initialNodesRef.current)));
    }
  }, []);

  const handleFocusNode = useCallback(() => {
    if (selectedNodeId) {
      setFocusTarget({ nodeId: selectedNodeId });
    }
  }, [selectedNodeId]);

  const handleFocusComplete = useCallback(() => {
    setFocusTarget(null);
  }, []);

  return (
    <div className={styles.appContainer}>
      <div className={styles.sceneContainer}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <Scene
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            hiddenTypes={hiddenTypes}
            searchFilter={searchFilter}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            focusTarget={focusTarget}
            onFocusComplete={handleFocusComplete}
          />
        )}
      </div>

      <ControlPanel
        selectedNode={selectedNode}
        onNodeSelect={handleNodeClick}
        searchFilter={searchFilter}
        onSearchChange={handleSearchChange}
        hiddenTypes={hiddenTypes}
        onHiddenTypesChange={handleHiddenTypesChange}
        onResetLayout={handleResetLayout}
        onFocusNode={handleFocusNode}
        connectionCount={connectionCount}
      />
    </div>
  );
};

export default App;
