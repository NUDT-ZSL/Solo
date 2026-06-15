import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Smile, Image, Trash2, X } from 'lucide-react';
import { historyManager, type EmojiHistory, type EmojiParams, type Sticker } from './HistoryManager';

const EMOTIONS = [
  { id: 'happy', label: '高兴', emoji: '😊' },
  { id: 'surprised', label: '惊讶', emoji: '😮' },
  { id: 'sad', label: '悲伤', emoji: '😢' },
  { id: 'angry', label: '愤怒', emoji: '😠' },
  { id: 'funny', label: '搞怪', emoji: '🤪' },
];

const STICKER_TYPES = [
  'hat', 'beard', 'teardrop', 'glasses', 'heart',
  'star', 'fire', 'sweat', 'clown-nose', 'crown'
];

interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  features: {
    leftEye: { x: number; y: number; width: number; height: number };
    rightEye: { x: number; y: number; width: number; height: number };
    mouth: { x: number; y: number; width: number; height: number };
    leftBrow: { x: number; y: number; width: number; height: number };
    rightBrow: { x: number; y: number; width: number; height: number };
  };
}

interface WorkerMessage {
  type: string;
  imageData?: ImageData;
  width?: number;
  height?: number;
  emotion?: string;
  params?: Record<string, unknown>;
  frames?: { imageData: ImageData; delay: number }[];
  progress?: number;
  error?: string;
  blob?: Blob;
  faceRegion?: FaceRegion;
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [mouthAdjust, setMouthAdjust] = useState(0);
  const [eyesAdjust, setEyesAdjust] = useState(0);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [history, setHistory] = useState<EmojiHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [faceRegion, setFaceRegion] = useState<FaceRegion | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeStickerRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const editAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./ImageProcessor.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const data = e.data;

      if (data.type === 'cropComplete' && data.imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(data.imageData, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setProcessedImage(dataUrl);
          setOriginalImage(dataUrl);
          if (data.faceRegion) {
            setFaceRegion(data.faceRegion);
          }
        }
      } else if (data.type === 'transformComplete' && data.imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(data.imageData, 0, 0);
          drawStickers(ctx, stickers);
          const dataUrl = canvas.toDataURL('image/png');
          setProcessedImage(dataUrl);
        }
        setIsTransforming(false);
      } else if (data.type === 'gifComplete' && data.blob) {
        downloadBlob(data.blob, 'emoji.gif');
        setIsExporting(false);
        setExportProgress(100);
        saveToHistory('gif');
      } else if (data.type === 'pngComplete' && data.blob) {
        downloadBlob(data.blob, 'emoji.png');
        setIsExporting(false);
        setExportProgress(100);
        saveToHistory('png');
      } else if (data.type === 'progress') {
        setExportProgress(data.progress || 0);
      } else if (data.type === 'error') {
        console.error('Worker error:', data.error);
        setIsExporting(false);
        setIsTransforming(false);
      }
    };

    loadHistory();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    if (processedImage && stickers.length > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 200, 200);
          drawStickers(ctx, stickers);
          const dataUrl = canvas.toDataURL('image/png');
          setProcessedImage(dataUrl);
        };
        img.src = processedImage;
      }
    }
  }, [stickers]);

  const loadHistory = async () => {
    try {
      const data = await historyManager.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const saveToHistory = async (format: string) => {
    if (!processedImage || !selectedEmotion) return;

    const params: EmojiParams = {
      mouth: mouthAdjust,
      eyes: eyesAdjust,
      stickers: stickers
    };

    try {
      await historyManager.saveHistory({
        imageData: processedImage,
        emotion: selectedEmotion,
        params
      });
      loadHistory();
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.match('image/(jpeg|png)')) {
      alert('请上传 JPG 或 PNG 格式的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'crop',
            imageData,
            width: img.width,
            height: img.height
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const applyEmotion = async (emotion: string) => {
    setSelectedEmotion(emotion);
    setIsTransforming(true);

    if (!originalImage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 200, 200);
      const imageData = ctx.getImageData(0, 0, 200, 200);

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'transform',
          imageData,
          emotion,
          params: {
            mouth: mouthAdjust,
            eyes: eyesAdjust
          }
        });
      }
    };
    img.src = originalImage;
  };

  const handleParamChange = (type: 'mouth' | 'eyes', value: number) => {
    if (type === 'mouth') {
      setMouthAdjust(value);
    } else {
      setEyesAdjust(value);
    }

    if (selectedEmotion && originalImage) {
      setTimeout(() => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, 200, 200);
          const imageData = ctx.getImageData(0, 0, 200, 200);

          if (workerRef.current) {
            workerRef.current.postMessage({
              type: 'transform',
              imageData,
              emotion: selectedEmotion,
              params: {
                mouth: mouthAdjust,
                eyes: eyesAdjust
              }
            });
          }
        };
        img.src = originalImage;
      }, 50);
    }
  };

  const drawStickers = (ctx: CanvasRenderingContext2D, stickerList: Sticker[]) => {
    stickerList.forEach(sticker => {
      ctx.save();
      ctx.translate(sticker.x, sticker.y);

      switch (sticker.type) {
        case 'hat':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(-25, -30, 50, 10);
          ctx.fillRect(-18, -45, 36, 18);
          break;
        case 'beard':
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.ellipse(0, 15, 20, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'teardrop':
          ctx.fillStyle = '#87CEEB';
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.quadraticCurveTo(-8, 0, 0, 10);
          ctx.quadraticCurveTo(8, 0, 0, -10);
          ctx.fill();
          break;
        case 'glasses':
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-12, 0, 12, 0, Math.PI * 2);
          ctx.arc(12, 0, 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(24, 0);
          ctx.stroke();
          break;
        case 'heart':
          ctx.fillStyle = '#ff6584';
          ctx.beginPath();
          ctx.moveTo(0, 8);
          ctx.bezierCurveTo(-15, -5, -15, -20, 0, -10);
          ctx.bezierCurveTo(15, -20, 15, -5, 0, 8);
          ctx.fill();
          break;
        case 'star':
          ctx.fillStyle = '#FFD700';
          drawStar(ctx, 0, 0, 5, 15, 7);
          break;
        case 'fire':
          ctx.fillStyle = '#FF4500';
          ctx.beginPath();
          ctx.moveTo(0, 15);
          ctx.quadraticCurveTo(-12, 5, -8, -5);
          ctx.quadraticCurveTo(-4, 2, 0, -15);
          ctx.quadraticCurveTo(4, 2, 8, -5);
          ctx.quadraticCurveTo(12, 5, 0, 15);
          ctx.fill();
          break;
        case 'sweat':
          ctx.fillStyle = '#87CEEB';
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'clown-nose':
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'crown':
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.moveTo(-20, 10);
          ctx.lineTo(-15, -15);
          ctx.lineTo(-5, 0);
          ctx.lineTo(0, -20);
          ctx.lineTo(5, 0);
          ctx.lineTo(15, -15);
          ctx.lineTo(20, 10);
          ctx.closePath();
          ctx.fill();
          break;
      }

      ctx.restore();
    });
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const addSticker = (type: string) => {
    const newSticker: Sticker = {
      id: `${type}-${Date.now()}`,
      type,
      x: 100,
      y: 100
    };
    setStickers(prev => [...prev, newSticker]);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const handleStickerMouseDown = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation();
    activeStickerRef.current = stickerId;
    const sticker = stickers.find(s => s.id === stickerId);
    if (sticker && editAreaRef.current) {
      const rect = editAreaRef.current.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - rect.left - sticker.x,
        y: e.clientY - rect.top - sticker.y
      };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!activeStickerRef.current || !editAreaRef.current) return;

    const rect = editAreaRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(180, e.clientX - rect.left - dragOffsetRef.current.x));
    const y = Math.max(20, Math.min(180, e.clientY - rect.top - dragOffsetRef.current.y));

    setStickers(prev =>
      prev.map(s =>
        s.id === activeStickerRef.current
          ? { ...s, x, y }
          : s
      )
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    activeStickerRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const exportGIF = async () => {
    if (!processedImage) return;
    setIsExporting(true);
    setExportProgress(0);

    const frames: { imageData: ImageData; delay: number }[] = [];

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = 200;
      originalCanvas.height = 200;
      const origCtx = originalCanvas.getContext('2d');
      if (origCtx && originalImage) {
        const origImg = new Image();
        origImg.onload = () => {
          origCtx.drawImage(origImg, 0, 0, 200, 200);
          const frame1 = origCtx.getImageData(0, 0, 200, 200);

          ctx.drawImage(img, 0, 0, 200, 200);
          const frame2 = ctx.getImageData(0, 0, 200, 200);

          frames.push({ imageData: frame1, delay: 125 });
          frames.push({ imageData: frame2, delay: 250 });
          frames.push({ imageData: frame1, delay: 125 });

          if (workerRef.current) {
            workerRef.current.postMessage({
              type: 'exportGIF',
              frames
            });
          }
        };
        origImg.src = originalImage;
      }
    };
    img.src = processedImage;
  };

  const exportPNG = () => {
    if (!processedImage) return;
    setIsExporting(true);
    setExportProgress(0);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 200, 200);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, 'emoji.png');
          setIsExporting(false);
          setExportProgress(100);
          saveToHistory('png');
        }
      }, 'image/png');
    };
    img.src = processedImage;
  };

  const loadFromHistory = (item: EmojiHistory) => {
    setProcessedImage(item.imageData);
    setOriginalImage(item.imageData);
    setSelectedEmotion(item.emotion);
    setMouthAdjust(item.params.mouth);
    setEyesAdjust(item.params.eyes);
    setStickers(item.params.stickers);
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await historyManager.deleteHistory(id);
      loadHistory();
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
  };

  const resetEditor = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setSelectedEmotion(null);
    setMouthAdjust(0);
    setEyesAdjust(0);
    setStickers([]);
    setFaceRegion(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStickerEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      'hat': '🎩',
      'beard': '🧔',
      'teardrop': '💧',
      'glasses': '👓',
      'heart': '❤️',
      'star': '⭐',
      'fire': '🔥',
      'sweat': '💦',
      'clown-nose': '🤡',
      'crown': '👑'
    };
    return emojiMap[type] || '❓';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app-container" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      paddingRight: '280px'
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={previewCanvasRef} style={{ display: 'none' }} />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>
          <button
            onClick={exportPNG}
            disabled={!processedImage || isExporting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: isExporting ? '#ccc' : '#6c63ff',
              color: 'white',
              border: 'none',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease-out',
              transform: isExporting ? 'none' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (!isExporting) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isExporting ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #e8e6ff',
                borderTopColor: '#6c63ff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : (
              <Image size={18} />
            )}
            导出PNG
          </button>

          <button
            onClick={exportGIF}
            disabled={!processedImage || isExporting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: isExporting ? '#ccc' : '#ff6584',
              color: 'white',
              border: 'none',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              if (!isExporting) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isExporting ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #ffd1dc',
                borderTopColor: '#ff6584',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : (
              <Download size={18} />
            )}
            导出GIF
          </button>
        </div>

        <div style={{
          width: '900px',
          height: '600px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            flex: 1,
            padding: '24px',
            gap: '24px'
          }}>
            <div style={{
              flex: '0 0 55%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {!originalImage ? (
                <div
                  className={`upload-area ${isDragging ? 'dragging' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '400px',
                    height: '240px',
                    borderRadius: '16px',
                    border: `2px ${isDragging ? 'solid' : 'dashed'} #6c63ff`,
                    backgroundColor: isDragging ? '#e8e6ff' : '#f0f0ff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    gap: '12px',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <Upload size={48} color="#6c63ff" />
                  <div style={{ fontSize: '16px', color: '#6c63ff', fontWeight: 500 }}>
                    点击或拖拽上传人脸照片
                  </div>
                  <div style={{ fontSize: '13px', color: '#999' }}>
                    支持 JPG / PNG 格式
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <button
                    onClick={resetEditor}
                    style={{
                      marginBottom: '12px',
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#666'
                    }}
                  >
                    重新上传
                  </button>
                  <div
                    ref={editAreaRef}
                    style={{
                      position: 'relative',
                      width: '200px',
                      height: '200px',
                      margin: '0 auto'
                    }}
                  >
                    <img
                      src={processedImage || originalImage}
                      alt="Preview"
                      style={{
                        width: '200px',
                        height: '200px',
                        borderRadius: '12px',
                        boxShadow: 'inset 0 0 0 5px #ddd',
                        display: 'block',
                        transition: 'opacity 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'
                      }}
                    />
                    {isTransforming && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '12px'
                      }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          border: '3px solid #e8e6ff',
                          borderTopColor: '#6c63ff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                      </div>
                    )}
                    {stickers.map(sticker => (
                      <div
                        key={sticker.id}
                        onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
                        onClick={() => removeSticker(sticker.id)}
                        style={{
                          position: 'absolute',
                          left: sticker.x - 20,
                          top: sticker.y - 20,
                          width: '40px',
                          height: '40px',
                          cursor: 'move',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          userSelect: 'none',
                          zIndex: 5
                        }}
                        title="点击删除，拖拽移动"
                      >
                        {getStickerEmoji(sticker.type)}
                        <X
                          size={12}
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            color: '#ff6584',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            padding: '2px'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              flex: '0 0 45%',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              justifyContent: 'center'
            }}>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#333',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Smile size={18} />
                  选择情绪
                </div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  {EMOTIONS.map(emotion => (
                    <button
                      key={emotion.id}
                      onClick={() => applyEmotion(emotion.id)}
                      disabled={!originalImage}
                      style={{
                        width: '80px',
                        height: '40px',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: selectedEmotion === emotion.id ? '#6c63ff' : '#e0e0e0',
                        color: selectedEmotion === emotion.id ? 'white' : '#333',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: originalImage ? 'pointer' : 'not-allowed',
                        opacity: originalImage ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'background-color 0.3s ease'
                      }}
                    >
                      <span>{emotion.emoji}</span>
                      {emotion.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                padding: '16px',
                opacity: originalImage ? 1 : 0.5
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#333',
                  marginBottom: '16px'
                }}>
                  参数微调
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    <span>嘴型调整</span>
                    <span>{mouthAdjust > 0 ? `+${mouthAdjust}%` : `${mouthAdjust}%`}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={mouthAdjust}
                    onChange={(e) => handleParamChange('mouth', parseInt(e.target.value))}
                    disabled={!originalImage}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e0e0e0',
                      outline: 'none',
                      cursor: originalImage ? 'pointer' : 'not-allowed',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <style>{`
                    input[type="range"]::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      background: #6c63ff;
                      cursor: pointer;
                    }
                    input[type="range"]::-moz-range-thumb {
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      background: #6c63ff;
                      cursor: pointer;
                      border: none;
                    }
                  `}</style>
                </div>
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    <span>眼睛大小</span>
                    <span>{eyesAdjust > 0 ? `+${eyesAdjust}%` : `${eyesAdjust}%`}</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={eyesAdjust}
                    onChange={(e) => handleParamChange('eyes', parseInt(e.target.value))}
                    disabled={!originalImage}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e0e0e0',
                      outline: 'none',
                      cursor: originalImage ? 'pointer' : 'not-allowed',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{
            height: '180px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #eee',
            padding: '16px 24px',
            opacity: originalImage ? 1 : 0.5
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#333',
              marginBottom: '12px'
            }}>
              添加贴纸（点击添加，拖拽移动，再次点击删除）
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 60px)',
              gridTemplateRows: 'repeat(2, 60px)',
              gap: '8px',
              justifyContent: 'center'
            }}>
              {STICKER_TYPES.map(type => (
                <div
                  key={type}
                  onClick={() => originalImage && addSticker(type)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    backgroundColor: '#f0f0ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: originalImage ? 'pointer' : 'not-allowed',
                    fontSize: '28px',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    if (originalImage) {
                      e.currentTarget.style.backgroundColor = '#e8e6ff';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0ff';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {getStickerEmoji(type)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        width: '280px',
        backgroundColor: '#fafafa',
        height: '100vh',
        position: 'fixed',
        right: 0,
        top: 0,
        borderLeft: '1px solid #eee',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#333',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Image size={20} color="#6c63ff" />
          我的表情包
        </div>

        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '40px'
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              border: '3px solid #e8e6ff',
              borderTopColor: '#6c63ff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        ) : history.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '13px',
            padding: '40px 20px'
          }}>
            <Smile size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div>暂无历史记录</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              生成表情包后会自动保存到这里
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map(item => (
              <div
                key={item.id}
                onClick={() => loadFromHistory(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <img
                  src={item.imageData}
                  alt="History"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '6px',
                    objectFit: 'cover',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{EMOTIONS.find(e => e.id === item.emotion)?.emoji}</span>
                    <span>{EMOTIONS.find(e => e.id === item.emotion)?.label || item.emotion}</span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#999',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {formatTime(item.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteHistoryItem(e, item.id)}
                  style={{
                    padding: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    color: '#999'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff6584';
                    e.currentTarget.style.backgroundColor = '#ffe0e6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        @media (max-width: 768px) {
          .app-container {
            padding-right: 0 !important;
            flex-direction: column !important;
          }
          
          .app-container > div:first-child {
            padding: 10px !important;
          }
          
          .app-container > div:first-child > div:first-child {
            width: 100% !important;
            height: auto !important;
            min-height: 600px;
          }
          
          .app-container > div:first-child > div:first-child > div:first-child {
            flex-direction: column !important;
          }
          
          .app-container > div:first-child > div:first-child > div:first-child > div {
            flex: none !important;
            width: 100% !important;
          }
          
          .history-sidebar {
            position: relative !important;
            width: 100% !important;
            height: 200px !important;
            border-left: none !important;
            border-top: 1px solid #eee !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
