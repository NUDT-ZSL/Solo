import { useState, useCallback } from 'react';
import SvgGenerator from './SvgGenerator';
import IconGrid from './IconGrid';
import IconEditor from './IconEditor';
import type { Icon } from './types';
import './App.css';

function App() {
  const [icons, setIcons] = useState<Icon[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingIcon, setEditingIcon] = useState<Icon | null>(null);
  const [exportCount, setExportCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const handleGenerate = useCallback((newIcons: Icon[]) => {
    setIcons(prev => [...prev, ...newIcons]);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === icons.length && icons.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(icons.map(i => i.id)));
    }
  }, [icons, selectedIds.size]);

  const handleDelete = useCallback((id: string) => {
    setIcons(prev => prev.filter(i => i.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleEdit = useCallback((icon: Icon) => {
    setEditingIcon(icon);
  }, []);

  const handleSaveEdit = useCallback((updatedIcon: Icon) => {
    setIcons(prev => prev.map(i => i.id === updatedIcon.id ? updatedIcon : i));
    setEditingIcon(null);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditingIcon(null);
  }, []);

  const handleReorder = useCallback((startIndex: number, endIndex: number) => {
    setIcons(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const handleExportSuccess = useCallback(() => {
    setExportCount(prev => prev + selectedIds.size);
    setNotificationMessage(`成功导出 ${selectedIds.size} 个图标`);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  }, [selectedIds.size]);

  const selectedIcons = icons.filter(i => selectedIds.has(i.id));

  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="logo">
          <span className="logo-text">v</span>
          <span className="logo-text">I</span>
          <span className="logo-text">c</span>
          <span className="logo-text">o</span>
          <span className="logo-text">n</span>
          <span className="logo-text">M</span>
          <span className="logo-text">a</span>
          <span className="logo-text">k</span>
          <span className="logo-text">e</span>
          <span className="logo-text">r</span>
        </div>
        <SvgGenerator
          onGenerate={handleGenerate}
          totalCount={icons.length}
          selectedCount={selectedIds.size}
          exportCount={exportCount}
        />
      </div>
      <div className="right-panel">
        <IconGrid
          icons={icons}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onReorder={handleReorder}
          selectedIcons={selectedIcons}
          onExportSuccess={handleExportSuccess}
        />
      </div>
      {editingIcon && (
        <IconEditor
          icon={editingIcon}
          onSave={handleSaveEdit}
          onClose={handleCloseEditor}
        />
      )}
      <div className={`notification ${showNotification ? 'show' : ''}`}>
        {notificationMessage}
      </div>
    </div>
  );
}

export default App;
