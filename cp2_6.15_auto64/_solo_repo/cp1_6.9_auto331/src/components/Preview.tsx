import { useState, useEffect, useRef, useCallback } from 'react';
import { DialogueNode, Connection } from '../types';

interface PreviewProps {
  nodes: DialogueNode[];
  connections: Connection[];
  progress: number;
  onProgress: (p: number) => void;
  onClose: () => void;
}

type Phase = 'entering' | 'typing' | 'waiting' | 'leaving' | 'done';

export default function Preview({ nodes, connections, onClose }: PreviewProps) {
  const [sequence, setSequence] = useState<DialogueNode[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<Phase>('entering');
  const [nodeOpacity, setNodeOpacity] = useState(0);
  const [nodeTransform, setNodeTransform] = useState('translateY(-30px)');
  const [expandProgress, setExpandProgress] = useState(0);

  const typeTimer = useRef<number | null>(null);
  const phaseTimer = useRef<number | null>(null);

  useEffect(() => {
    const ordered = topologicalOrder(nodes, connections);
    if (ordered.length === 0 && nodes.length > 0) {
      setSequence(nodes);
    } else {
      setSequence(ordered);
    }
  }, [nodes, connections]);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setExpandProgress(t);
      if (t < 1) raf = requestAnimationFrame(animate);
      else {
        setTimeout(() => {
          if (sequence.length > 0) startNode(0);
        }, 200);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [sequence.length]);

  const startNode = useCallback((index: number) => {
    if (index >= sequence.length) {
      setPhase('done');
      return;
    }
    setCurrentIndex(index);
    setDisplayedText('');
    setNodeOpacity(0);
    setNodeTransform('translateY(-30px)');
    setPhase('entering');

    let raf: number;
    const start = performance.now();
    const animateIn = (now: number) => {
      const t = Math.min(1, (now - start) / 500);
      const eased = 1 - Math.pow(1 - t, 3);
      setNodeOpacity(eased);
      setNodeTransform(`translateY(${-30 * (1 - eased)}px)`);
      if (t < 1) raf = requestAnimationFrame(animateIn);
      else {
        setPhase('typing');
        startTyping(sequence[index]);
      }
    };
    raf = requestAnimationFrame(animateIn);
  }, [sequence]);

  const startTyping = useCallback((node: DialogueNode) => {
    const fullText = node.content || '（无对话内容）';
    let i = 0;
    const speed = node.typingSpeed || 50;

    typeTimer.current = window.setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        if (typeTimer.current) {
          clearInterval(typeTimer.current);
          typeTimer.current = null;
        }
        setPhase('waiting');
      }
    }, speed);
  }, []);

  const skipOrAdvance = useCallback(() => {
    if (phase === 'typing') {
      if (typeTimer.current) {
        clearInterval(typeTimer.current);
        typeTimer.current = null;
      }
      const node = sequence[currentIndex];
      setDisplayedText(node?.content || '（无对话内容）');
      setPhase('waiting');
      return;
    }

    if (phase === 'waiting') {
      goToNext();
    }

    if (phase === 'entering') {
      setNodeOpacity(1);
      setNodeTransform('translateY(0)');
      if (typeTimer.current) {
        clearInterval(typeTimer.current);
        typeTimer.current = null;
      }
    }
  }, [phase, currentIndex, sequence]);

  const goToNext = useCallback(() => {
    setPhase('leaving');
    let raf: number;
    const start = performance.now();
    const animateOut = (now: number) => {
      const t = Math.min(1, (now - start) / 400);
      setNodeOpacity(1 - t);
      if (t < 1) raf = requestAnimationFrame(animateOut);
      else {
        startNode(currentIndex + 1);
      }
    };
    raf = requestAnimationFrame(animateOut);
  }, [currentIndex, startNode]);

  useEffect(() => {
    return () => {
      if (typeTimer.current) clearInterval(typeTimer.current);
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    };
  }, []);

  const currentNode = sequence[currentIndex];
  const clipRadius = expandProgress === 0 ? 0 : Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) * expandProgress;

  return (
    <div
      style={{
        ...styles.overlay,
        clipPath: expandProgress < 1
          ? `circle(${clipRadius}px at center)`
          : 'none',
      }}
      onClick={skipOrAdvance}
    >
      <style>{previewStyles}</style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerTitle}>对话预览</span>
          <span style={styles.headerProgress}>
            {sequence.length > 0 ? `${currentIndex + 1} / ${sequence.length}` : '0 / 0'}
          </span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: sequence.length > 0 ? `${((currentIndex + (phase === 'done' ? 0 : displayedText.length / Math.max(1, (currentNode?.content || '').length))) / sequence.length) * 100}%` : '0%',
              }}
            />
          </div>
          <button
            style={styles.closeBtn}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="关闭 (ESC)"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.stage} onClick={skipOrAdvance}>
        {currentNode ? (
          <div
            style={{
              ...styles.dialogueCard,
              opacity: nodeOpacity,
              transform: nodeTransform,
              background: `linear-gradient(135deg, ${currentNode.bgColor}, ${shadeColor(currentNode.bgColor, 10)})`,
            }}
          >
            <div style={styles.avatarCol}>
              <div
                style={{
                  ...styles.avatar,
                  background: `radial-gradient(circle at 30% 30%, ${lightenColor(currentNode.avatarColor, 30)}, ${currentNode.avatarColor})`,
                  boxShadow: `0 0 24px ${currentNode.avatarColor}80, 0 0 48px ${currentNode.avatarColor}40`,
                }}
              >
                <span style={styles.avatarLetter}>
                  {(currentNode.title || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <div style={styles.contentCol}>
              <div style={styles.dialogueTitle}>{currentNode.title || '未命名角色'}</div>
              <div style={styles.dialogueContent}>
                {displayedText}
                {phase === 'typing' && <span style={styles.cursor}>▊</span>}
              </div>
            </div>
          </div>
        ) : phase === 'done' && sequence.length > 0 ? (
          <div style={styles.endingCard} className="fade-in">
            <div style={styles.endingIcon}>✓</div>
            <div style={styles.endingTitle}>对话结束</div>
            <div style={styles.endingSubtitle}>共播放 {sequence.length} 条对话</div>
            <button
              style={styles.replayBtn}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(0); startNode(0); }}
            >
              重新播放
            </button>
          </div>
        ) : (
          <div style={styles.emptyCard}>暂无对话内容</div>
        )}

        {phase === 'waiting' && currentIndex < sequence.length - 1 && (
          <div style={styles.hintContinue} className="pulse-hint">
            点击继续 ▼
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerHint}>
          <span style={{ color: '#e94560' }}>点击任意位置</span> 跳过当前 / 进入下一条
        </div>
      </div>

      <KeyListener onClose={onClose} />
    </div>
  );
}

function KeyListener({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return null;
}

function topologicalOrder(nodes: DialogueNode[], connections: Connection[]): DialogueNode[] {
  if (nodes.length === 0) return [];
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  nodes.forEach(n => { inDegree.set(n.id, 0); outEdges.set(n.id, []); });
  connections.forEach(c => {
    inDegree.set(c.to, (inDegree.get(c.to) || 0) + 1);
    outEdges.get(c.from)?.push(c.to);
  });

  const queue: string[] = [];
  inDegree.forEach((d, id) => { if (d === 0) queue.push(id); });

  const result: DialogueNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = idToNode.get(id);
    if (node) result.push(node);
    outEdges.get(id)?.forEach(nextId => {
      inDegree.set(nextId, (inDegree.get(nextId) || 1) - 1);
      if (inDegree.get(nextId) === 0) queue.push(nextId);
    });
  }

  if (result.length < nodes.length) {
    const seen = new Set(result.map(n => n.id));
    nodes.forEach(n => { if (!seen.has(n.id)) result.push(n); });
  }
  return result;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round(255 * percent / 100)));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round(255 * percent / 100)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function lightenColor(hex: string, percent: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse at center, #0f0f23 0%, #050510 100%)',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
  } as React.CSSProperties,
  header: {
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  } as React.CSSProperties,
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as React.CSSProperties,
  headerProgress: {
    padding: '4px 12px',
    background: 'rgba(233,69,96,0.15)',
    color: '#e94560',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties,
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  } as React.CSSProperties,
  progressBar: {
    width: 200,
    height: 4,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  } as React.CSSProperties,
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
    borderRadius: 2,
    transition: 'width 0.1s ease',
  } as React.CSSProperties,
  closeBtn: {
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.08)',
    color: '#aaaacc',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  stage: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    position: 'relative',
    overflow: 'hidden',
  } as React.CSSProperties,
  dialogueCard: {
    maxWidth: 720,
    width: '100%',
    borderRadius: 20,
    padding: 32,
    display: 'flex',
    gap: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(233,69,96,0.1)',
    border: '1px solid rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  avatarCol: {
    flexShrink: 0,
  } as React.CSSProperties,
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
  } as React.CSSProperties,
  avatarLetter: {
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
  } as React.CSSProperties,
  contentCol: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  dialogueTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 12,
  } as React.CSSProperties,
  dialogueContent: {
    fontSize: 17,
    lineHeight: 1.8,
    color: 'rgba(255,255,255,0.85)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  } as React.CSSProperties,
  cursor: {
    display: 'inline-block',
    color: '#e94560',
    marginLeft: 2,
    animation: 'blink 1s step-end infinite',
  } as React.CSSProperties,
  endingCard: {
    textAlign: 'center',
    padding: 60,
  } as React.CSSProperties,
  endingIcon: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    color: '#fff',
    fontSize: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 0 40px rgba(74,222,128,0.4)',
  } as React.CSSProperties,
  endingTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 8,
  } as React.CSSProperties,
  endingSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  } as React.CSSProperties,
  replayBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #e94560, #c73651)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s',
  } as React.CSSProperties,
  emptyCard: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    padding: 60,
  } as React.CSSProperties,
  hintContinue: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  } as React.CSSProperties,
  footer: {
    padding: '16px 32px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
    textAlign: 'center',
  } as React.CSSProperties,
  footerHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  } as React.CSSProperties,
};

const previewStyles = `
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  .pulse-hint {
    animation: pulse-hint 1.5s ease-in-out infinite;
  }
  @keyframes pulse-hint {
    0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
    50% { opacity: 0.7; transform: translateX(-50%) translateY(5px); }
  }
  .fade-in {
    animation: fadeIn 0.5s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
