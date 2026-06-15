import React, { useState, useCallback, useRef } from 'react';
import { Album } from './data';
import AlbumList from './AlbumList';
import TrackViewer from './TrackViewer';
import './styles.css';

const App: React.FC = () => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [previousAlbumId, setPreviousAlbumId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const switchTimeoutRef = useRef<number | null>(null);

  const handleSelectAlbum = useCallback(
    (album: Album) => {
      if (selectedAlbum?.id === album.id && !switching) {
        return;
      }

      if (switchTimeoutRef.current !== null) {
        window.clearTimeout(switchTimeoutRef.current);
      }

      if (selectedAlbum) {
        setPreviousAlbumId(selectedAlbum.id);
        setSwitching(true);
        switchTimeoutRef.current = window.setTimeout(() => {
          setSelectedAlbum(album);
          setAnimationKey((prev) => prev + 1);
          switchTimeoutRef.current = window.setTimeout(() => {
            setSwitching(false);
            setPreviousAlbumId(null);
            switchTimeoutRef.current = null;
          }, 500);
        }, 500);
      } else {
        setSelectedAlbum(album);
        setAnimationKey((prev) => prev + 1);
      }
    },
    [selectedAlbum, switching]
  );

  return (
    <div className="app-container">
      <AlbumList
        selectedAlbumId={selectedAlbum?.id ?? null}
        onSelectAlbum={handleSelectAlbum}
        switching={switching}
        previousAlbumId={previousAlbumId}
      />
      <TrackViewer album={selectedAlbum} animationKey={animationKey} />
    </div>
  );
};

export default App;
