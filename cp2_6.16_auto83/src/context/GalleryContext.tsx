import React, { createContext, useContext, ReactNode } from 'react';
import { useGallery } from '../hooks/useGallery';
import type { Painting } from '../types';

interface GalleryContextType {
  paintings: Painting[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deletePainting: (id: string) => Promise<boolean>;
  uploadPainting: (data: Omit<Painting, 'id' | 'createdAt'>) => Promise<Painting | null>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const gallery = useGallery();

  return (
    <GalleryContext.Provider value={gallery}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGalleryContext = (): GalleryContextType => {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGalleryContext must be used within a GalleryProvider');
  }
  return context;
};
