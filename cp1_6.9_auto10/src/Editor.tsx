import { useEffect, useRef, useState, useCallback } from 'react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  sentenceHighlights: Array<{
    id: string;
    start: number;
    end: number;
    color: string;
  }>;
  activeSentenceId: string | null;
  onSentenceClick?: (id: string) => void;
}

export default function Editor({
  value,
  onChange,
  sentenceHighlights,
  activeSentenceId,
  onSentenceClick,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) ta.addEventListener('scroll', syncScroll);
    return () => {
      if (ta) ta.removeEventListener('scroll', syncScroll);
    };
  }, [syncScroll]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!onSentenceClick || !textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const hit = sentenceHighlights.find(
      (h) => pos >= h.start && pos <= h.end
    );
    if (hit) onSentenceClick(hit.id);
  };

  const highlightsMarkup: Array<JSX.Element> = [];
  let cursor = 0;

  const sorted = [...sentenceHighlights].sort((a, b) => a.start - b.start);

  for (const h of sorted) {
    if (h.start > cursor) {
      highlightsMarkup.push(
        <span key={`gap-${cursor}`}>{value.substring(cursor, h.start)}</span>
      );
    }
    const text = value.substring(h.start, h.end);
    const isActive = activeSentenceId === h.id;
    highlightsMarkup.push(
      <span
        key={h.id}
        style={{
          backgroundColor: `${h.color}${isActive ? '40' : '22'}`,
          borderBottom: `2px solid ${h.color}`,
          borderRadius: '3px',
          padding: isActive ? '1px 2px' : '0 2px',
          boxShadow: isActive ? `0 0 8px ${h.color}99` : 'none',
          transition: 'all 0.2s ease-out',
          display: 'inline',
          cursor: 'pointer',
        }}
      >
        {text}
      </span>
    );
    cursor = h.end;
  }

  if (cursor < value.length) {
    highlightsMarkup.push(<span key={`tail-${cursor}`}>{value.substring(cursor)}</span>);
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#15152A',
        border: '1px solid rgba(148, 163, 184, 0.15)',
      }}
    >
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          padding: '20px',
          fontFamily: "'Noto Sans SC', system-ui, -apple-system, sans-serif",
          fontSize: '15px',
          lineHeight: '1.8',
          color: 'transparent',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'auto',
          pointerEvents: 'none',
          letterSpacing: '0.2px',
        }}
      >
        {highlightsMarkup}
        {value.endsWith('\n') && <span>&nbsp;</span>}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onClick={handleClick}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder="在此输入文字，每一句将被赋予情绪色彩...

试试输入：
今天阳光明媚，我感到无比的开心和幸福！
但是昨天的失败让我非常难过。
不过我相信明天会更好。"
        spellCheck={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          padding: '20px',
          resize: 'none',
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          color: '#E2E8F0',
          fontFamily: "'Noto Sans SC', system-ui, -apple-system, sans-serif",
          fontSize: '15px',
          lineHeight: '1.8',
          caretColor: '#A78BFA',
          letterSpacing: '0.2px',
          overflow: 'auto',
        }}
      />
      {isComposing && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontSize: '12px',
            color: '#A78BFA',
            backgroundColor: 'rgba(167, 139, 250, 0.12)',
            padding: '3px 10px',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        >
          输入法组合中...
        </div>
      )}
    </div>
  );
}
