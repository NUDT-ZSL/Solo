import { useEffect, useRef, useCallback } from "react";
import { GalleryEngine } from "./GalleryEngine";
import { useGalleryStore } from "./store";
import { ArtworkService } from "./ArtworkService";

export default function GalleryCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GalleryEngine | null>(null);
  const { artworks, setArtworks, selectArtwork, addArtwork, isTablet } =
    useGalleryStore();

  const handleArtworkClick = useCallback(
    (data: { id: string }) => {
      const artwork = useGalleryStore.getState().artworks.find(
        (a) => a.id === data.id
      );
      if (artwork) {
        selectArtwork(artwork);
      }
    },
    [selectArtwork]
  );

  useEffect(() => {
    if (isTablet || !containerRef.current) return;

    const engine = new GalleryEngine(containerRef.current);
    engineRef.current = engine;
    engine.setOnArtworkClick(handleArtworkClick);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [isTablet, handleArtworkClick]);

  useEffect(() => {
    if (isTablet || !engineRef.current) return;
    const engine = engineRef.current;
    const existingIds = new Set(
      artworks.slice(0, -1).map((a) => a.id)
    );
    artworks.forEach((artwork) => {
      if (!existingIds.has(artwork.id)) {
        engine.addArtwork(artwork);
      }
    });
  }, [artworks, isTablet]);

  useEffect(() => {
    ArtworkService.fetchArtworks(1, 50).then((res) => {
      setArtworks(res.artworks);
    });
  }, [setArtworks]);

  useEffect(() => {
    if (isTablet || !engineRef.current) return;
    const existingIds = new Set(artworks.map((a) => a.id));
    artworks.forEach((artwork) => {
      if (!existingIds.has(artwork.id)) {
        addArtwork(artwork);
      }
    });
  }, [artworks, isTablet, addArtwork]);

  if (isTablet) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: "grab" }}
    />
  );
}
