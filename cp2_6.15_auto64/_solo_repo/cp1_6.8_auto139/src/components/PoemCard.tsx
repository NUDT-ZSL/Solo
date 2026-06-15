import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Poem, EMOTION_LABELS, EMOTION_EMOJIS } from '../PoemEngine';
import { VisualCanvas } from '../VisualCanvas';
import { Heart, MessageCircle } from 'lucide-react';

interface PoemCardProps {
  poem: Poem;
  echoCount?: number;
}

export function PoemCard({ poem, echoCount }: PoemCardProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualCanvasRef = useRef<VisualCanvas | null>(null);
  const initializedRef = useRef(false);

  const handleClick = useCallback(() => {
    navigate(`/poem/${poem.id}`);
  }, [navigate, poem.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!initializedRef.current && canvasRef.current) {
            const vc = new VisualCanvas(canvasRef.current, poem.illustration);
            visualCanvasRef.current = vc;
            vc.start();
            initializedRef.current = true;
          } else if (visualCanvasRef.current) {
            visualCanvasRef.current.start();
          }
        } else {
          if (visualCanvasRef.current) {
            visualCanvasRef.current.stop();
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (visualCanvasRef.current) {
        visualCanvasRef.current.destroy();
        visualCanvasRef.current = null;
      }
    };
  }, [poem.illustration]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg shadow-[0_8px_32px_rgba(200,149,108,0.12)]"
    >
      <div className="p-5 pb-2">
        <h3 className="font-xiaowei text-lg text-poem-text leading-relaxed">{poem.title}</h3>
        <p className="font-serif text-sm text-poem-muted mt-2 line-clamp-3">{poem.content}</p>
      </div>
      <div className="flex items-center justify-between px-5 pb-2 pt-1">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber/15 text-amber-dark font-serif">
          {EMOTION_EMOJIS[poem.emotion]} {EMOTION_LABELS[poem.emotion]}
        </span>
        {echoCount !== undefined && (
          <span className="flex items-center gap-1 text-poem-muted text-xs">
            <MessageCircle className="w-3.5 h-3.5" />
            {echoCount}
          </span>
        )}
      </div>
      <div className="h-32">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
