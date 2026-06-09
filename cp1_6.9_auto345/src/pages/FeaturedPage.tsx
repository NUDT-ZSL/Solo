import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import { api, encodeViewParams } from '@/utils/api';

export default function FeaturedPage() {
  const navigate = useNavigate();
  const featuredSnapshots = useGalleryStore((s) => s.featuredSnapshots);
  const setFeaturedSnapshots = useGalleryStore((s) => s.setFeaturedSnapshots);
  const loading = useGalleryStore((s) => s.loadingFeatured);
  const setLoading = useGalleryStore((s) => s.setLoadingFeatured);
  const setAutoTouring = useGalleryStore((s) => s.setAutoTouring);

  useEffect(() => {
    setLoading(true);
    setAutoTouring(false);
    api
      .getFeatured()
      .then((data) => setFeaturedSnapshots(data))
      .catch((err) => {
        console.error('加载热门分享失败:', err);
        const fallback = Array.from({ length: 6 }, (_, i) => ({
          id: `fallback-${i}`,
          sculptureId: `scu-00${(i % 6) + 1}`,
          sculptureTitle: ['青铜时代', '大卫', '思想者', '维纳斯', '胜利女神', '永恒之春'][i],
          position: { x: 7.5, y: 2.5, z: 7.5 },
          target: { x: 0, y: 1, z: 0 },
          zoom: 5,
          imageBase64: '',
          thumbnailBase64: '',
          clickCount: Math.max(1, 50 - i * 7)
        }));
        setFeaturedSnapshots(fallback as any);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (snapshot: any) => {
    api.recordClick(snapshot.id).catch(() => {});
    const params = encodeViewParams({
      position: snapshot.position,
      target: snapshot.target,
      zoom: snapshot.zoom,
      sculptureId: snapshot.sculptureId
    });
    navigate(`/view?${params}`);
  };

  return (
    <div className="featured-page">
      <div className="featured-header">
        <h1 className="featured-title">热门分享</h1>
        <p className="featured-subtitle">精选访客们保存的精彩视角，点击进入对应观赏位置</p>
      </div>

      {loading && featuredSnapshots.length === 0 ? (
        <div className="loading-state" style={{ minHeight: 400 }}>
          <div className="loading-spinner" />
          <span>正在加载热门分享...</span>
        </div>
      ) : featuredSnapshots.length > 0 ? (
        <div className="featured-grid">
          {featuredSnapshots.map((snap) => (
            <div
              key={snap.id}
              className="featured-card"
              onClick={() => handleCardClick(snap)}
            >
              <div className="featured-thumb">
                {snap.thumbnailBase64 || snap.imageBase64 ? (
                  <img
                    src={`data:image/png;base64,${snap.thumbnailBase64 || snap.imageBase64}`}
                    alt={snap.sculptureTitle}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff8c00',
                      fontSize: 32,
                      fontWeight: 700,
                      fontFamily: "'Noto Serif SC', serif"
                    }}
                  >
                    {snap.sculptureTitle.charAt(0)}
                  </div>
                )}
              </div>
              <div className="featured-card-body">
                <h4 className="featured-card-title">{snap.sculptureTitle}</h4>
                <div className="featured-card-meta">
                  <span className="featured-card-sclp">视角快照</span>
                  <span className="featured-card-clicks">♡ {snap.clickCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📷</div>
          <div>暂无分享数据，快去回廊生成第一个精彩视角吧！</div>
        </div>
      )}
    </div>
  );
}
