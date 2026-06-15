import { useState, useCallback } from 'react';
import MaterialGallery from './pages/MaterialGallery';
import CollageEditor from './pages/CollageEditor';

type Page = 'gallery' | 'editor';

export default function App() {
  const [page, setPage] = useState<Page>('gallery');

  const navigateToEditor = useCallback(() => setPage('editor'), []);
  const navigateToGallery = useCallback(() => setPage('gallery'), []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0EB' }}>
      {page === 'gallery' ? (
        <MaterialGallery onNavigateEditor={navigateToEditor} />
      ) : (
        <CollageEditor onBack={navigateToGallery} />
      )}
    </div>
  );
}
