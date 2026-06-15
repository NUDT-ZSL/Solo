import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLocation, useNavigate } from 'react-router-dom';
import SculptureViewer from '@/components/SculptureViewer';
import InfoPanel from '@/components/InfoPanel';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import { api, decodeViewParams } from '@/utils/api';

export default function GalleryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const sculptures = useGalleryStore((s) => s.sculptures);
  const setSculptures = useGalleryStore((s) => s.setSculptures);
  const loading = useGalleryStore((s) => s.loadingSculptures);
  const setLoading = useGalleryStore((s) => s.setLoadingSculptures);
  const selectSculpture = useGalleryStore((s) => s.selectSculpture);

  const initialView = useMemo(() => {
    const search = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    return decodeViewParams(search);
  }, [location.search]);

  useEffect(() => {
    setLoading(true);
    api
      .getSculptures()
      .then((data) => {
        setSculptures(data);
        if (initialView?.sculptureId) {
          setTimeout(() => selectSculpture(initialView.sculptureId), 400);
        }
      })
      .catch((err) => {
        console.error('加载雕塑失败:', err);
        const fallback = [
          { id: 'scu-001', title: '青铜时代', artist: '奥古斯特·罗丹', description: '罗丹的代表作之一。', materialType: '青铜', modelUrl: '', geometryType: 'torusKnot', color: '#cd7f32', scale: 1.2 },
          { id: 'scu-002', title: '大卫', artist: '米开朗基罗', description: '文艺复兴巅峰之作。', materialType: '大理石', modelUrl: '', geometryType: 'dodecahedron', color: '#f5f5f5', scale: 1.5 },
          { id: 'scu-003', title: '思想者', artist: '奥古斯特·罗丹', description: '深沉思考的姿态。', materialType: '青铜', modelUrl: '', geometryType: 'icosahedron', color: '#8b4513', scale: 1.0 },
          { id: 'scu-004', title: '维纳斯', artist: '亚历山德罗斯', description: '古希腊美之象征。', materialType: '大理石', modelUrl: '', geometryType: 'octahedron', color: '#f0ebe0', scale: 1.3 },
          { id: 'scu-005', title: '胜利女神', artist: '古希腊佚名', description: '动感与优雅结合。', materialType: '大理石', modelUrl: '', geometryType: 'tetrahedron', color: '#e8e0d0', scale: 1.4 },
          { id: 'scu-006', title: '永恒之春', artist: '奥古斯特·罗丹', description: '爱情主题雕塑。', materialType: '青铜', modelUrl: '', geometryType: 'torus', color: '#b87333', scale: 1.1 }
        ];
        setSculptures(fallback as any);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleBlankClick = () => {
    selectSculpture(null);
    if (location.pathname === '/view' && location.search) {
      navigate('/');
    }
  };

  return (
    <div className="scene-container" onClick={handleBlankClick}>
      {loading && sculptures.length === 0 ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>正在加载雕塑作品...</span>
        </div>
      ) : sculptures.length > 0 ? (
        <Canvas
          className="canvas-wrapper"
          shadows
          camera={{ position: [7.5, 2.5, 7.5], fov: 50, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          onClick={(e) => e.stopPropagation()}
        >
          <SculptureViewer
            initialView={initialView || undefined}
            initialSculptureId={initialView?.sculptureId}
          />
        </Canvas>
      ) : (
        <div className="loading-state">暂无作品数据</div>
      )}
      <InfoPanel />
    </div>
  );
}
