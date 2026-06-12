import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PhotoGridPage from './components/PhotoGridPage';
import AlbumViewer from './components/AlbumViewer';
import { albums, type Album } from './data/albums';

export default function App() {
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);

  const handleSelectAlbum = (album: Album) => {
    setCurrentAlbum(album);
  };

  const handleBack = () => {
    setCurrentAlbum(null);
  };

  return (
    <AnimatePresence mode="wait">
      {currentAlbum ? (
        <motion.div
          key="album"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%' }}
        >
          <AlbumViewer album={currentAlbum} onBack={handleBack} />
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%' }}
        >
          <PhotoGridPage albums={albums} onSelectAlbum={handleSelectAlbum} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
