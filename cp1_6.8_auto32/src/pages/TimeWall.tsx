import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCapsuleStore, Capsule } from '@/utils/CapsuleEngine';
import { WallRenderer } from '@/utils/WallRenderer';
import CapsuleModal from '@/components/CapsuleModal';
import BottomNav from '@/components/BottomNav';
import { Plus } from 'lucide-react';

export default function TimeWall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WallRenderer | null>(null);
  const capsules = useCapsuleStore((s) => s.capsules);
  const openCapsule = useCapsuleStore((s) => s.openCapsule);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCapsuleClick = useCallback((capsule: Capsule) => {
    setSelectedCapsule(capsule);
  }, []);

  const handleCapsuleHover = useCallback((_capsule: Capsule | null, _x: number, _y: number) => {}, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new WallRenderer(canvasRef.current, {
      onCapsuleClick: handleCapsuleClick,
      onCapsuleHover: handleCapsuleHover,
    });
    rendererRef.current = renderer;
    renderer.init(capsules);
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateCapsules(capsules);
    }
  }, [capsules]);

  useEffect(() => {
    const state = location.state as { flyCapsule?: Capsule } | null;
    if (state?.flyCapsule && rendererRef.current) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.7;
      rendererRef.current.addFlyingCapsule(state.flyCapsule, cx, cy);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0a1a' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      <div className="absolute top-0 left-0 right-0 px-5 pt-6 pb-3 z-10 pointer-events-none">
        <h1
          className="text-2xl md:text-3xl font-bold tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          时痕胶囊
        </h1>
        <p className="text-white/25 text-xs mt-1 tracking-wider">
          写给未来，静待时光
        </p>
      </div>

      <button
        onClick={() => navigate('/create')}
        className="absolute bottom-24 right-5 md:right-8 z-30 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #2dd4a8, #06b6d4)',
          boxShadow: '0 0 30px rgba(45,212,168,0.35), 0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <Plus size={24} className="text-white" />
      </button>

      <BottomNav />

      {selectedCapsule && (
        <CapsuleModal
          capsule={selectedCapsule}
          onClose={() => setSelectedCapsule(null)}
          onOpen={(id) => {
            openCapsule(id);
            setSelectedCapsule((prev) => prev ? { ...prev, isOpened: true } : null);
          }}
        />
      )}
    </div>
  );
}
