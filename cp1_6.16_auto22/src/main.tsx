import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import GridCanvas from './components/GridCanvas';
import ModuleLibrary from './components/ModuleLibrary';
import SearchBar from './components/SearchBar';
import ItemListModal from './components/ItemListModal';
import { StorageLogic, StorageModule } from './logics/StorageLogic';

const App: React.FC = () => {
  const [, forceUpdate] = useState({});
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [highlightedModuleIds, setHighlightedModuleIds] = useState<Set<string>>(new Set());
  const [flashModuleIds, setFlashModuleIds] = useState<Set<string>>(new Set());
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = StorageLogic.subscribe(() => {
      forceUpdate({});
    });
    return () => {
      unsubscribe();
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const openModuleModal = useCallback((moduleId: string) => {
    setSelectedModuleId(moduleId);
  }, []);

  const closeModuleModal = useCallback(() => {
    setSelectedModuleId(null);
  }, []);

  const handleSearchHighlight = useCallback((moduleIds: string[]) => {
    setHighlightedModuleIds(new Set(moduleIds));
    setFlashModuleIds(new Set(moduleIds));
    
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashModuleIds(new Set());
      flashTimeoutRef.current = null;
    }, 500);
  }, []);

  const clearSearchHighlight = useCallback(() => {
    setHighlightedModuleIds(new Set());
    setFlashModuleIds(new Set());
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  const selectedModule = selectedModuleId
    ? StorageLogic.getModule(selectedModuleId)
    : null;

  const appStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFF8DC',
    color: '#2F4F4F'
  };

  const mainContentStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    padding: '20px',
    gap: '20px',
    overflow: 'hidden'
  };

  return (
    <div style={appStyle}>
      <SearchBar
        onHighlight={handleSearchHighlight}
        onClear={clearSearchHighlight}
      />
      <div style={mainContentStyle}>
        <ModuleLibrary />
        <GridCanvas
          onModuleDoubleClick={openModuleModal}
          highlightedModuleIds={highlightedModuleIds}
          flashModuleIds={flashModuleIds}
        />
      </div>
      <ItemListModal
        moduleId={selectedModuleId}
        visible={selectedModuleId !== null}
        onClose={closeModuleModal}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
