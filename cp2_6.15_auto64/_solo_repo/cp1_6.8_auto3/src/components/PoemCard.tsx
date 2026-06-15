import { X, Fish } from 'lucide-react';
import { useOceanStore } from '@/store/oceanStore';
import { isPoemCollected } from '@/utils/IslandStorage';

export default function PoemCard() {
  const { poemCardData, setPoemCardData, collectPoem } = useOceanStore();

  if (!poemCardData) return null;

  const alreadyCollected = isPoemCollected(poemCardData.id);

  const handleClose = () => {
    setPoemCardData(null);
  };

  const handleCollect = () => {
    collectPoem(poemCardData.id);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card poem-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <X size={18} />
        </button>
        <h3 className="poem-card-title">{poemCardData.title}</h3>
        <div className="poem-card-content">
          {poemCardData.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="poem-card-footer">
          <span className="poem-card-time">{formatDate(poemCardData.createdAt)}</span>
          {alreadyCollected ? (
            <span className="collected-tag">已在小岛</span>
          ) : (
            <button className="collect-btn" onClick={handleCollect}>
              <Fish size={16} />
              捞起
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
