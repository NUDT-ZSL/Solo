import React, { useEffect, useRef } from 'react';

interface LyricLineProps {
  text: string;
  isActive: boolean;
  index: number;
  containerRef: React.RefObject<HTMLDivElement>;
  totalLines: number;
}

const LyricLine: React.FC<LyricLineProps> = ({ text, isActive, index, containerRef, totalLines }) => {
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive || !lineRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const line = lineRef.current;
    const scrollParent = line.parentElement;

    if (!scrollParent) return;

    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();

    const containerCenter = containerRect.top + containerRect.height / 2;
    const lineCenter = lineRect.top + lineRect.height / 2;
    const offset = lineCenter - containerCenter;

    const currentTransform = scrollParent.style.transform || 'translateY(0px)';
    const currentY = parseFloat(currentTransform.replace(/[^\d.-]/g, '')) || 0;
    const newY = currentY - offset;

    scrollParent.style.transition = 'transform 0.3s ease-out';
    scrollParent.style.transform = `translateY(${newY}px)`;

  }, [isActive, index, containerRef, totalLines]);

  return (
    <div
      ref={lineRef}
      className={`lyric-line ${isActive ? 'active' : ''}`}
      data-index={index}
    >
      {text}
    </div>
  );
};

export default LyricLine;
