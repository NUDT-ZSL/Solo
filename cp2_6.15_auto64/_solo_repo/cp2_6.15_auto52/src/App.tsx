import React, { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Header } from '@/components/Header';
import { LayoutEditor } from '@/layout/LayoutEditor';
import { ArtworkManager } from '@/artwork/ArtworkManager';
import { PropertyPanel } from '@/components/PropertyPanel';
import { InviteModal } from '@/components/InviteModal';
import { Tooltip } from '@/components/Tooltip';
import { useStore } from '@/store/useStore';
import { useLayoutPolling, useResponsive, useKeyboardShortcuts } from '@/hooks/useLayoutPolling';

const App: React.FC = () => {
  const fetchLayout = useStore((state) => state.fetchLayout);
  const fetchArtworks = useStore((state) => state.fetchArtworks);
  const showPropertyPanel = useStore((state) => state.showPropertyPanel);
  const isMobile = useStore((state) => state.isMobile);
  const layout = useStore((state) => state.layout);

  useLayoutPolling(5000);
  useResponsive();
  useKeyboardShortcuts();

  useEffect(() => {
    fetchLayout();
    fetchArtworks();
  }, [fetchLayout, fetchArtworks]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen flex flex-col bg-[#1e1e2e] overflow-hidden">
        <Header />

        <div className="flex-1 flex relative overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <LayoutEditor />
            {showPropertyPanel && !isMobile && <PropertyPanel />}
          </div>

          {!isMobile && <ArtworkManager />}
        </div>

        {isMobile && <ArtworkManager />}

        <InviteModal />
        <Tooltip />
      </div>
    </DndProvider>
  );
};

export default App;
