import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, X, Sparkles, Clock } from "lucide-react";
import { useCapsuleStore } from "@/store/capsuleStore";
import { isExpired, getRemainingTime, formatDate } from "@/utils/CapsuleManager";
import type { Capsule } from "@/utils/CapsuleManager";

interface CapsulePosition {
  id: string;
  x: number;
  y: number;
  size: number;
  floatDelay: number;
  rotateDuration: number;
  floatDuration: number;
  floatDistance: number;
}

function generatePositions(capsules: Capsule[]): CapsulePosition[] {
  const usedPositions: { x: number; y: number }[] = [];
  return capsules.map((capsule) => {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = 5 + Math.random() * 85;
      y = 5 + Math.random() * 80;
      attempts++;
    } while (
      attempts < 50 &&
      usedPositions.some(
        (p) => Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 12
      )
    );
    usedPositions.push({ x, y });
    return {
      id: capsule.id,
      x,
      y,
      size: 40 + Math.random() * 30,
      floatDelay: Math.random() * -5,
      rotateDuration: 8 + Math.random() * 12,
      floatDuration: 3 + Math.random() * 4,
      floatDistance: 8 + Math.random() * 16,
    };
  });
}

function CreateCapsuleModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (content: string, daysOffset: number) => void;
}) {
  const [content, setContent] = useState("");
  const [daysOffset, setDaysOffset] = useState(7);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim(), daysOffset);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 className="modal-title">
          <Sparkles size={22} />
          写一封给未来的信
        </h2>
        <textarea
          className="capsule-textarea"
          maxLength={300}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="此刻的心情、期待、祝福...写给未来的自己"
        />
        <div className="char-count">{content.length}/300</div>
        <div className="time-options">
          <p className="time-label">
            <Clock size={16} />
            选择解封时间
          </p>
          <div className="time-buttons">
            {[
              { days: 7, label: "7天后" },
              { days: 30, label: "30天后" },
              { days: 365, label: "365天后" },
            ].map((opt) => (
              <button
                key={opt.days}
                className={`time-btn ${daysOffset === opt.days ? "active" : ""}`}
                onClick={() => setDaysOffset(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          封存胶囊
        </button>
      </div>
    </div>
  );
}

function CapsuleDetailModal({
  capsule,
  onClose,
}: {
  capsule: Capsule;
  onClose: () => void;
}) {
  const expired = isExpired(capsule);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card detail-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div
          className="detail-capsule-glow"
          style={{ background: capsule.gradientColor }}
        />
        {expired ? (
          <div className="detail-content">
            <p className="detail-date">
              写于 {formatDate(capsule.createdAt)}
            </p>
            <p className="detail-unlock">
              解封于 {formatDate(capsule.unlockAt)}
            </p>
            <div className="detail-letter">{capsule.content}</div>
          </div>
        ) : (
          <div className="detail-content">
            <p className="detail-date">
              写于 {formatDate(capsule.createdAt)}
            </p>
            <p className="detail-unlock">
              解封于 {formatDate(capsule.unlockAt)}
            </p>
            <div className="detail-locked">
              <Clock size={32} />
              <p>尚未到达时间</p>
              <p className="detail-remaining">
                {getRemainingTime(capsule)}后开启
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { capsules, loadCapsules, addCapsule } = useCapsuleStore();
  const [positions, setPositions] = useState<CapsulePosition[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navigate = useNavigate();
  const prevLenRef = useRef(0);

  useEffect(() => {
    loadCapsules();
  }, [loadCapsules]);

  useEffect(() => {
    if (capsules.length !== prevLenRef.current) {
      prevLenRef.current = capsules.length;
      setPositions(generatePositions(capsules));
    }
  }, [capsules]);

  const handleCreate = useCallback(
    (content: string, daysOffset: number) => {
      addCapsule(content, daysOffset);
    },
    [addCapsule]
  );

  const stars = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${1.5 + Math.random() * 2}s`,
    }));
  }, []);

  return (
    <div className="home-page">
      <div className="scene-bg">
        <div className="scene-stars">
          {stars.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                left: s.left,
                top: s.top,
                animationDelay: s.delay,
                animationDuration: s.duration,
              }}
            />
          ))}
        </div>
        {capsules.map((capsule, index) => {
          const pos = positions[index];
          if (!pos) return null;
          return (
            <div
              key={capsule.id}
              className={`floating-capsule ${hoveredId === capsule.id ? "hovered" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.size}px`,
                height: `${pos.size}px`,
                animationDelay: `${pos.floatDelay}s`,
                "--rotate-duration": `${pos.rotateDuration}s`,
                "--float-duration": `${pos.floatDuration}s`,
                "--float-distance": `${pos.floatDistance}px`,
              } as React.CSSProperties}
              onMouseEnter={() => setHoveredId(capsule.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedCapsule(capsule)}
            >
              <div
                className="capsule-inner"
                style={{ background: capsule.gradientColor }}
              />
              <div
                className="capsule-glow"
                style={{ background: capsule.gradientColor }}
              />
              {hoveredId === capsule.id && (
                <div className="capsule-date-tag glass-card">
                  {formatDate(capsule.unlockAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <nav className="home-nav">
        <div className="nav-brand">记忆旅栈</div>
        <div className="nav-actions">
          <button className="nav-link" onClick={() => navigate("/archive")}>
            回忆走廊
          </button>
          <button className="create-btn" onClick={() => setShowCreate(true)}>
            <PenLine size={18} />
            写信
          </button>
        </div>
      </nav>

      {capsules.length === 0 && (
        <div className="empty-hint">
          <Sparkles size={48} />
          <p>还没有记忆胶囊</p>
          <p className="empty-sub">点击「写信」创建你的第一个时空胶囊</p>
        </div>
      )}

      {showCreate && (
        <CreateCapsuleModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {selectedCapsule && (
        <CapsuleDetailModal
          capsule={selectedCapsule}
          onClose={() => setSelectedCapsule(null)}
        />
      )}
    </div>
  );
}
