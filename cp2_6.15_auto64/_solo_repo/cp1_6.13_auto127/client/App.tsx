import { useState, useEffect, useCallback } from 'react';
import Gallery from './Gallery';
import Slideshow from './Slideshow';
import Uploader from './Uploader';
import { getPhotos, getTags } from './photoService';
import type { Photo, Tag } from './types';

const PAGE_SIZE = 20;

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const loadPhotos = useCallback(async (currentOffset: number, tagFilter: string[], reset: boolean) => {
    setIsLoading(true);
    try {
      const response = await getPhotos(PAGE_SIZE, currentOffset, tagFilter);
      if (reset) {
        setPhotos(response.photos);
      } else {
        setPhotos((prev) => [...prev, ...response.photos]);
      }
      setHasMore(response.hasMore);
      setOffset(currentOffset + PAGE_SIZE);
    } catch (err) {
      console.error('加载作品失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllTags = useCallback(async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      console.error('加载标签失败:', err);
    }
  }, []);

  useEffect(() => {
    loadPhotos(0, [], true);
    loadAllTags();
  }, [loadPhotos, loadAllTags]);

  useEffect(() => {
    setPhotos([]);
    setOffset(0);
    setHasMore(true);
    loadPhotos(0, selectedTags, true);
  }, [selectedTags, loadPhotos]);

  const handleTagToggle = useCallback((tagName: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagName)) {
        return prev.filter((t) => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    loadPhotos(offset, selectedTags, false);
  }, [isLoading, hasMore, offset, selectedTags, loadPhotos]);

  const handlePhotoClick = useCallback((_photo: Photo, index: number) => {
    setCurrentPhotoIndex(index);
    setIsSlideshowOpen(true);
  }, []);

  const handleCloseSlideshow = useCallback(() => {
    setIsSlideshowOpen(false);
  }, []);

  const handleNextPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => {
      if (prev >= photos.length - 1) return 0;
      return prev + 1;
    });
  }, [photos.length]);

  const handlePrevPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => {
      if (prev <= 0) return photos.length - 1;
      return prev - 1;
    });
  }, [photos.length]);

  const handleUploadComplete = useCallback(() => {
    setPhotos([]);
    setOffset(0);
    setHasMore(true);
    loadPhotos(0, selectedTags, true);
    loadAllTags();
  }, [selectedTags, loadPhotos, loadAllTags]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1200,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#1e293b',
              fontFamily: "'Playfair Display', serif",
              letterSpacing: '0.5px',
            }}
          >
            LensGallery
          </h1>
          <Uploader existingTags={tags} onUploadComplete={handleUploadComplete} />
        </div>
      </nav>

      <main style={{ paddingTop: 64 }}>
        <Gallery
          photos={photos}
          tags={tags}
          selectedTags={selectedTags}
          isLoading={isLoading}
          hasMore={hasMore}
          onTagToggle={handleTagToggle}
          onPhotoClick={handlePhotoClick}
          onLoadMore={handleLoadMore}
        />
      </main>

      <Slideshow
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={isSlideshowOpen}
        onClose={handleCloseSlideshow}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
      />
    </div>
  );
}
