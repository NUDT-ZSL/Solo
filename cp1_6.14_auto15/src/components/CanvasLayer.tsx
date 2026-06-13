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
  const animationRef = useRef<number | null>(null);
  const layersRef = useRef<Layer[]>(layers);
  const sizeRef = useRef({ width, height, clipX, clipSide });

  layersRef.current = layers;
  sizeRef.current = { width, height, clipX, clipSide };

  const layerConfigSig = useMemo(() =>
    layers.map(l =>
      `${l.id}:${l.opacity.toFixed(3)}:${l.blendMode}:${l.visible ? '1' : '0'}`
    ).join('||')
  , [layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const render = () => {
      const { width: w, height: h, clipX: cx, clipSide: side } = sizeRef.current;
      const currentLayers = layersRef.current;

      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

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

      const len = currentLayers.length;
      for (let i = 0; i < len; i++) {
        const layer = currentLayers[i];
        if (!layer.image || !layer.visible) continue;

        const img = layer.image;
        const imgW = img.width;
        const imgH = img.height;
        if (imgW === 0 || imgH === 0) continue;

        const imgAspect = imgW / imgH;
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
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [width, height, layerConfigSig, clipX, clipSide]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        imageRendering: 'auto',
      }}
    />
  );
}

export default CanvasLayer;
