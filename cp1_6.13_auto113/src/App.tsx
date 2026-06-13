import { useState, useEffect, useCallback } from 'react';
import Canvas from './components/Canvas';
import ExportPanel from './components/ExportPanel';
import {
  BookmarkNode,
  getBookmarks,
  addBookmark as apiAddBookmark,
  updateBookmark as apiUpdateBookmark,
  deleteBookmark as apiDeleteBookmark,
} from './api/bookmarks';

export interface FlatBookmarkMap {
  [key: string]: BookmarkNode;
}

function flattenTree(nodes: BookmarkNode[]): FlatBookmarkMap {
  const map: FlatBookmarkMap = {};
  const traverse = (nodeList: BookmarkNode[]) => {
    nodeList.forEach(node => {
      map[node._id] = { ...node, children: undefined };
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return map;
}

function buildTreeFromFlat(flatMap: FlatBookmarkMap): BookmarkNode[] {
  const roots: BookmarkNode[] = [];
  const nodesWithChildren: { [key: string]: BookmarkNode & { children: BookmarkNode[] } } = {};

  Object.keys(flatMap).forEach(id => {
    nodesWithChildren[id] = { ...flatMap[id], children: [] };
  });

  Object.keys(nodesWithChildren).forEach(id => {
    const node = nodesWithChildren[id];
    if (node.parentId === null || node.parentId === undefined) {
      roots.push(node);
    } else {
      const parent = nodesWithChildren[node.parentId];
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
}

function calculateChildPositions(parentX: number, parentY: number, count: number, radius: number = 180): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  if (count === 0) return positions;

  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: parentX + radius * Math.cos(angle),
      y: parentY + radius * Math.sin(angle),
    });
  }

  return positions;
}

function layoutNodes(nodes: BookmarkNode[]): FlatBookmarkMap {
  const flatMap = flattenTree(nodes);

  const layoutLevel = (parentId: string | null) => {
    const children = Object.values(flatMap).filter(n => n.parentId === parentId);
    if (children.length === 0) return;

    const parent = parentId ? flatMap[parentId] : null;
    if (!parent) return;

    const positions = calculateChildPositions(parent.x, parent.y, children.length);
    children.forEach((child, index) => {
      if (positions[index]) {
        flatMap[child._id].x = positions[index].x;
        flatMap[child._id].y = positions[index].y;
      }
      layoutLevel(child._id);
    });
  };

  const roots = Object.values(flatMap).filter(n => n.parentId === null || n.parentId === undefined);
  roots.forEach(root => {
    layoutLevel(root._id);
  });

  return flatMap;
}

export default function App() {
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [flatMap, setFlatMap] = useState<FlatBookmarkMap>({});
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [deletingNodeIds, setDeletingNodeIds] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBookmarks();
      setBookmarks(data);
      const laidOut = layoutNodes(data);
      setFlatMap(laidOut);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleAddBookmark = async (parentId: string, title: string, url: string) => {
    try {
      const parent = flatMap[parentId];
      if (!parent) return;

      const siblings = Object.values(flatMap).filter(n => n.parentId === parentId);
      const newIndex = siblings.length;
      const count = siblings.length + 1;

      const positions = calculateChildPositions(parent.x, parent.y, count);
      const pos = positions[newIndex] || { x: parent.x + 180, y: parent.y };

      const newBookmark = await apiAddBookmark({
        title,
        url,
        parentId,
        x: pos.x,
        y: pos.y,
      });

      const newFlatMap = { ...flatMap, [newBookmark._id]: newBookmark };

      const updatedSiblings = Object.values(newFlatMap).filter(n => n.parentId === parentId);
      const newPositions = calculateChildPositions(parent.x, parent.y, updatedSiblings.length);
      updatedSiblings.forEach((sibling, index) => {
        if (newPositions[index]) {
          newFlatMap[sibling._id] = {
            ...newFlatMap[sibling._id],
            x: newPositions[index].x,
            y: newPositions[index].y,
          };
        }
      });

      setFlatMap(newFlatMap);
      setNewNodeIds(prev => new Set([...prev, newBookmark._id]));
      setTimeout(() => {
        setNewNodeIds(prev => {
          const next = new Set(prev);
          next.delete(newBookmark._id);
          return next;
        });
      }, 400);

      const tree = buildTreeFromFlat(newFlatMap);
      setBookmarks(tree);
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  };

  const handleUpdateParent = async (nodeId: string, newParentId: string) => {
    try {
      if (nodeId === newParentId) return;

      const node = flatMap[nodeId];
      const newParent = flatMap[newParentId];
      if (!node || !newParent) return;

      let current = newParent;
      while (current.parentId) {
        if (current.parentId === nodeId) return;
        current = flatMap[current.parentId];
        if (!current) break;
      }

      const oldParentId = node.parentId;

      const newFlatMap = { ...flatMap };
      newFlatMap[nodeId] = { ...node, parentId: newParentId };

      if (oldParentId) {
        const oldSiblings = Object.values(newFlatMap).filter(n => n.parentId === oldParentId);
        const oldParent = newFlatMap[oldParentId];
        if (oldParent) {
          const oldPositions = calculateChildPositions(oldParent.x, oldParent.y, oldSiblings.length);
          oldSiblings.forEach((sibling, index) => {
            if (oldPositions[index]) {
              newFlatMap[sibling._id] = {
                ...newFlatMap[sibling._id],
                x: oldPositions[index].x,
                y: oldPositions[index].y,
              };
            }
          });
        }
      }

      const newSiblings = Object.values(newFlatMap).filter(n => n.parentId === newParentId);
      const newPositions = calculateChildPositions(newParent.x, newParent.y, newSiblings.length);
      newSiblings.forEach((sibling, index) => {
        if (newPositions[index]) {
          newFlatMap[sibling._id] = {
            ...newFlatMap[sibling._id],
            x: newPositions[index].x,
            y: newPositions[index].y,
          };
        }
      });

      const repositionChildren = (parentId: string, offsetX: number, offsetY: number) => {
        const children = Object.values(newFlatMap).filter(n => n.parentId === parentId);
        children.forEach(child => {
          newFlatMap[child._id] = {
            ...newFlatMap[child._id],
            x: newFlatMap[child._id].x + offsetX,
            y: newFlatMap[child._id].y + offsetY,
          };
          repositionChildren(child._id, offsetX, offsetY);
        });
      };

      const oldX = node.x;
      const oldY = node.y;
      const newPos = newPositions[newSiblings.findIndex(s => s._id === nodeId)];
      if (newPos) {
        const offsetX = newPos.x - oldX;
        const offsetY = newPos.y - oldY;
        repositionChildren(nodeId, offsetX, offsetY);
      }

      setFlatMap(newFlatMap);
      const tree = buildTreeFromFlat(newFlatMap);
      setBookmarks(tree);

      await apiUpdateBookmark(nodeId, { parentId: newParentId });
    } catch (err) {
      console.error('Failed to update bookmark parent:', err);
      loadBookmarks();
    }
  };

  const handleDeleteBookmark = async (nodeId: string) => {
    try {
      const node = flatMap[nodeId];
      if (!node || node.isRoot) return;

      setDeletingNodeIds(prev => new Set([...prev, nodeId]));

      await new Promise(resolve => setTimeout(resolve, 300));

      const newFlatMap = { ...flatMap };
      const parentId = node.parentId;

      const directChildren = Object.keys(newFlatMap).filter(id => newFlatMap[id].parentId === nodeId);
      directChildren.forEach(childId => {
        newFlatMap[childId] = { ...newFlatMap[childId], parentId: parentId };
      });

      delete newFlatMap[nodeId];

      if (parentId) {
        const parent = newFlatMap[parentId];
        if (parent) {
          const allSiblings = Object.keys(newFlatMap).filter(id => newFlatMap[id].parentId === parentId);
          const newPositions = calculateChildPositions(parent.x, parent.y, allSiblings.length);
          allSiblings.forEach((siblingId, index) => {
            if (newPositions[index]) {
              newFlatMap[siblingId] = {
                ...newFlatMap[siblingId],
                x: newPositions[index].x,
                y: newPositions[index].y,
              };
            }
          });
        }
      }

      setFlatMap(newFlatMap);
      setDeletingNodeIds(prev => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });

      const tree = buildTreeFromFlat(newFlatMap);
      setBookmarks(tree);

      await apiDeleteBookmark(nodeId);

      for (const childId of directChildren) {
        await apiUpdateBookmark(childId, { parentId: parentId });
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
      loadBookmarks();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Canvas
          flatMap={flatMap}
          bookmarks={bookmarks}
          newNodeIds={newNodeIds}
          deletingNodeIds={deletingNodeIds}
          onAddBookmark={handleAddBookmark}
          onUpdateParent={handleUpdateParent}
          onDeleteBookmark={handleDeleteBookmark}
        />
      </div>
      <ExportPanel bookmarks={bookmarks} />
    </div>
  );
}
