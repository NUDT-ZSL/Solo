import React, { useEffect, useRef, useState } from 'react';
import cloud from 'd3-cloud';
import { KeywordData } from '../types';

interface WordCloudProps {
  keywords: KeywordData[];
  onKeywordClick?: (keyword: string) => void;
  selectedKeywords?: string[];
}

interface Word {
  text: string;
  size: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
}

const WordCloud: React.FC<WordCloudProps> = ({ keywords, onKeywordClick, selectedKeywords = [] }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: 400 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!keywords.length || dimensions.width === 0) return;

    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const width = dimensions.width;
    const height = Math.round(width / goldenRatio);

    const maxWeight = Math.max(...keywords.map(k => k.weight));
    const minWeight = Math.min(...keywords.map(k => k.weight));
    const minSize = 14;
    const maxSize = 64;

    const layout = cloud()
      .size([width, height])
      .words(keywords.map(k => ({
        text: k.keyword,
        size: minSize + ((k.weight - minWeight) / (maxWeight - minWeight || 1)) * (maxSize - minSize),
        weight: k.weight,
      })))
      .padding(5)
      .rotate(() => 0)
      .font('sans-serif')
      .fontSize((d: any) => d.size as number)
      .on('end', (output: any[]) => {
        const hslColors = keywords.map((_, i) => {
          const hue = Math.round((i * 360) / keywords.length + Math.random() * 30) % 360;
          return `hsl(${hue}, 70%, 60%)`;
        });
        const colorMap: Record<string, string> = {};
        keywords.forEach((k, i) => {
          colorMap[k.keyword] = hslColors[i];
        });
        const w = output.map((d: any) => ({
          text: d.text,
          size: d.size,
          x: d.x,
          y: d.y,
          rotate: d.rotate,
          color: colorMap[d.text],
        }));
        setWords(w);
      });

    layout.start();
  }, [keywords, dimensions]);

  const handleClick = (text: string) => {
    onKeywordClick?.(text);
  };

  const isSelected = (text: string) => {
    if (selectedKeywords.length === 0) return true;
    return selectedKeywords.includes(text);
  };

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: 400,
      background: '#f5f5f5',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {words.length > 0 ? (
        <svg
          ref={svgRef}
          viewBox={`${-dimensions.width / 2} ${-dimensions.height / 2} ${dimensions.width} ${dimensions.height}`}
          style={{ width: '100%', height: '100%' }}
        >
          {words.map((w, i) => (
            <text
              key={i}
              textAnchor="middle"
              transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
              style={{
                fontSize: w.size,
                fontFamily: 'sans-serif',
                fill: w.color,
                cursor: 'pointer',
                opacity: isSelected(w.text) ? 1 : 0.25,
                fontWeight: 600,
                transition: 'opacity 0.2s',
                userSelect: 'none',
              }}
              onClick={() => handleClick(w.text)}
            >
              {w.text}
            </text>
          ))}
        </svg>
      ) : (
        <div style={{ color: '#9E9E9E' }}>正在生成词云...</div>
      )}
    </div>
  );
};

export default WordCloud;
