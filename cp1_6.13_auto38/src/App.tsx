import { useEffect, useState } from 'react';
import Scene3D from '@/components/Scene3D';
import TopBar from '@/components/TopBar';
import FPSCounter from '@/components/FPSCounter';
import SidePanel from '@/components/SidePanel';
import TimelineSlider from '@/components/TimelineSlider';
import FossilDetailModal from '@/components/FossilDetailModal';
import { useStrataStore } from '@/store/useStrataStore';
import type { Layer } from '@/types';

export default function App() {
  const setLayers = useStrataStore((s) => s.setLayers);
  const setIsMobile = useStrataStore((s) => s.setIsMobile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/layers');
        if (!res.ok) throw new Error('Failed to load layers');
        const data: Layer[] = await res.json();
        if (!cancelled) {
          setLayers(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setLayers]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0f172a] text-white">
      <div className="absolute inset-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400">正在加载地层数据...</div>
          </div>
        ) : (
          <Scene3D />
        )}
      </div>
      <TopBar />
      <FPSCounter />
      <SidePanel />
      <TimelineSlider />
      <FossilDetailModal />
    </div>
  );
}
