import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, ArrowLeft, Ship } from 'lucide-react';
import { useOceanStore } from '@/store/oceanStore';

interface PaperBoat {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  progress: number;
}

export default function IslandPage() {
  const navigate = useNavigate();
  const { collectedPoems, releasePoem, loadCollected } = useOceanStore();
  const [paperBoats, setPaperBoats] = useState<PaperBoat[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    loadCollected();
  }, [loadCollected]);

  useEffect(() => {
    setVisibleCount(0);
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= collectedPoems.length) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [collectedPoems.length]);

  useEffect(() => {
    if (paperBoats.length === 0) return;

    const animate = () => {
      setPaperBoats((prev) => {
        const updated = prev
          .map((boat) => ({
            ...boat,
            progress: Math.min(boat.progress + 0.015, 1),
            x: boat.startX + (boat.progress + 0.015) * 300,
            y: boat.startY - (boat.progress + 0.015) * 80 + Math.sin((boat.progress + 0.015) * 8) * 10,
          }))
          .filter((boat) => boat.progress < 1);
        return updated;
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [paperBoats.length]);

  const handleRelease = (id: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setPaperBoats((prev) => [
      ...prev,
      { id, x, y, startX: x, startY: y, progress: 0 },
    ]);

    setTimeout(() => releasePoem(id), 300);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="island-page">
      <nav className="island-nav">
        <button className="nav-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          返回海洋
        </button>
        <h1 className="island-title">
          <Waves size={22} />
          我的浮岛
        </h1>
        <div className="nav-spacer" />
      </nav>

      {collectedPoems.length === 0 ? (
        <div className="island-empty">
          <p className="empty-text">你的小岛还空空如也</p>
          <p className="empty-hint">去海洋中捞起一些诗歌吧</p>
          <button className="empty-btn" onClick={() => navigate('/')}>
            前往海洋
          </button>
        </div>
      ) : (
        <div className="poem-grid">
          {collectedPoems.slice(0, visibleCount).map((poem, index) => (
            <div
              key={poem.id}
              className="poem-grid-card"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <h4 className="grid-card-title">{poem.title}</h4>
              <div className="grid-card-content">
                {poem.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="grid-card-footer">
                <span className="grid-card-time">{formatDate(poem.createdAt)}</span>
                <button
                  className="release-btn"
                  onClick={(e) => handleRelease(poem.id, e)}
                >
                  <Ship size={14} />
                  放生
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {paperBoats.map((boat) => (
        <div
          key={boat.id}
          className="paper-boat"
          style={{
            left: `${boat.x}px`,
            top: `${boat.y}px`,
            opacity: 1 - boat.progress,
            transform: `scale(${1 - boat.progress * 0.5}) rotate(${-boat.progress * 15}deg)`,
          }}
        >
          📝⛵
        </div>
      ))}
    </div>
  );
}
