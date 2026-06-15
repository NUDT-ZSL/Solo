import React, { useState, useCallback, useMemo } from 'react';
import { PlacedItem, Artwork } from './types';
import { artworks } from './data/artworks';
import AssetLibrary from './AssetLibrary';
import GalleryCanvas from './GalleryCanvas';
import DetailPanel from './DetailPanel';
import Preview3D from './Preview3D';

const App: React.FC = () => {
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [draggingArtwork, setDraggingArtwork] = useState<Artwork | null>(null);

  const selectedItem = useMemo(() => {
    return placedItems.find(item => item.id === selectedItemId) || null;
  }, [placedItems, selectedItemId]);

  const selectedArtwork = useMemo(() => {
    if (!selectedItem) return undefined;
    return artworks.find(a => a.id === selectedItem.artworkId);
  }, [selectedItem]);

  const handleDragStart = useCallback((artwork: Artwork) => {
    setDraggingArtwork(artwork);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingArtwork(null);
  }, []);

  const handleItemsChange = useCallback((items: PlacedItem[]) => {
    setPlacedItems(items);
  }, []);

  const handleSelectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
  }, []);

  const handleUpdateItem = useCallback((id: string, updates: Partial<PlacedItem>) => {
    setPlacedItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setPlacedItems(prev => prev.filter(item => item.id !== id));
    setSelectedItemId(null);
  }, []);

  const handlePreview3D = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  return (
    <div className={`app-container ${draggingArtwork ? 'dragging' : ''}`}>
      <AssetLibrary 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      
      <main className="main-content">
        <header className="app-header">
          <h1>虚拟画廊策展工具</h1>
          <p className="header-subtitle">拖拽艺术品，打造您的专属展览空间</p>
        </header>
        
        <GalleryCanvas
          placedItems={placedItems}
          onItemsChange={handleItemsChange}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          onPreview3D={handlePreview3D}
          artworks={artworks}
          draggingArtwork={draggingArtwork}
          onCanvasDragEnd={handleDragEnd}
        />
      </main>
      
      <DetailPanel
        selectedItem={selectedItem}
        artwork={selectedArtwork}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />

      {showPreview && (
        <Preview3D
          placedItems={placedItems}
          artworks={artworks}
          onClose={handleClosePreview}
        />
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Cormorant Garamond', serif;
          background: #F5F0EB;
          color: #2C2C2C;
          overflow: hidden;
        }

        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: #F5F0EB;
        }

        .app-container.dragging {
          cursor: grabbing;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .app-header {
          text-align: center;
          padding: 20px 20px 0;
          flex-shrink: 0;
        }

        .app-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #2C2C2C;
          margin: 0 0 8px 0;
          letter-spacing: 2px;
        }

        .header-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          font-style: italic;
          color: #8B7D72;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default App;
