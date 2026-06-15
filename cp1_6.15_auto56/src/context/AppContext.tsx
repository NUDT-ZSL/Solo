import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Plant, User } from '../types';
import { fetchCurrentUser } from '../api';

interface FavoriteItem {
  plantId: string;
  plant: Plant;
  addedAt: Date;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface AppContextType {
  currentUser: User | null;
  favorites: FavoriteItem[];
  sidebarOpen: boolean;
  toasts: Toast[];
  toggleFavorite: (plant: Plant) => void;
  isFavorite: (plantId: string) => boolean;
  toggleSidebar: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const res = await fetchCurrentUser();
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    };
    loadUser();
  }, []);

  const toggleFavorite = useCallback((plant: Plant) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.plantId === plant.id);
      if (exists) {
        return prev.filter(f => f.plantId !== plant.id);
      }
      return [...prev, { plantId: plant.id, plant, addedAt: new Date() }];
    });
  }, []);

  const isFavorite = useCallback((plantId: string) => {
    return favorites.some(f => f.plantId === plantId);
  }, [favorites]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        favorites,
        sidebarOpen,
        toasts,
        toggleFavorite,
        isFavorite,
        toggleSidebar,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
