import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BandEvent, Song, MemberName } from '../types';
import api from '../api';

interface AppContextValue {
  events: BandEvent[];
  songs: Song[];
  currentUser: MemberName;
  setCurrentUser: (name: MemberName) => void;
  refreshEvents: () => Promise<void>;
  refreshSongs: () => Promise<void>;
  addEvent: (data: Partial<BandEvent>) => Promise<void>;
  updateEvent: (id: string, data: Partial<BandEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateSong: (id: string, data: Partial<Song>) => Promise<void>;
  updateSongsOrder: (songs: Partial<Song>[]) => Promise<void>;
  notification: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentUser, setCurrentUser] = useState<MemberName>('鼓手');
  const [notification, setNotification] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    const data = await api.fetchEvents();
    setEvents(data);
  }, []);

  const refreshSongs = useCallback(async () => {
    const data = await api.fetchSongs();
    setSongs(data);
  }, []);

  useEffect(() => {
    refreshEvents();
    refreshSongs();
  }, [refreshEvents, refreshSongs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      for (const ev of events) {
        const evTime = new Date(ev.datetime);
        const diff = evTime.getTime() - now.getTime();
        if (diff > 0 && diff <= 15 * 60 * 1000 && diff > 14 * 60 * 1000) {
          setNotification(`距离${ev.title}还有15分钟！`);
          setTimeout(() => setNotification(null), 5000);
          break;
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [events]);

  const addEvent = useCallback(async (data: Partial<BandEvent>) => {
    await api.createEvent(data);
    await refreshEvents();
  }, [refreshEvents]);

  const updateEvent = useCallback(async (id: string, data: Partial<BandEvent>) => {
    await api.updateEvent(id, data);
    await refreshEvents();
  }, [refreshEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    await api.deleteEvent(id);
    await refreshEvents();
  }, [refreshEvents]);

  const updateSong = useCallback(async (id: string, data: Partial<Song>) => {
    await api.updateSong(id, data);
    await refreshSongs();
  }, [refreshSongs]);

  const updateSongsOrder = useCallback(async (songList: Partial<Song>[]) => {
    await api.updateSongs(songList);
    await refreshSongs();
  }, [refreshSongs]);

  const value: AppContextValue = {
    events, songs, currentUser, setCurrentUser,
    refreshEvents, refreshSongs,
    addEvent, updateEvent, deleteEvent,
    updateSong, updateSongsOrder,
    notification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
