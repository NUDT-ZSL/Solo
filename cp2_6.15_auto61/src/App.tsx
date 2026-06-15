import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Scene from './components/Scene';
import HUD from './components/HUD';

export default function App() {
  const galleries = useStore((state) => state.galleries);
  const currentGallery = useStore((state) => state.currentGallery);
  const exhibits = useStore((state) => state.exhibits);
  const selectedExhibit = useStore((state) => state.selectedExhibit);
  const filterCategory = useStore((state) => state.filterCategory);
  const themeMode = useStore((state) => state.themeMode);
  const isLoading = useStore((state) => state.isLoading);
  const isTransitioning = useStore((state) => state.isTransitioning);
  const loadGalleries = useStore((state) => state.loadGalleries);
  const loadGallery = useStore((state) => state.loadGallery);
  const selectExhibit = useStore((state) => state.selectExhibit);
  const setFilterCategory = useStore((state) => state.setFilterCategory);
  const toggleThemeMode = useStore((state) => state.toggleThemeMode);

  useEffect(() => {
    const init = async () => {
      await loadGalleries();
    };
    init();
  }, [loadGalleries]);

  useEffect(() => {
    if (galleries.length > 0 && !currentGallery) {
      loadGallery(galleries[0].id);
    }
  }, [galleries, currentGallery, loadGallery]);

  const filteredExhibits = exhibits.filter((exhibit) => {
    if (filterCategory === 'all') return true;
    return exhibit.category === filterCategory;
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a1a' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 220, background: '#1a1a2e', padding: 16, overflowY: 'auto', zIndex: 10 }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 16, letterSpacing: 1 }}>
          展厅列表
        </h2>
        {galleries.map((gallery) => (
          <div
            key={gallery.id}
            onClick={() => loadGallery(gallery.id)}
            style={{
              padding: 12,
              marginBottom: 10,
              borderRadius: 10,
              background: currentGallery?.id === gallery.id
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: currentGallery?.id === gallery.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}
            onMouseEnter={(e) => {
              if (currentGallery?.id !== gallery.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentGallery?.id !== gallery.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }
            }}
          >
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {gallery.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 300 }}>
              {gallery.description}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', left: 220, top: 0, right: 0, bottom: 0 }}>
        {(isLoading || isTransitioning) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10,10,26,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            transition: 'opacity 0.3s ease',
          }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 300 }}>
              加载中...
            </div>
          </div>
        )}

        {currentGallery && (
          <Scene
            exhibits={filteredExhibits}
            allExhibits={exhibits}
            selectedExhibit={selectedExhibit}
            onSelectExhibit={selectExhibit}
            themeMode={themeMode}
            isTransitioning={isTransitioning}
            filterCategory={filterCategory}
            galleryName={currentGallery.name}
          />
        )}
      </div>

      <HUD
        selectedExhibit={selectedExhibit}
        onCloseExhibit={() => selectExhibit(null)}
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        themeMode={themeMode}
        onToggleTheme={toggleThemeMode}
        currentGalleryName={currentGallery?.name}
      />
    </div>
  );
}
