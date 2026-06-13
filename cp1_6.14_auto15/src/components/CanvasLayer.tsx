import { useEffect, useRef, useMemo } from 'react';
import { Layer } from '../types';

interface CanvasLayerProps {
  layers: Layer[];
  width: number;
  height: number;
  clipX: number;
  clipSide: 'left' | 'right';
}

function CanvasLayer({ layers, width, height, clipX, clipSide }: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const layersRef = useRef(layers);
  const sizeRef = useRef({ width, height, clipX, clipSide });

  layersRef.current = layers;
  sizeRef.current = { width, height, clipX, clipSide };

  const layerIds = useMemo(() => layers.map(l => l.id).join(','), [layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { width: w, height: h, clipX: cx, clipSide: side } = sizeRef.current;
      const currentLayers = layersRef.current;

      if (w === 0 || h === 0) return;

      if (canvas.width !== w) {
        canvas.width = w;
      }
      if (canvas.height !== h) {
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      if (side === 'left') {
        ctx.rect(0, 0, (cx / 100) * w, h);
      } else {
        ctx.rect((cx / 100) * w, 0, w - (cx / 100) * w, h);
      }
      ctx.clip();

      currentLayers.forEach((layer) => {
        if (!layer.image || !layer.visible) return;

        const imgAspect = layer.image.width / layer.image.height;
        const canvasAspect = w / h;

        let drawWidth: number;
        let drawHeight: number;
        let offsetX: number;
        let offsetY: number;

        if (imgAspect > canvasAspect) {
          drawHeight = h;
          drawWidth = h * imgAspect;
          offsetX = (w - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = w;
          drawHeight = w / imgAspect;
          offsetX = 0;
          offsetY = (h - drawHeight) / 2;
        }

        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.image, offsetX, offsetY, drawWidth, drawHeight);
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, layerIds, clipX, clipSide]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}

export default CanvasLayer;
