import { useState, useEffect } from 'react';
import MapGraph from './components/MapGraph';
import LearningPath from './components/LearningPath';
import ReportView from './components/ReportView';

export interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  prerequisites: string[];
  x: number;
  y: number;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  nodeId: string;
  status: 'completed' | 'in_progress' | 'not_started';
  completedAt: string | null;
}

function App() {
  const [currentPage, setCurrentPage] = useState<'map' | 'path' | 'report'>('map');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  async function fetchData() {
    try {
      const [nodesRes, progressRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/progress'),
      ]);
      const nodesData = await nodesRes.json();
      const progressData = await progressRes.json();
      setNodes(nodesData);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }

  const refreshData = () => setRefreshKey(k => k + 1);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setCurrentPage('path');
  };

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <a
          href="#"
          className={`nav-link ${currentPage === 'map' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('map'); }}
        >
          知识图谱
        </a>
        <a
          href="#"
          className={`nav-link ${currentPage === 'path' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('path'); }}
        >
          学习路径
        </a>
        <a
          href="#"
          className={`nav-link ${currentPage === 'report' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('report'); }}
        >
          学习报告
        </a>
      </nav>

      <div className="page-container">
        {currentPage === 'map' && (
          <MapGraph
            nodes={nodes}
            progress={progress}
            onNodeClick={handleNodeClick}
            onNodesChange={refreshData}
          />
        )}
        {currentPage === 'path' && (
          <LearningPath
            nodes={nodes}
            progress={progress}
            targetNodeId={selectedNodeId}
            onProgressChange={refreshData}
          />
        )}
        {currentPage === 'report' && (
          <ReportView refreshKey={refreshKey} />
        )}
      </div>
    </div>
  );
}

export default App;
