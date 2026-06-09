import React, { useState, useEffect, useRef, useCallback } from 'react';
import PuzzleCanvas from './components/PuzzleCanvas';
import { PuzzlePiece, generatePuzzlePieces } from './utils/puzzleGen';

type GameStage = 'idle' | 'playing' | 'complete';

const CANVAS_RATIO = 4 / 3;
const PUZZLE_AREA_RATIO = 0.8;
const MAX_PUZZLE_WIDTH = 900;

function App() {
  const [gameStage, setGameStage] = useState<GameStage>('idle');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [progress, setProgress] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 900 });
  const [puzzleArea, setPuzzleArea] = useState({ x: 120, y: 90, w: 960, h: 720 });
  const [isComplete, setIsComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const calculateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobileView = window.innerWidth < 768;
    setIsMobile(isMobileView);

    const containerWidth = container.clientWidth;
    const maxWidth = isMobileView ? containerWidth : Math.min(containerWidth * 0.95, 1200);
    let canvasW = maxWidth;
    let canvasH = canvasW / CANVAS_RATIO;

    const maxHeight = window.innerHeight * 0.75;
    if (canvasH > maxHeight) {
      canvasH = maxHeight;
      canvasW = canvasH * CANVAS_RATIO;
    }

    let puzzleW = canvasW * PUZZLE_AREA_RATIO;
    if (puzzleW > MAX_PUZZLE_WIDTH) puzzleW = MAX_PUZZLE_WIDTH;
    const puzzleH = puzzleW;

    const puzzleX = (canvasW - puzzleW) / 2;
    const puzzleY = (canvasH - puzzleH) / 2;

    setCanvasSize({ w: Math.round(canvasW), h: Math.round(canvasH) });
    setPuzzleArea({
      x: Math.round(puzzleX),
      y: Math.round(puzzleY),
      w: Math.round(puzzleW),
      h: Math.round(puzzleH)
    });
  }, []);

  useEffect(() => {
    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, [calculateLayout]);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert('请上传 JPG 或 PNG 格式的图片');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        imageRef.current = img;
        setImage(img);

        let targetW = img.width;
        let targetH = img.height;
        const targetSize = 1200;
        if (targetW > targetSize || targetH > targetSize) {
          const scale = Math.min(targetSize / targetW, targetSize / targetH);
          targetW = Math.round(targetW * scale);
          targetH = Math.round(targetH * scale);
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(img, 0, 0, targetW, targetH);

        const processedImg = new Image();
        processedImg.onload = async () => {
          imageRef.current = processedImg;
          setImage(processedImg);

          const generatedPieces = await generatePuzzlePieces(
            processedImg,
            canvasSize.w,
            canvasSize.h,
            puzzleArea.x,
            puzzleArea.y,
            puzzleArea.w,
            puzzleArea.h
          );

          setPieces(generatedPieces);
          setProgress(0);
          setIsComplete(false);
          setGameStage('playing');
          setIsUploading(false);
        };
        processedImg.src = tempCanvas.toDataURL('image/png');
      };
      img.onerror = () => {
        alert('图片加载失败，请尝试其他图片');
        setIsUploading(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      alert('文件读取失败');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  }, [canvasSize, puzzleArea]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  }, [handleImageUpload]);

  const handleReset = useCallback(async () => {
    if (!imageRef.current) return;

    const generatedPieces = await generatePuzzlePieces(
      imageRef.current,
      canvasSize.w,
      canvasSize.h,
      puzzleArea.x,
      puzzleArea.y,
      puzzleArea.w,
      puzzleArea.h
    );

    setPieces(generatedPieces);
    setProgress(0);
    setIsComplete(false);
    setGameStage('playing');
  }, [canvasSize, puzzleArea]);

  const handlePiecesChange = useCallback((newPieces: PuzzlePiece[]) => {
    setPieces(newPieces);
  }, []);

  const handleProgressChange = useCallback((newProgress: number) => {
    setProgress(newProgress);
  }, []);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    setGameStage('complete');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const getProgressGradient = () => {
    const p = progress / 100;
    const r1 = 255, g1 = 107, b1 = 107;
    const r2 = 72, g2 = 219, b2 = 251;
    const r = Math.round(r1 + (r2 - r1) * p);
    const g = Math.round(g1 + (g2 - g1) * p);
    const b = Math.round(b1 + (b2 - b1) * p);
    return `linear-gradient(90deg, rgb(${r1}, ${g1}, ${b1}) 0%, rgb(${r}, ${g}, ${b}) ${progress}%, rgba(72, 219, 251, 0.3) ${progress}%)`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '12px 8px' : '24px 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <h1
        style={{
          margin: 0,
          marginBottom: isMobile ? '12px' : '24px',
          fontSize: isMobile ? '22px' : '36px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 25%, #48dbfb 75%, #5f27cd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '0.05em',
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        光影拼图·记忆碎片
      </h1>

      <div
        style={{
          display: 'flex',
          gap: isMobile ? '8px' : '16px',
          marginBottom: isMobile ? '12px' : '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            padding: isMobile ? '10px 16px' : '12px 24px',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #48dbfb 0%, #0abde3 100%)',
            color: '#1a1a2e',
            transition: 'all 0.3s ease',
            opacity: isUploading ? 0.6 : 1,
            boxShadow: '0 4px 15px rgba(72, 219, 251, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!isUploading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 219, 251, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isUploading ? '0 4px 15px rgba(72, 219, 251, 0.3)' : '0 4px 15px rgba(72, 219, 251, 0.3)';
          }}
        >
          {isUploading ? '加载中...' : (image ? '换一张图' : '📷 上传图片')}
        </button>

        <button
          onClick={handleReset}
          disabled={!image || isUploading}
          style={{
            padding: isMobile ? '10px 16px' : '12px 24px',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: (!image || isUploading) ? 'not-allowed' : 'pointer',
            background: (!image || isUploading) ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)',
            color: (!image || isUploading) ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
            transition: 'all 0.3s ease',
            boxShadow: (!image || isUploading) ? 'none' : '0 4px 15px rgba(255, 107, 107, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (image && !isUploading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (image && !isUploading) {
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
            }
          }}
        >
          🔄 重置
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '1280px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: isMobile ? '12px' : '20px'
        }}
      >
        {!image ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: canvasSize.w,
              height: canvasSize.h,
              maxWidth: '100%',
              border: '2px dashed rgba(72, 219, 251, 0.4)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(72, 219, 251, 0.02)',
              transition: 'all 0.3s ease',
              gap: '16px',
              userSelect: 'none',
              boxSizing: 'border-box',
              padding: '24px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(72, 219, 251, 0.7)';
              e.currentTarget.style.background = 'rgba(72, 219, 251, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(72, 219, 251, 0.4)';
              e.currentTarget.style.background = 'rgba(72, 219, 251, 0.02)';
            }}
          >
            <div style={{ fontSize: isMobile ? '48px' : '72px' }}>🧩</div>
            <div style={{
              fontSize: isMobile ? '16px' : '20px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center'
            }}>
              点击或拖拽图片到此处开始
            </div>
            <div style={{
              fontSize: isMobile ? '12px' : '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center'
            }}>
              支持 JPG / PNG 格式，最大 10MB
            </div>
          </div>
        ) : (
          <div
            style={{
              width: canvasSize.w,
              height: canvasSize.h,
              maxWidth: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(72, 219, 251, 0.08)',
              background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 50%, #16213e 100%)',
              border: '1px solid rgba(72, 219, 251, 0.15)',
              boxSizing: 'border-box'
            }}
          >
            <PuzzleCanvas
              image={image}
              pieces={pieces}
              onPiecesChange={handlePiecesChange}
              onProgressChange={handleProgressChange}
              onComplete={handleComplete}
              puzzleArea={puzzleArea}
              canvasSize={canvasSize}
              isComplete={isComplete}
            />
          </div>
        )}
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: canvasSize.w,
          padding: isMobile ? '0 4px' : '0 8px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '6px' : '8px',
            gap: '12px'
          }}
        >
          <span style={{
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            whiteSpace: 'nowrap'
          }}>
            拼接进度
          </span>
          <span style={{
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: 700,
            color: progress === 100 ? '#48dbfb' : 'rgba(255, 255, 255, 0.9)',
            whiteSpace: 'nowrap',
            transition: 'color 0.3s ease'
          }}>
            {progress.toFixed(0)}%
            {isComplete && ' 🎉 完成！'}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: isMobile ? '6px' : '8px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              background: getProgressGradient(),
              borderRadius: '100px',
              transition: 'background 0.3s ease',
              boxShadow: progress > 0 ? '0 0 10px rgba(72, 219, 251, 0.3)' : 'none'
            }}
          />
        </div>

        {gameStage === 'playing' && (
          <div style={{
            marginTop: isMobile ? '10px' : '16px',
            fontSize: isMobile ? '11px' : '13px',
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            lineHeight: 1.6
          }}>
            💡 提示：拖拽画布四周的不规则碎片到中央区域，接近正确位置时会自动吸附
          </div>
        )}

        {gameStage === 'complete' && (
          <div style={{
            marginTop: isMobile ? '10px' : '16px',
            fontSize: isMobile ? '13px' : '15px',
            color: '#48dbfb',
            textAlign: 'center',
            fontWeight: 600,
            lineHeight: 1.6,
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            ✨ 记忆碎片已完整拼合，光影重现！点击「重置」或「换一张图」继续游戏
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}

export default App;
