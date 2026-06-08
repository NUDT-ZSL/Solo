import React, { useState, useEffect, useCallback } from 'react';
import { TimeCapsuleEngine } from './TimeCapsuleEngine';
import { Letter, EMOTION_LABELS, EMOTION_ICONS, EMOTION_COLORS } from './types';

interface LetterListProps {
  token: string | null;
  onBack: () => void;
}

export const LetterList: React.FC<LetterListProps> = ({ token, onBack }) => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [openingLetter, setOpeningLetter] = useState<string | null>(null);
  const [showOpenAnimation, setShowOpenAnimation] = useState(false);
  const [openedContent, setOpenedContent] = useState<Letter | null>(null);
  const engine = TimeCapsuleEngine.getInstance();

  const fetchLetters = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await engine.fetchLetters(token);
      setLetters(data);
    } catch (err: any) {
      setError(err.message || '获取信件失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleOpenLetter = async (letter: Letter) => {
    if (letter.status === 'sealed') {
      setSelectedLetter(letter);
      return;
    }

    if (letter.status === 'delivered') {
      setOpeningLetter(letter.id);
      setShowOpenAnimation(true);

      try {
        const opened = await engine.openLetter(letter.id);
        setTimeout(() => {
          setShowOpenAnimation(false);
          setOpenedContent(opened);
          setOpeningLetter(null);
          fetchLetters();
        }, 2000);
      } catch (err: any) {
        setShowOpenAnimation(false);
        setOpeningLetter(null);
        setError(err.message);
      }
      return;
    }

    if (letter.status === 'opened' && letter.content) {
      setOpenedContent(letter);
    }
  };

  const closePreview = () => {
    setSelectedLetter(null);
    setOpenedContent(null);
  };

  return (
    <div className="letter-list">
      <div className="list-header">
        <button className="back-btn" onClick={onBack} type="button">
          ← 返回
        </button>
        <h2 className="list-title">📜 我的时光胶囊</h2>
        <button className="refresh-btn" onClick={fetchLetters} type="button">
          ↻ 刷新
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>正在寻找你的时光胶囊...</p>
        </div>
      )}

      {error && <div className="list-error">⚠️ {error}</div>}

      {!loading && letters.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>还没有时光胶囊</p>
          <p className="empty-hint">去写一封寄给未来的信吧</p>
        </div>
      )}

      <div className="seal-grid">
        {letters.map((letter) => {
          const isSealed = letter.status === 'sealed';
          const isDelivered = letter.status === 'delivered';
          const emotionColor = EMOTION_COLORS[letter.emotion];

          return (
            <div
              key={letter.id}
              className={`seal-card ${letter.status}`}
              onClick={() => handleOpenLetter(letter)}
              style={{ '--seal-color': emotionColor } as React.CSSProperties}
            >
              <div className={`wax-seal ${letter.status}`}>
                {isSealed ? (
                  <div className="seal-intact">
                    <div className="seal-emblem">{EMOTION_ICONS[letter.emotion]}</div>
                    <div className="seal-ring" />
                  </div>
                ) : (
                  <div className="seal-broken">
                    <div className="seal-emblem">{EMOTION_ICONS[letter.emotion]}</div>
                    <div className="seal-crack crack-1" />
                    <div className="seal-crack crack-2" />
                    <div className="seal-crack crack-3" />
                  </div>
                )}
              </div>

              <div className="seal-info">
                <h3 className="seal-title">{letter.title}</h3>
                <div className="seal-meta">
                  <span className="seal-emotion">
                    {EMOTION_ICONS[letter.emotion]} {EMOTION_LABELS[letter.emotion]}
                  </span>
                  {isSealed && letter.remaining_days !== undefined && (
                    <span className="seal-remaining">
                      还有 {letter.remaining_days} 天
                    </span>
                  )}
                  {isDelivered && (
                    <span className="seal-ready">可以拆封</span>
                  )}
                  {letter.status === 'opened' && (
                    <span className="seal-opened">已读</span>
                  )}
                </div>
                <div className="seal-date">
                  📅 {engine.formatDate(letter.deliver_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(selectedLetter || openedContent) && (
        <div className="preview-overlay" onClick={closePreview}>
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-btn" onClick={closePreview} type="button">
              ✕
            </button>

            {selectedLetter && selectedLetter.status === 'sealed' && (
              <div className="preview-sealed">
                <div className="preview-seal-icon">🔒</div>
                <h3>{selectedLetter.title}</h3>
                <p className="preview-emotion">
                  {EMOTION_ICONS[selectedLetter.emotion]}{' '}
                  {EMOTION_LABELS[selectedLetter.emotion]}
                </p>
                <p className="preview-remaining">
                  还有 {selectedLetter.remaining_days} 天到期
                </p>
                <p className="preview-date">
                  投递日期：{engine.formatDate(selectedLetter.deliver_at)}
                </p>
                <p className="preview-wait">时光尚未到，请耐心等待</p>
              </div>
            )}

            {openedContent && (
              <div className="preview-opened fade-in">
                <div className="letter-unrolled">
                  <h3 className="letter-open-title">{openedContent.title}</h3>
                  <div className="letter-open-emotion">
                    {EMOTION_ICONS[openedContent.emotion]}{' '}
                    {EMOTION_LABELS[openedContent.emotion]}
                  </div>
                  <div className="letter-divider" />
                  <div className="letter-open-content">
                    {openedContent.content}
                  </div>
                  <div className="letter-divider" />
                  <div className="letter-open-footer">
                    <span>写于 {engine.formatDate(openedContent.created_at)}</span>
                    <span>送达于 {openedContent.delivered_at ? engine.formatDate(openedContent.delivered_at) : ''}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showOpenAnimation && (
        <div className="open-animation-overlay">
          <div className="envelope-animation">
            <div className="envelope-body">
              <div className="envelope-flap" />
              <div className="wax-seal-anim">
                <div className="seal-emblem-anim">🔒</div>
                <div className="crack-anim crack-a1" />
                <div className="crack-anim crack-a2" />
                <div className="crack-anim crack-a3" />
                <div className="crack-anim crack-a4" />
              </div>
            </div>
            <div className="letter-slide">
              <div className="letter-paper-anim" />
            </div>
          </div>
          <p className="animation-text">正在拆封时光胶囊...</p>
        </div>
      )}
    </div>
  );
};
