import { useState, useCallback, useMemo } from 'react';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import CodePreview from './components/CodePreview';
import type { Block, LayoutConfig } from './types';
import { DEFAULT_LAYOUT_CONFIG, createDefaultBlocks } from './utils/constants';
import { generateFullCSS } from './utils/cssGenerator';
import { useThrottle } from './hooks/useThrottle';
import './index.css';

export default function App() {
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [blocks, setBlocks] = useState<Block[]>(() => createDefaultBlocks());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId]
  );

  const throttledBlocks = useThrottle(blocks, 100);
  const throttledConfig = useThrottle(layoutConfig, 100);
  const cssCode = useMemo(
    () => generateFullCSS(throttledConfig, throttledBlocks),
    [throttledConfig, throttledBlocks]
  );

  const handleLayoutChange = useCallback((updates: Partial<LayoutConfig>) => {
    setLayoutConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const handleUpdateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }, []);

  const handleSelectedBlockChange = useCallback(
    (updates: Partial<Block>) => {
      if (!selectedBlockId) return;
      handleUpdateBlock(selectedBlockId, updates);
    },
    [selectedBlockId, handleUpdateBlock]
  );

  const handleReset = useCallback(() => {
    setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
    setBlocks(createDefaultBlocks());
    setSelectedBlockId(null);
  }, []);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">CSS 布局可视化沙盒</h1>
        <button className="reset-btn" onClick={handleReset} type="button">
          重置布局
        </button>
      </header>

      <div className="app-main">
        <PropertyPanel
          layoutConfig={layoutConfig}
          selectedBlock={selectedBlock}
          onLayoutChange={handleLayoutChange}
          onBlockChange={handleSelectedBlockChange}
        />

        <main className="app-content">
          <Canvas
            blocks={blocks}
            layoutConfig={layoutConfig}
            selectedBlockId={selectedBlockId}
            onSelectBlock={handleSelectBlock}
            onUpdateBlock={handleUpdateBlock}
          />
          <CodePreview css={cssCode} />
        </main>
      </div>
    </div>
  );
}
