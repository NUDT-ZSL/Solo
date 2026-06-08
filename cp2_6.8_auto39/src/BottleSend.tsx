import { useState } from 'react';
import type { CapsuleRecord } from './types';

interface Props {
  onSend: (record: CapsuleRecord) => void;
}

function BottleSend({ onSend }: Props) {
  const [content, setContent] = useState('');
  const [releaseMonths, setReleaseMonths] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const formatMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), releaseMonths }),
      });

      if (response.ok) {
        const data = await response.json();
        onSend({
          id: data.id,
          createdAt: data.createdAt,
          releaseAt: data.releaseAt,
        });
        setContent('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch {
      alert('投递失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {showSuccess && (
        <div style={styles.successToast}>
          ✅ 心情已投递，正在漂流中...
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📮 投递漂流瓶</h2>
          <p style={styles.cardDesc}>
            写下此刻的心情，让它在 {releaseMonths} 个月后漂向陌生人
          </p>
        </div>

        <div style={styles.editorWrapper}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              '在这里写下你的心情...\n\n支持简单的Markdown语法：\n**加粗文字** 可以让重点更醒目\n\n换行只需按下回车键'
            }
            style={styles.textarea}
            rows={10}
          />
          {content && (
            <div style={styles.preview}>
              <div style={styles.previewLabel}>预览效果：</div>
              <div
                style={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
              />
            </div>
          )}
        </div>

        <div style={styles.releaseSection}>
          <div style={styles.releaseLabel}>选择释放日期：</div>
          <div style={styles.releaseButtons}>
            {[1, 2, 3].map((month) => (
              <button
                key={month}
                onClick={() => setReleaseMonths(month as 1 | 2 | 3)}
                style={{
                  ...styles.releaseButton,
                  ...(releaseMonths === month
                    ? styles.releaseButtonActive
                    : {}),
                }}
              >
                {month}个月后
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          style={{
            ...styles.submitButton,
            ...((!content.trim() || isSubmitting)
              ? styles.submitButtonDisabled
              : {}),
          }}
        >
          {isSubmitting ? '投递中...' : '🌊 投入大海'}
        </button>

        <div style={styles.tips}>
          <span style={styles.tipsTitle}>💡 小贴士：</span>
          <span style={styles.tipsText}>
            你的心情将在所选日期后被随机陌生人拆阅，请放心，这是完全匿名的。
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  successToast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '24px',
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  },
  cardHeader: {
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1A2A44',
    marginBottom: '6px',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#6B7C93',
  },
  editorWrapper: {
    marginBottom: '20px',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #E8E0D0',
    fontSize: '15px',
    lineHeight: 1.7,
    resize: 'vertical',
    minHeight: '180px',
    color: '#1A2A44',
    background: '#FFFEFA',
    transition: 'border-color 0.3s ease',
  },
  preview: {
    marginTop: '12px',
    padding: '16px',
    background: '#F9F5EC',
    borderRadius: '12px',
    border: '1px dashed #E8E0D0',
  },
  previewLabel: {
    fontSize: '12px',
    color: '#8B7355',
    marginBottom: '8px',
    fontWeight: 500,
  },
  previewContent: {
    fontSize: '14px',
    lineHeight: 1.8,
    color: '#3D3D3D',
  },
  releaseSection: {
    marginBottom: '24px',
  },
  releaseLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1A2A44',
    marginBottom: '12px',
  },
  releaseButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  releaseButton: {
    flex: 1,
    minWidth: '100px',
    padding: '14px 20px',
    borderRadius: '12px',
    background: '#F5F0E5',
    color: '#6B5D4D',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  releaseButtonActive: {
    background:
      'linear-gradient(135deg, #3D5A80 0%, #5C7A9E 50%, #3D5A80 100%)',
    backgroundSize: '200% 200%',
    color: '#F5E6CC',
    borderColor: 'rgba(61, 90, 128, 0.5)',
    animation: 'wave 3s ease infinite',
    boxShadow: '0 4px 12px rgba(61, 90, 128, 0.3)',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #1A2A44 0%, #2A4365 100%)',
    color: '#F5E6CC',
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(26, 42, 68, 0.3)',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  tips: {
    marginTop: '20px',
    padding: '12px 16px',
    background: '#FFF8E7',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  tipsTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#B8860B',
    flexShrink: 0,
  },
  tipsText: {
    fontSize: '13px',
    color: '#8B7355',
    lineHeight: 1.6,
  },
};

export default BottleSend;
