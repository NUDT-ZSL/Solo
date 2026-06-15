import { useState, useEffect, useRef, useMemo } from 'react';
import type { Riddle } from '../api';

interface MainPageProps {
  riddles: Riddle[];
  loading: boolean;
  onSelectRiddle: (id: string) => void;
  onCreateRiddle: (question: string, answer: string, thanks?: string) => Promise<boolean>;
}

interface CardAnim {
  period: number;
  amplitude: number;
  phase: number;
  left: string;
  top: string;
  glowColor: string;
}

const GLOW_COLORS = [
  'rgba(255, 191, 112, 0.4)',
  'rgba(244, 154, 138, 0.4)',
  'rgba(255, 127, 127, 0.4)',
];

const GLOW_COLORS_HOVER = [
  'rgba(255, 191, 112, 0.85)',
  'rgba(244, 154, 138, 0.85)',
  'rgba(255, 127, 127, 0.85)',
];

function MainPage({ riddles, loading, onSelectRiddle, onCreateRiddle }: MainPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalFading, setModalFading] = useState(false);
  const [ripple, setRipple] = useState<{ id: number; x: number; y: number } | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [thanks, setThanks] = useState('');
  const [newCardAnim, setNewCardAnim] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());

  const cardAnimMap = useMemo(() => {
    const map = new Map<string, CardAnim>();
    riddles.forEach((riddle) => {
      if (!map.has(riddle.id)) {
        map.set(riddle.id, {
          period: 2000 + Math.random() * 2000,
          amplitude: 6 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2,
          left: `${Math.random() * 85 + 2}%`,
          top: `${Math.random() * 80 + 5}%`,
          glowColor: GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)],
        });
      }
    });
    return map;
  }, [riddles]);

  useEffect(() => {
    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;

      cardRefs.current.forEach((el, id) => {
        const anim = cardAnimMap.get(id);
        if (anim && el && hoveredCard !== id) {
          const offset = Math.sin((elapsed / anim.period) * Math.PI * 2 + anim.phase) * anim.amplitude;
          el.style.transform = `translateY(${offset}px)`;
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [cardAnimMap, hoveredCard]);

  useEffect(() => {
    if (newCardAnim) {
      const timer = setTimeout(() => setNewCardAnim(false), 600);
      return () => clearTimeout(timer);
    }
  }, [newCardAnim]);

  const handleAddClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ id: Date.now(), x, y });
    setTimeout(() => setRipple(null), 600);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setModalFading(true);
    setTimeout(() => {
      setShowModal(false);
      setModalFading(false);
      setQuestion('');
      setAnswer('');
      setThanks('');
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    setModalFading(true);
    const success = await onCreateRiddle(question.trim(), answer.trim(), thanks.trim() || undefined);
    setTimeout(() => {
      setShowModal(false);
      setModalFading(false);
      if (success) {
        setNewCardAnim(true);
        setTimeout(() => setNewCardAnim(false), 600);
      }
      setQuestion('');
      setAnswer('');
      setThanks('');
    }, 400);
  };

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  };

  const getGlowColor = (id: string, hovered: boolean) => {
    const anim = cardAnimMap.get(id);
    if (!anim) return GLOW_COLORS[0];
    const idx = GLOW_COLORS.indexOf(anim.glowColor);
    const colorIdx = idx >= 0 ? idx : 0;
    return hovered ? GLOW_COLORS_HOVER[colorIdx] : anim.glowColor;
  };

  return (
    <div
      ref={containerRef}
      className="main-page-container"
    >
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
        paddingTop: '16px',
      }}>
        <h1 className="page-title">
          谜 语 剧 场
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'rgba(200, 180, 220, 0.6)',
          letterSpacing: '2px',
        }}>
          — 午夜的星光下，我们共同编织谜题 —
        </p>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '40vh',
          color: 'rgba(200, 180, 220, 0.8)',
          fontSize: '16px',
        }}>
          星光正在汇聚...
        </div>
      ) : (
        <div className="cards-grid">
          {riddles.map((riddle, idx) => {
            const anim = cardAnimMap.get(riddle.id);
            const isNew = idx === 0 && newCardAnim;
            const isHovered = hoveredCard === riddle.id;
            const glowColor = getGlowColor(riddle.id, isHovered);

            return (
              <div
                key={riddle.id}
                ref={setCardRef(riddle.id)}
                className={`riddle-card ${isNew ? 'riddle-card-new' : ''} ${riddle.solved ? 'riddle-card-solved' : ''}`}
                onMouseEnter={() => setHoveredCard(riddle.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => onSelectRiddle(riddle.id)}
                style={{
                  transform: isHovered ? 'scale(1.1)' : undefined,
                  boxShadow: `0 0 24px ${glowColor}`,
                  borderColor: riddle.solved ? 'rgba(255, 215, 100, 0.3)' : 'rgba(150, 130, 200, 0.15)',
                }}
              >
                <div
                  className="card-glow"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${glowColor}, transparent 60%)`,
                    opacity: isHovered ? 1 : 0.6,
                  }}
                />

                <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <p className="card-question">
                    {riddle.question.length > 10 ? riddle.question.slice(0, 10) + '...' : riddle.question}
                  </p>

                  <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}>
                    <span className="card-status">
                      {riddle.solved ? '★ 已揭晓' : '待解答'}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span
                        className="attempt-dot"
                        style={{
                          background: riddle.attempts > 3 ? 'rgba(255, 150, 150, 0.8)' : 'rgba(180, 160, 220, 0.5)',
                        }}
                      />
                      <span className="attempt-count">
                        {riddle.attempts}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="add-button-wrapper">
        <button
          onClick={handleAddClick}
          className="add-button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {ripple && (
            <span
              key={ripple.id}
              className="ripple-effect"
              style={{
                left: ripple.x,
                top: ripple.y,
              }}
            />
          )}
        </button>
      </div>

      {showModal && (
        <div
          className={`modal-overlay ${modalFading ? 'modal-overlay-fading' : ''}`}
          onClick={handleCloseModal}
        >
          <div
            className={`modal-content ${modalFading ? 'modal-content-fading' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="modal-form">
              <h2 className="modal-title">
                留 下 你 的 谜 题
              </h2>

              <div className="form-group">
                <label className="form-label">
                  谜面 <span className="form-counter">({question.length}/60)</span>
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 60))}
                  placeholder="一句话描述你的谜题..."
                  className="form-input"
                  maxLength={60}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  谜底 <span className="form-counter">({answer.length}/20)</span>
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.slice(0, 20))}
                  placeholder="写下唯一的答案..."
                  className="form-input"
                  maxLength={20}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  答谢便签（可选） <span className="form-counter">({thanks.length}/30)</span>
                </label>
                <input
                  type="text"
                  value={thanks}
                  onChange={(e) => setThanks(e.target.value.slice(0, 30))}
                  placeholder="留给猜到答案的人的一句话..."
                  className="form-input"
                  maxLength={30}
                />
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-cancel"
                >
                  取 消
                </button>
                <button
                  type="submit"
                  disabled={!question.trim() || !answer.trim()}
                  className="btn-submit"
                >
                  投 入 池 中
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .main-page-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          padding: 40px 24px 120px;
          background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%);
        }

        .page-title {
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 300;
          letter-spacing: 8px;
          color: #E8D5B7;
          text-shadow: 0 0 30px rgba(232, 213, 183, 0.3);
          margin: 0 0 8px;
        }

        .cards-grid {
          position: relative;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 240px));
          gap: 24px 32px;
          justify-content: center;
          padding: 20px 0;
        }

        .riddle-card {
          position: relative;
          width: 240px;
          height: 160px;
          border-radius: 16px;
          background: rgba(10, 10, 30, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(150, 130, 200, 0.15);
          padding: 20px 18px;
          cursor: pointer;
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          z-index: 1;
          animation: none;
          will-change: transform, box-shadow;
          overflow: hidden;
        }

        .riddle-card-new {
          animation: cardPopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .riddle-card-solved .card-question {
          color: #FFD764 !important;
        }

        .riddle-card-solved .card-status {
          color: rgba(255, 215, 100, 0.8) !important;
        }

        .card-glow {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          pointer-events: none;
          transition: opacity 0.35s ease;
        }

        .card-question {
          font-size: 15px;
          line-height: 1.6;
          color: rgba(235, 230, 250, 0.9);
          letter-spacing: 0.5px;
          font-weight: 500;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .card-status {
          font-size: 11px;
          color: rgba(180, 160, 220, 0.5);
          letter-spacing: 1px;
        }

        .attempt-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .attempt-count {
          font-size: 10px;
          color: rgba(180, 160, 220, 0.6);
        }

        .add-button-wrapper {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
        }

        .add-button {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #2A1F5C 0%, #1A1040 50%, #0F0A30 100%);
          box-shadow: 0 4px 20px rgba(80, 60, 160, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }

        .add-button:hover {
          box-shadow: 0 6px 30px rgba(100, 80, 200, 0.7), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .add-button:active {
          transform: scale(0.95);
        }

        .ripple-effect {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: ripple 0.6s ease-out forwards;
          pointer-events: none;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
          opacity: 1;
          transition: opacity 0.4s ease;
        }

        .modal-overlay-fading {
          opacity: 0;
        }

        .modal-content {
          position: relative;
          width: 100%;
          max-width: 460px;
          background: linear-gradient(180deg, rgba(30, 20, 60, 0.95) 0%, rgba(15, 10, 40, 0.98) 100%);
          border-radius: 20px;
          padding: 36px 32px;
          border: 1px solid rgba(150, 130, 200, 0.25);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(120, 100, 200, 0.15);
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }

        .modal-content-fading {
          opacity: 0;
          transform: scale(0.9);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal-title {
          text-align: center;
          font-size: 22px;
          font-weight: 400;
          color: #E8D5B7;
          letter-spacing: 4px;
          margin: 0 0 8px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          color: rgba(200, 180, 220, 0.8);
          letter-spacing: 1px;
        }

        .form-counter {
          color: rgba(150, 150, 150, 0.6);
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(150, 130, 200, 0.3);
          border-radius: 10px;
          color: rgba(240, 235, 255, 0.95);
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }

        .form-input:focus {
          border-color: rgba(200, 170, 255, 0.6);
          box-shadow: 0 0 12px rgba(150, 130, 200, 0.2);
        }

        .form-buttons {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .btn-cancel {
          flex: 1;
          padding: 12px 20px;
          background: rgba(80, 70, 120, 0.4);
          border: 1px solid rgba(150, 130, 200, 0.3);
          border-radius: 10px;
          color: rgba(220, 210, 240, 0.85);
          font-size: 14px;
          letter-spacing: 2px;
          cursor: pointer;
          transition: background 0.2s ease;
          font-family: inherit;
        }

        .btn-cancel:hover {
          background: rgba(100, 90, 150, 0.5);
        }

        .btn-submit {
          flex: 1;
          padding: 12px 20px;
          background: linear-gradient(135deg, #FF8C5A 0%, #FF6B35 100%);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 2px;
          cursor: pointer;
          opacity: 1;
          transition: filter 0.2s ease, opacity 0.2s ease;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
          font-family: inherit;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-submit:hover:not(:disabled) {
          filter: brightness(1.15);
        }

        @keyframes ripple {
          0% {
            width: 4px;
            height: 4px;
            opacity: 0.8;
          }
          100% {
            width: 120px;
            height: 120px;
            opacity: 0;
          }
        }

        @keyframes cardPopIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          60% {
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .page-title {
            letter-spacing: 4px;
          }

          .cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 180px));
            gap: 16px 20px;
          }

          .riddle-card {
            width: 180px;
            height: 120px;
            padding: 14px 12px;
          }

          .card-question {
            font-size: 13px;
            line-height: 1.5;
            -webkit-line-clamp: 2;
          }
        }
      `}</style>
    </div>
  );
}

export default MainPage;
