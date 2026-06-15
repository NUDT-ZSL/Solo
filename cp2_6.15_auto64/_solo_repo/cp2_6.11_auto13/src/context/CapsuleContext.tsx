import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Capsule, MusicStyle, MUSIC_STYLES } from './types';

type View = 'list' | 'create' | 'detail';
type DetailPhase = 'locked' | 'opening' | 'showing';

interface CapsuleContextType {
  view: View;
  setView: (v: View) => void;
  capsules: Capsule[];
  fetchCapsules: () => Promise<void>;
  selectedCapsule: Capsule | null;
  setSelectedCapsule: (c: Capsule | null) => void;
  filterStyle: MusicStyle | 'all';
  setFilterStyle: (s: MusicStyle | 'all') => void;
  filterStatus: 'all' | 'locked' | 'unlocked';
  setFilterStatus: (s: 'all' | 'locked' | 'unlocked') => void;
  filteredCapsules: Capsule[];
  isLoading: boolean;
  setIsLoading: (b: boolean) => void;
  detailPhase: DetailPhase;
  setDetailPhase: (p: DetailPhase) => void;
  showContent: boolean;
  setShowContent: (b: boolean) => void;
  showImages: boolean[];
  setShowImages: (a: boolean[]) => void;
  volume: number;
  setVolume: (v: number) => void;
  isPlaying: boolean;
  setIsPlaying: (b: boolean) => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  handleCreate: (data: { title: string; content: string; images: string[]; musicStyle: MusicStyle; unlockDate: string }) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleViewDetail: (capsule: Capsule) => void;
  togglePlay: () => void;
  navigateToList: () => void;
}

const CapsuleContext = createContext<CapsuleContextType | null>(null);

export const useCapsuleContext = () => {
  const ctx = useContext(CapsuleContext);
  if (!ctx) throw new Error('useCapsuleContext must be used within CapsuleProvider');
  return ctx;
};

export const CapsuleProvider = ({ children }: { children: ReactNode }) => {
  const [view, setView] = useState<View>('list');
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [filterStyle, setFilterStyle] = useState<MusicStyle | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>('locked');
  const [showContent, setShowContent] = useState(false);
  const [showImages, setShowImages] = useState<boolean[]>([]);
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchCapsules = useCallback(async () => {
    try {
      const res = await fetch('/api/capsules');
      const data = await res.json();
      setCapsules(data);
    } catch (err) {
      console.error('获取胶囊列表失败', err);
    }
  }, []);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  const handleCreate = useCallback(async (data: {
    title: string;
    content: string;
    images: string[];
    musicStyle: MusicStyle;
    unlockDate: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchCapsules();
        setView('list');
      } else {
        const err = await res.json();
        alert(err.error || '创建失败');
      }
    } catch (err) {
      alert('创建胶囊失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCapsules]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/capsules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCapsules();
      } else {
        const err = await res.json();
        alert(err.error || '删除失败');
      }
    } catch (err) {
      alert('删除胶囊失败，请重试');
    }
  }, [fetchCapsules]);

  const handleViewDetail = useCallback((capsule: Capsule) => {
    setSelectedCapsule(capsule);
    setDetailPhase(capsule.isUnlocked ? 'opening' : 'locked');
    setShowContent(false);
    setShowImages([]);
    setView('detail');

    if (capsule.isUnlocked) {
      setTimeout(() => {
        setDetailPhase('showing');
        setShowContent(true);
      }, 1200);
    }
  }, []);

  useEffect(() => {
    if (detailPhase === 'showing' && selectedCapsule) {
      const timers: NodeJS.Timeout[] = [];
      selectedCapsule.images.forEach((_, index) => {
        timers.push(
          setTimeout(() => {
            setShowImages((prev) => {
              const next = [...prev];
              next[index] = true;
              return next;
            });
          }, 1200 + index * 500)
        );
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [detailPhase, selectedCapsule]);

  useEffect(() => {
    if (view === 'detail' && selectedCapsule?.isUnlocked && audioRef.current) {
      audioRef.current.volume = volume;
      const playAudio = async () => {
        try {
          await audioRef.current?.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('自动播放被阻止，需要用户交互');
        }
      };
      const timer = setTimeout(playAudio, 1000);
      return () => clearTimeout(timer);
    }
  }, [view, selectedCapsule, detailPhase, volume]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const navigateToList = useCallback(() => {
    setView('list');
    setSelectedCapsule(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const filteredCapsules = capsules.filter((c) => {
    if (filterStyle !== 'all' && c.musicStyle !== filterStyle) return false;
    if (filterStatus === 'locked' && c.isUnlocked) return false;
    if (filterStatus === 'unlocked' && !c.isUnlocked) return false;
    return true;
  });

  const value: CapsuleContextType = {
    view, setView,
    capsules, fetchCapsules,
    selectedCapsule, setSelectedCapsule,
    filterStyle, setFilterStyle,
    filterStatus, setFilterStatus,
    filteredCapsules,
    isLoading, setIsLoading,
    detailPhase, setDetailPhase,
    showContent, setShowContent,
    showImages, setShowImages,
    volume, setVolume,
    isPlaying, setIsPlaying,
    audioRef,
    handleCreate, handleDelete, handleViewDetail,
    togglePlay, navigateToList,
  };

  return <CapsuleContext.Provider value={value}>{children}</CapsuleContext.Provider>;
};
