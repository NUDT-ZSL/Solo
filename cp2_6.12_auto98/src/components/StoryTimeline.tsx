import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';

const CHAR_INTERVAL = 30;
const GLOW_DURATION = 300;

function TypewriterText({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current <= text.length) {
        setDisplayed(text.slice(0, indexRef.current));
      } else {
        clearInterval(timer);
        onComplete();
      }
    }, CHAR_INTERVAL);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return <>{displayed}</>;
}

function ParagraphCard({ paragraph, isNew }: { paragraph: { content: string; author: string; order: number }; isNew: boolean }) {
  const [typingDone, setTypingDone] = useState(!isNew);
  const [showGlow, setShowGlow] = useState(false);
  const completeRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    setTypingDone(true);
    setShowGlow(true);
    setTimeout(() => setShowGlow(false), GLOW_DURATION);
  }, []);

  return (
    <motion.div
      className={`paragraph-card ${showGlow ? 'paragraph-glow' : ''}`}
      initial={isNew ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="paragraph-header">
        <span className="paragraph-author"><User size={14} /> {paragraph.author}</span>
        <span className="paragraph-order">#{paragraph.order}</span>
      </div>
      <div className="paragraph-content">
        {isNew && !typingDone ? (
          <TypewriterText text={paragraph.content} onComplete={handleComplete} />
        ) : (
          paragraph.content
        )}
      </div>
    </motion.div>
  );
}

const VIRTUAL_SCROLL_THRESHOLD = 50;
const ITEM_HEIGHT = 160;

export default function StoryTimeline() {
  const { paragraphs } = useStore();
  const [newId, setNewId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(paragraphs.length);

  useEffect(() => {
    if (paragraphs.length > prevLenRef.current) {
      const latest = paragraphs[paragraphs.length - 1];
      setNewId(latest.id);
    }
    prevLenRef.current = paragraphs.length;
  }, [paragraphs]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [paragraphs]);

  const useVirtual = paragraphs.length > VIRTUAL_SCROLL_THRESHOLD;
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = containerRef.current?.clientHeight || 600;

  const handleScroll = () => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  };

  let visibleParagraphs = paragraphs;
  let offsetY = 0;
  let totalHeight = paragraphs.length * ITEM_HEIGHT;

  if (useVirtual) {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
    const endIndex = Math.min(paragraphs.length, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + 2);
    visibleParagraphs = paragraphs.slice(startIndex, endIndex);
    offsetY = startIndex * ITEM_HEIGHT;
  }

  return (
    <div className="story-timeline" ref={containerRef} onScroll={useVirtual ? handleScroll : undefined}>
      {paragraphs.length === 0 ? (
        <div className="timeline-empty">故事还未开始，成为第一个写下段落的人吧</div>
      ) : (
        <div
          className="timeline-inner"
          style={useVirtual ? { height: totalHeight, position: 'relative' } : undefined}
        >
          <div style={useVirtual ? { transform: `translateY(${offsetY}px)` } : undefined}>
            <AnimatePresence>
              {visibleParagraphs.map((p) => (
                <ParagraphCard
                  key={p.id}
                  paragraph={p}
                  isNew={p.id === newId}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
