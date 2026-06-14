import React, { useState, useEffect } from 'react';
import SidePanel from './components/SidePanel';
import Canvas from './components/Canvas';
import http from './utils/http';
import { NodeData, EdgeData, Tag, Character } from './types';

const PRESET_COLORS = ['#00cec9', '#fd79a8', '#636e72'];

const App: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesData, edgesData, tagsData, charsData] = await Promise.all([
          http.get<NodeData[]>('/nodes'),
          http.get<EdgeData[]>('/edges'),
          http.get<Tag[]>('/tags'),
          http.get<Character[]>('/characters'),
        ]);
        setNodes(nodesData);
        setEdges(edgesData);
        setTags(tagsData);
        setCharacters(charsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setNodes([
          { id: 'node-1', x: 100, y: 100, title: '开端', description: '故事的开始', tagId: 'tag-1', timelinePosition: 0 },
          { id: 'node-2', x: 400, y: 160, title: '发展', description: '情节推进中', tagId: 'tag-2', timelinePosition: 1 },
        ]);
        setEdges([
          { id: 'edge-1', source: 'node-1', target: 'node-2', label: '引发' },
        ]);
        setTags([
          { id: 'tag-1', name: '主线', color: '#00cec9' },
          { id: 'tag-2', name: '支线', color: '#fd79a8' },
          { id: 'tag-3', name: '伏笔', color: '#636e72' },
        ]);
        setCharacters([
          { id: 'char-1', name: '主角', description: '故事的主人公' },
          { id: 'char-2', name: '配角', description: '重要的配角' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNodeCreate = async (node: Partial<NodeData>) => {
    try {
      const newNode = await http.post<NodeData>('/nodes', node);
      setNodes((prev) => [...prev, newNode]);
    } catch {
      const newNode: NodeData = {
        id: `node-${Date.now()}`,
        x: node.x || 0,
        y: node.y || 0,
        title: node.title || '新节点',
        description: node.description || '',
        tagId: node.tagId,
        characterId: node.characterId,
        timelinePosition: node.timelinePosition,
      };
      setNodes((prev) => [...prev, newNode]);
    }
  };

  const handleNodeUpdate = async (id: string, updates: Partial<NodeData>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
    try {
      await http.put(`/nodes/${id}`, updates);
    } catch {
      // ignore
    }
  };

  const handleNodeDelete = async (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    try {
      await http.delete(`/nodes/${id}`);
    } catch {
      // ignore
    }
  };

  const handleEdgeCreate = async (edge: Partial<EdgeData>) => {
    try {
      const newEdge = await http.post<EdgeData>('/edges', edge);
      setEdges((prev) => [...prev, newEdge]);
    } catch {
      const newEdge: EdgeData = {
        id: `edge-${Date.now()}`,
        source: edge.source || '',
        target: edge.target || '',
        label: edge.label,
      };
      setEdges((prev) => [...prev, newEdge]);
    }
  };

  const handleEdgeDelete = async (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    try {
      await http.delete(`/edges/${id}`);
    } catch {
      // ignore
    }
  };

  const handleAddCharacter = async () => {
    const name = prompt('输入角色名称：');
    if (!name) return;
    try {
      const newChar = await http.post<Character>('/characters', { name });
      setCharacters((prev) => [...prev, newChar]);
    } catch {
      const newChar: Character = {
        id: `char-${Date.now()}`,
        name,
      };
      setCharacters((prev) => [...prev, newChar]);
    }
  };

  const handleAddTag = async () => {
    const name = prompt('输入标签名称：');
    if (!name) return;
    const color = PRESET_COLORS[tags.length % PRESET_COLORS.length];
    try {
      const newTag = await http.post<Tag>('/tags', { name, color });
      setTags((prev) => [...prev, newTag]);
    } catch {
      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        name,
        color,
      };
      setTags((prev) => [...prev, newTag]);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>加载中...</div>;
  }

  return (
    <div className="app-container">
      {isMobile && (
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="打开菜单"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      {isMobile ? (
        <SidePanel
          tags={tags}
          characters={characters}
          onAddCharacter={handleAddCharacter}
          onAddTag={handleAddTag}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile
        />
      ) : (
        <SidePanel
          tags={tags}
          characters={characters}
          onAddCharacter={handleAddCharacter}
          onAddTag={handleAddTag}
        />
      )}

      <Canvas
        nodes={nodes}
        edges={edges}
        tags={tags}
        characters={characters}
        onNodeCreate={handleNodeCreate}
        onNodeUpdate={handleNodeUpdate}
        onNodeDelete={handleNodeDelete}
        onEdgeCreate={handleEdgeCreate}
        onEdgeDelete={handleEdgeDelete}
      />

      <style>{`
        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        .hamburger-btn {
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 999;
          width: 40px;
          height: 40px;
          background: #6c5ce7;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 8px;
          transition: background-color 0.2s ease;
        }

        .hamburger-btn:hover {
          background: #a29bfe;
        }

        .hamburger-btn span {
          display: block;
          width: 20px;
          height: 2px;
          background: white;
          border-radius: 1px;
        }
      `}</style>
    </div>
  );
};

export default App;
