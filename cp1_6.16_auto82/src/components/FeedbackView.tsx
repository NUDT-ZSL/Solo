import { useState, useEffect, useRef, useCallback } from 'react';
import { AlignmentResult, PhonemeError, extractWaveformSamples } from '../utils/audioProcessor';

interface FeedbackViewProps {
  result: AlignmentResult;
  sampleId: string;
  onRetry: () => void;
  onBack: () => void;
}

function FeedbackView({ result, onRetry, onBack }: FeedbackViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffsetStart, setDragOffsetStart] = useState(0);
  const [activeErrorIndex, setActiveErrorIndex] = useState<number | null>(null);
  const [userWaveformSamples, setUserWaveformSamples] = useState<Float32Array>(new Float32Array());
  const [referenceWaveformSamples, setReferenceWaveformSamples] = useState<Float32Array>(new Float32Array());

  useEffect(() => {
    const targetSamples = 1000;
    const userSamples = extractWaveformSamples(result.userWaveform, targetSamples);
    const refSamples = extractWaveformSamples(result.referenceWaveform, targetSamples);
    setUserWaveformSamples(userSamples);
    setReferenceWaveformSamples(refSamples);
  }, [result]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, width, height);

    if (userWaveformSamples.length === 0 || referenceWaveformSamples.length === 0) return;

    const maxSamples = Math.max(userWaveformSamples.length, referenceWaveformSamples.length);
    const drawWidth = width * scale;
    const startX = offsetX;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#95A5A6';
    const refBarWidth = Math.max(1, drawWidth / maxSamples);
    for (let i = 0; i < referenceWaveformSamples.length; i++) {
      const x = startX + (i / maxSamples) * drawWidth;
      if (x + refBarWidth < 0 || x > width) continue;
      
      const barHeight = referenceWaveformSamples[i] * (height * 0.35);
      ctx.fillRect(x, centerY - barHeight, refBarWidth, barHeight * 2);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#3498DB';
    const userBarWidth = Math.max(1, drawWidth / maxSamples);
    for (let i = 0; i < userWaveformSamples.length; i++) {
      const x = startX + (i / maxSamples) * drawWidth;
      if (x + userBarWidth < 0 || x > width) continue;
      
      const barHeight = userWaveformSamples[i] * (height * 0.35);
      ctx.fillRect(x, centerY - barHeight, userBarWidth, barHeight * 2);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(236, 240, 241, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();

    result.errors.forEach((error, index) => {
      const errorX = startX + (error.time / result.duration) * drawWidth;
      if (errorX < 0 || errorX > width) return;

      ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
      ctx.fillRect(errorX - 2, 0, 4, height);

      ctx.beginPath();
      ctx.arc(errorX, 20, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#E74C3C';
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), errorX, 20);
    });
  }, [userWaveformSamples, referenceWaveformSamples, scale, offsetX, result]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, scale * delta));
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    const zoomRatio = newScale / scale;
    const newOffsetX = mouseX - (mouseX - offsetX) * zoomRatio;
    
    const maxOffset = 0;
    const minOffset = canvas.width - canvas.width * newScale;
    
    setScale(newScale);
    setOffsetX(Math.min(maxOffset, Math.max(minOffset, newOffsetX)));
  }, [scale, offsetX]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffsetStart(offsetX);
  }, [offsetX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const maxOffset = 0;
    const minOffset = canvas.width - canvas.width * scale;
    
    const newOffset = Math.min(maxOffset, Math.max(minOffset, dragOffsetStart + deltaX));
    setOffsetX(newOffset);
  }, [isDragging, dragStartX, dragOffsetStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleErrorClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveErrorIndex(activeErrorIndex === index ? null : index);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#F39C12';
    return '#E74C3C';
  };

  const getScoreText = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '一般';
    if (score >= 60) return '及格';
    return '需加强';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ← 返回录音
        </button>
        <h2 style={styles.title}>发音评测反馈</h2>
        <button style={styles.retryButton} onClick={onRetry}>
          🔄 重试
        </button>
      </div>

      <div style={styles.scoreSection}>
        <div style={{
          ...styles.scoreCircle,
          borderColor: getScoreColor(result.overallScore)
        }}>
          <span style={{
            ...styles.scoreNumber,
            color: getScoreColor(result.overallScore)
          }}>
            {result.overallScore}
          </span>
          <span style={styles.scoreLabel}>分</span>
        </div>
        <div style={styles.scoreInfo}>
          <p style={styles.scoreRating}>{getScoreText(result.overallScore)}</p>
          <p style={styles.scoreDetail}>
            本次练习发现 {result.errors.length} 处发音问题
          </p>
        </div>
      </div>

      <div style={styles.waveformCard}>
        <h3 style={styles.cardTitle}>波形对比</h3>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#3498DB' }}></div>
            <span style={styles.legendText}>你的发音</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#95A5A6' }}></div>
            <span style={styles.legendText}>标准范音</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#E74C3C' }}></div>
            <span style={styles.legendText}>错误标记</span>
          </div>
        </div>
        <div 
          ref={containerRef}
          style={{
            ...styles.waveformContainer,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={180}
            style={styles.waveformCanvas}
          />
        </div>
        <p style={styles.waveformHint}>
          💡 提示：滚轮缩放，拖拽平移（缩放范围 0.5x - 3x）
        </p>
      </div>

      <div style={styles.errorsCard}>
        <h3 style={styles.cardTitle}>
          错误列表 <span style={styles.errorCount}>({result.errors.length})</span>
        </h3>
        
        {result.errors.length === 0 ? (
          <div style={styles.noErrors}>
            <span style={styles.noErrorsIcon}>🎉</span>
            <p style={styles.noErrorsText}>太棒了！没有发现明显的发音错误</p>
          </div>
        ) : (
          <div style={styles.errorTimeline}>
            {result.errors.map((error, index) => (
              <div 
                key={index}
                style={styles.errorItem}
              >
                <div style={styles.errorTime}>
                  <span style={styles.timeText}>{formatTime(error.time)}</span>
                </div>
                <div style={styles.errorContent}>
                  <div 
                    style={{
                      ...styles.errorBadge,
                      ...(activeErrorIndex === index ? styles.errorBadgeActive : {})
                    }}
                    onClick={(e) => handleErrorClick(index, e)}
                  >
                    <span style={styles.errorIndex}>{index + 1}</span>
                    <span style={styles.errorWord}>{error.expected}</span>
                  </div>
                  
                  {activeErrorIndex === index && (
                    <div style={styles.tooltip}>
                      <div style={styles.tooltipArrow}></div>
                      <div style={styles.tooltipContent}>
                        <p style={styles.tooltipLabel}>修正建议</p>
                        <p style={styles.tooltipText}>{error.suggestion}</p>
                        <div style={styles.tooltipConfidence}>
                          <span style={styles.confidenceLabel}>置信度：</span>
                          <span style={{
                            ...styles.confidenceValue,
                            color: getScoreColor(error.confidence * 100)
                          }}>
                            {Math.round(error.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.phonemesCard}>
        <h3 style={styles.cardTitle}>音素评分</h3>
        <div style={styles.phonemeList}>
          {result.phonemeScores.map((item, index) => (
            <div key={index} style={styles.phonemeItem}>
              <span style={styles.phonemeText}>{item.phoneme}</span>
              <div style={styles.phonemeProgressBar}>
                <div
                  style={{
                    ...styles.phonemeProgressFill,
                    width: `${item.score}%`,
                    background: `linear-gradient(90deg, #E74C3C 0%, #F39C12 50%, #2ECC71 100%)`,
                    backgroundPosition: `${100 - item.score}% 0%`,
                    animation: 'progressFill 0.5s ease-out'
                  }}
                />
              </div>
              <span style={{
                ...styles.phonemeScore,
                color: getScoreColor(item.score)
              }}>
                {item.score}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '900px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#34495E',
    color: '#ECF0F1',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#ECF0F1'
  },
  retryButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3498DB',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    padding: '24px',
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  },
  scoreCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '6px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.5s ease'
  },
  scoreNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    lineHeight: 1
  },
  scoreLabel: {
    fontSize: '14px',
    color: '#95A5A6',
    marginTop: '4px'
  },
  scoreInfo: {
    flex: 1
  },
  scoreRating: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ECF0F1',
    marginBottom: '8px'
  },
  scoreDetail: {
    fontSize: '14px',
    color: '#95A5A6'
  },
  waveformCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ECF0F1',
    marginBottom: '16px'
  },
  legend: {
    display: 'flex',
    gap: '24px',
    marginBottom: '12px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendColor: {
    width: '20px',
    height: '12px',
    borderRadius: '3px'
  },
  legendText: {
    fontSize: '12px',
    color: '#95A5A6'
  },
  waveformContainer: {
    borderRadius: '10px',
    overflow: 'hidden',
    userSelect: 'none'
  },
  waveformCanvas: {
    width: '100%',
    height: '180px',
    display: 'block',
    borderRadius: '10px'
  },
  waveformHint: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#7F8C8D',
    textAlign: 'center'
  },
  errorsCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  },
  errorCount: {
    color: '#E74C3C',
    fontWeight: 'normal',
    fontSize: '14px'
  },
  errorTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  errorItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  errorTime: {
    width: '60px',
    flexShrink: 0,
    paddingTop: '8px'
  },
  timeText: {
    fontSize: '12px',
    color: '#7F8C8D',
    fontFamily: 'monospace'
  },
  errorContent: {
    flex: 1,
    position: 'relative'
  },
  errorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#E74C3C',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  errorBadgeActive: {
    backgroundColor: '#C0392B',
    boxShadow: '0 2px 8px rgba(231, 76, 60, 0.4)'
  },
  errorIndex: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white'
  },
  errorWord: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'white'
  },
  tooltip: {
    marginTop: '8px',
    animation: 'fadeInTooltip 0.2s ease-out'
  },
  tooltipArrow: {
    position: 'absolute',
    top: '-6px',
    left: '20px',
    width: '12px',
    height: '12px',
    backgroundColor: '#1C2833',
    transform: 'rotate(45deg)'
  },
  tooltipContent: {
    position: 'relative',
    padding: '16px',
    backgroundColor: '#1C2833',
    borderRadius: '10px',
    border: '1px solid #34495E',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
  },
  tooltipLabel: {
    fontSize: '12px',
    color: '#3498DB',
    fontWeight: 600,
    marginBottom: '8px'
  },
  tooltipText: {
    fontSize: '13px',
    color: '#ECF0F1',
    lineHeight: 1.6,
    marginBottom: '12px'
  },
  tooltipConfidence: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  confidenceLabel: {
    fontSize: '12px',
    color: '#95A5A6'
  },
  confidenceValue: {
    fontSize: '14px',
    fontWeight: 600
  },
  noErrors: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px',
    gap: '12px'
  },
  noErrorsIcon: {
    fontSize: '48px'
  },
  noErrorsText: {
    fontSize: '16px',
    color: '#2ECC71',
    fontWeight: 500
  },
  phonemesCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  },
  phonemeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  phonemeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  phonemeText: {
    width: '80px',
    fontSize: '13px',
    color: '#ECF0F1',
    fontWeight: 500
  },
  phonemeProgressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#34495E',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  phonemeProgressFill: {
    height: '100%',
    borderRadius: '4px',
    backgroundSize: '200% 100%'
  },
  phonemeScore: {
    width: '50px',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'right'
  }
};

export default FeedbackView;
