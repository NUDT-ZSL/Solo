import React, { useState, useEffect, useCallback } from 'react';
import { SkillNode, SkillLink, SkillsData } from './types';
import ControlPanel from './ControlPanel';
import SkillCanvas from './SkillCanvas';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [links, setLinks] = useState<SkillLink[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 768) {
        setPanelCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) throw new Error('Failed to load skills');
      const data: SkillsData = await res.json();
      setNodes(data.nodes);
      setLinks(data.links);
    } catch (err) {
      console.error('加载技能数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodes, links }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '保存失败');
      }
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, links]);

  const handleAddNode = useCallback(
    (nodeData: Omit<SkillNode, 'id' | 'x' | 'y'>) => {
      const newId = `n-${Date.now()}`;
      const newNode: SkillNode = {
        ...nodeData,
        id: newId,
      };
      setNodes((prev) => [...prev, newNode]);

      if (nodeData.parentId) {
        const newLink: SkillLink = {
          id: `l-${Date.now()}`,
          source: newId,
          target: nodeData.parentId,
          type: 'dependency',
        };
        setLinks((prev) => [...prev, newLink]);
      }
    },
    []
  );

  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<SkillNode>) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, ...updates };

          if (updates.parentId !== undefined && updates.parentId !== n.parentId) {
            setLinks((prevLinks) => {
              const filtered = prevLinks.filter(
                (l) =>
                  !(
                    (l.type === 'dependency' || l.type === 'enhancement') &&
                    ((typeof l.source === 'string' ? l.source : l.source.id) === id ||
                      (typeof l.target === 'string' ? l.target : l.target.id) === id)
                  )
              );

              if (updates.parentId) {
                filtered.push({
                  id: `l-${Date.now()}`,
                  source: id,
                  target: updates.parentId,
                  type: 'dependency',
                });
              }
              return filtered;
            });
          }

          return updated;
        })
      );
    },
    []
  );

  const handleDeleteNode = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');

      const idsToRemove = new Set<string>([id]);
      const collectChildren = (parentId: string) => {
        nodes.forEach((n) => {
          if (n.parentId === parentId && !idsToRemove.has(n.id)) {
            idsToRemove.add(n.id);
            collectChildren(n.id);
          }
        });
      };
      collectChildren(id);

      setNodes((prev) => prev.filter((n) => !idsToRemove.has(n.id)));
      setLinks((prev) =>
        prev.filter(
          (l) =>
            !idsToRemove.has(typeof l.source === 'string' ? l.source : l.source.id) &&
            !idsToRemove.has(typeof l.target === 'string' ? l.target : l.target.id)
        )
      );
    } catch (err) {
      console.error('删除失败:', err);
      const idsToRemove = new Set<string>([id]);
      const collectChildren = (parentId: string) => {
        nodes.forEach((n) => {
          if (n.parentId === parentId && !idsToRemove.has(n.id)) {
            idsToRemove.add(n.id);
            collectChildren(n.id);
          }
        });
      };
      collectChildren(id);

      setNodes((prev) => prev.filter((n) => !idsToRemove.has(n.id)));
      setLinks((prev) =>
        prev.filter(
          (l) =>
            !idsToRemove.has(typeof l.source === 'string' ? l.source : l.source.id) &&
            !idsToRemove.has(typeof l.target === 'string' ? l.target : l.target.id)
        )
      );
    }
  }, [nodes]);

  const handleNodesChange = useCallback((updatedNodes: SkillNode[]) => {
    setNodes((prev) => {
      const idToNode = new Map(updatedNodes.map((n) => [n.id, n]));
      return prev.map((n) => {
        const updated = idToNode.get(n.id);
        if (!updated) return n;
        return {
          ...n,
          x: updated.x,
          y: updated.y,
        };
      });
    });
  }, []);

  const handleLinksChange = useCallback((newLinks: SkillLink[]) => {
    setLinks(newLinks);
  }, []);

  const handleDeleteLink = useCallback((linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }, []);

  const handleTogglePanel = useCallback(() => {
    setPanelCollapsed((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(233,69,96,0.2)',
            borderTopColor: '#e94560',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          正在加载技能图谱...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
      }}
    >
      <ControlPanel
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onAddNode={handleAddNode}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onSave={handleSave}
        onLoad={loadSkills}
        isSaving={isSaving}
        isLoading={isLoading}
        panelCollapsed={panelCollapsed}
        onTogglePanel={handleTogglePanel}
      />

      <main
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <SkillCanvas
          nodes={nodes}
          links={links}
          onNodesChange={handleNodesChange}
          onLinksChange={handleLinksChange}
          onDeleteLink={handleDeleteLink}
        />

        {windowWidth >= 768 && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(20, 20, 40, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              pointerEvents: 'none',
            }}
          >
            💡 点击「保存图谱」将数据持久化到后端
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
