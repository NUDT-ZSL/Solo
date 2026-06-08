import { useState } from 'react';
import type { OpenedCapsule } from './types';

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
];

function BottleOpen() {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'revealing' | 'done'>(
    'idle'
  );
  const [capsule, setCapsule] = useState<OpenedCapsule | null>(null);
  const [emptyMessage, setEmptyMessage] = useState(false);
  const [reply, setReply] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [envelopeGradient] = useState(
    () => gradients[Math.floor(Math.random() * gradients.length)]
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  const handleOpen = async () => {
    setEmptyMessage(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/capsules/random');

      if (response.status === 404) {
        setEmptyMessage(true);
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCapsule(data);
        setIsLoading(false);
        setPhase('opening');

        setTimeout(() => {
          setPhase('revealing');
        }, 800);

        setTimeout(() => {
          setPhase('done');
        }, 1800);
      }
    } catch {
      setIsLoading(false);
      alert('网络错误，请稍后重试');
    }
  };

  const handleSendReply = async () => {
    if (!capsule || !reply.trim() || reply.length > 100) return;

    try {
      const response = await fetch(`/api/capsules/${capsule.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply.trim() }),
      });

      if (response.ok) {
        setReplySent(true);
      }
    } catch {
      alert('回复发送失败，请稍后重试');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setCapsule(null);
    setEmptyMessage(false);
    setReply('');
    setReplySent(false);
  };

  return (
    <div style={styles.container}>
      {phase === 'idle' && (
        <div style={styles.idleContainer}>
          <div style={styles.envelopeIdle}>
            <div
              style={{
                ...styles.envelopeBody,
                background: envelopeGradient,
              }}
            >
              <div style={styles.envelopeFlap} />
              <div style={styles.envelopeSeal}>✉️</div>
            </div>
          </div>

          <h2 style={styles.idleTitle}>海面之上</h2>
          <p style={styles.idleDesc}>
            静静漂浮的信封，等待有缘人拆开...
          </p>

          {emptyMessage && (
            <div style={styles.emptyMessage}>
              🌊 海面空空，暂时没有可以拆阅的胶囊
            </div>
          )}

          <button
            onClick={handleOpen}
            disabled={isLoading}
            style={{
              ...styles.openButton,
              ...(isLoading ? styles.openButtonDisabled : {}),
            }}
          >
            {isLoading ? '正在捞取...' : '🎣 拆开一个'}
          </button>
        </div>
      )}

      {(phase === 'opening' || phase === 'revealing') && (
        <div style={styles.animationContainer}>
          <div
            style={{
              ...styles.envelopeOpening,
              ...(phase === 'revealing' ? styles.envelopeRevealing : {}),
            }}
          >
            <div
              style={{
                ...styles.envelopeBodyLarge,
                background: envelopeGradient,
              }}
            >
              <div style={styles.envelopeFlapLarge} />
            </div>
          </div>
          <p style={styles.openingText}>正在启封...</p>
        </div>
      )}

      {phase === 'done' && capsule && (
        <div style={styles.contentContainer}>
          <div style={styles.contentCard}>
            <div style={styles.contentHeader}>
              <span style={styles.contentIcon}>💌</span>
              <span style={styles.contentMeta}>
                来自 {formatDate(capsule.createdAt)} 的心情
              </span>
            </div>

            <div
              style={styles.contentText}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(capsule.content) }}
            />

            <div style={styles.contentFooter}>
              <span style={styles.releaseInfo}>
                📅 释放日期：{formatDate(capsule.releaseAt)}
              </span>
            </div>
          </div>

          {!replySent ? (
            <div style={styles.replySection}>
              <h3 style={styles.replyTitle}>💭 想给TA回一句话吗？</h3>
              <p style={styles.replyDesc}>
                你的回复将匿名发送给原投递者（不超过100字）
              </p>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value.slice(0, 100))}
                placeholder="写下你的回复..."
                style={styles.replyTextarea}
                rows={3}
              />
              <div style={styles.replyActions}>
                <span style={styles.charCount}>{reply.length}/100</span>
                <div style={styles.replyButtons}>
                  <button onClick={handleReset} style={styles.skipButton}>
                    跳过
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={!reply.trim()}
                    style={{
                      ...styles.sendReplyButton,
                      ...(!reply.trim() ? styles.sendReplyButtonDisabled : {}),
                    }}
                  >
                    匿名发送
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.replySent}>
              <div style={styles.replySentIcon}>✅</div>
              <p style={styles.replySentText}>回复已送达，愿这份温暖被收到</p>
              <button onClick={handleReset} style={styles.continueButton}>
                继续捞取
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  envelopeIdle: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  envelopeBody: {
    width: '140px',
    height: '100px',
    borderRadius: '8px',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    animation: 'float 3s ease-in-out infinite',
  },
  envelopeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50px',
    background: 'inherit',
    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
    filter: 'brightness(0.9)',
  },
  envelopeSeal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '28px',
  },
  idleTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#F5E6CC',
    marginBottom: '8px',
  },
  idleDesc: {
    fontSize: '14px',
    color: '#A8B8CC',
    marginBottom: '28px',
  },
  emptyMessage: {
    padding: '12px 20px',
    background: 'rgba(245, 230, 204, 0.1)',
    borderRadius: '12px',
    color: '#F5E6CC',
    fontSize: '14px',
    marginBottom: '20px',
    border: '1px solid rgba(245, 230, 204, 0.2)',
  },
  openButton: {
    padding: '16px 48px',
    borderRadius: '30px',
    background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
    color: '#1A2A44',
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '1px',
    boxShadow: '0 4px 20px rgba(218, 165, 32, 0.4)',
    transition: 'all 0.3s ease',
  },
  openButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  animationContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  envelopeOpening: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  envelopeBodyLarge: {
    width: '180px',
    height: '130px',
    borderRadius: '10px',
    position: 'relative',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
    transform: 'rotateY(180deg) scale(1.2)',
    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  envelopeFlapLarge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65px',
    background: 'inherit',
    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
    filter: 'brightness(0.9)',
  },
  envelopeRevealing: {
    animation: 'fadeOut 1s ease forwards',
  },
  openingText: {
    fontSize: '15px',
    color: '#A8B8CC',
    letterSpacing: '2px',
  },
  contentContainer: {
    width: '100%',
    animation: 'fadeIn 0.5s ease',
  },
  contentCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    marginBottom: '20px',
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '16px',
    borderBottom: '1px solid #F0E8D8',
    marginBottom: '20px',
  },
  contentIcon: {
    fontSize: '24px',
  },
  contentMeta: {
    fontSize: '13px',
    color: '#8B7355',
  },
  contentText: {
    fontSize: '16px',
    lineHeight: 2,
    color: '#2D2D2D',
    minHeight: '120px',
  },
  contentFooter: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #F0E8D8',
  },
  releaseInfo: {
    fontSize: '12px',
    color: '#A89880',
  },
  replySection: {
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(245, 230, 204, 0.15)',
  },
  replyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F5E6CC',
    marginBottom: '6px',
  },
  replyDesc: {
    fontSize: '13px',
    color: '#A8B8CC',
    marginBottom: '16px',
  },
  replyTextarea: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '2px solid rgba(245, 230, 204, 0.2)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#F5E6CC',
    fontSize: '14px',
    lineHeight: 1.6,
    resize: 'none',
  },
  replyActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  charCount: {
    fontSize: '12px',
    color: '#6B7C93',
  },
  replyButtons: {
    display: 'flex',
    gap: '12px',
  },
  skipButton: {
    padding: '10px 24px',
    borderRadius: '20px',
    background: 'transparent',
    color: '#A8B8CC',
    fontSize: '14px',
    border: '1px solid rgba(168, 184, 204, 0.3)',
  },
  sendReplyButton: {
    padding: '10px 24px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
    color: '#1A2A44',
    fontSize: '14px',
    fontWeight: 600,
  },
  sendReplyButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  replySent: {
    textAlign: 'center',
    padding: '40px 20px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    border: '1px solid rgba(245, 230, 204, 0.15)',
  },
  replySentIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  replySentText: {
    fontSize: '15px',
    color: '#F5E6CC',
    marginBottom: '24px',
  },
  continueButton: {
    padding: '12px 32px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #3D5A80 0%, #2A4365 100%)',
    color: '#F5E6CC',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default BottleOpen;
