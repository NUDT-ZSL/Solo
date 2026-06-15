import React, { useState, useRef, useCallback, useEffect } from 'react';
import Page, { BackSide } from './Page';
import ThumbnailBar from './ThumbnailBar';
import themes, { themeList, type Theme, type ThemeName } from './theme';

type CropRatio = 'original' | '3:2' | '4:3';

interface ProcessedImage {
  src: string;
  originalName: string;
}

const MAX_IMAGES = 15;
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_WIDTH = 800;

const processImage = (
  file: File,
  ratio: CropRatio,
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 不可用'));
          return;
        }

        let targetW: number;
        let targetH: number;

        if (ratio === '3:2') {
          targetW = MAX_WIDTH;
          targetH = Math.round((MAX_WIDTH * 2) / 3);
        } else if (ratio === '4:3') {
          targetW = MAX_WIDTH;
          targetH = Math.round((MAX_WIDTH * 3) / 4);
        } else {
          const scale = Math.min(1, MAX_WIDTH / img.width);
          targetW = Math.round(img.width * scale);
          targetH = Math.round(img.height * scale);
        }

        canvas.width = targetW;
        canvas.height = targetH;

        const imgRatio = img.width / img.height;
        const targetRatio = targetW / targetH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;

        if (ratio !== 'original') {
          if (imgRatio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
          }
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

        resolve({
          src: canvas.toDataURL('image/jpeg', 0.9),
          originalName: file.name,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [themeName, setThemeName] = useState<ThemeName>('warmSun');
  const [cropRatio, setCropRatio] = useState<CropRatio>('original');
  const [flipping, setFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [flipFromPage, setFlipFromPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mobileTransition, setMobileTransition] = useState(false);
  const [uploading, setUploading] = useState(false);

  const theme: Theme = themes[themeName];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const check = () => {
      const mobile =
        window.matchMedia('(max-width: 768px)').matches &&
        window.matchMedia('(orientation: portrait)').matches;
      setIsMobile(mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setUploading(true);
      try {
        const files = Array.from(fileList).filter((f) => {
          const okType =
            f.type === 'image/jpeg' ||
            f.type === 'image/jpg' ||
            f.type === 'image/png';
          const okSize = f.size <= MAX_SIZE;
          return okType && okSize;
        });

        const remaining = MAX_IMAGES - images.length;
        const toProcess = files.slice(0, remaining);

        const processed = await Promise.all(
          toProcess.map((f) => processImage(f, cropRatio)),
        );

        setImages((prev) => [...prev, ...processed]);
      } finally {
        setUploading(false);
      }
    },
    [images.length, cropRatio],
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const goToPage = useCallback(
    (targetIdx: number) => {
      if (flipping || targetIdx === currentPage) return;
      if (targetIdx < 0 || targetIdx >= images.length) return;

      if (isMobile) {
        setMobileTransition(true);
        setTimeout(() => {
          setCurrentPage(targetIdx);
          setTimeout(() => setMobileTransition(false), 500);
        }, 100);
        return;
      }

      const direction: 'next' | 'prev' = targetIdx > currentPage ? 'next' : 'prev';
      setFlipDirection(direction);
      setFlipFromPage(currentPage);
      setFlipping(true);

      const pagesToMove = Math.abs(targetIdx - currentPage);
      const totalDuration = 800 + Math.min(pagesToMove, 3) * 100;

      setTimeout(() => {
        setCurrentPage(targetIdx);
      }, totalDuration);

      setTimeout(() => {
        setFlipping(false);
      }, totalDuration + 900);
    },
    [currentPage, flipping, images.length, isMobile],
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) nextPage();
      else prevPage();
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (currentPage >= images.length - 1 && idx === images.length - 1) {
      setCurrentPage(Math.max(0, currentPage - 1));
    } else if (idx < currentPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getPageTransform = (idx: number): number => {
    if (!flipping) {
      if (idx < currentPage) return -179.9;
      if (idx === currentPage) return 0;
      return 0;
    }

    const from = flipFromPage;
    const to = currentPage + (flipDirection === 'next' ? 1 : -1);

    if (flipDirection === 'next') {
      if (idx === from) return -179.9;
      if (idx > from && idx <= to) return 0;
      if (idx < from) return -179.9;
      return 0;
    } else {
      if (idx === from) return 0;
      if (idx < from && idx >= to) return -179.9;
      if (idx > from) return 0;
      return -179.9;
    }
  };

  const getPageStartTransform = (idx: number): number => {
    if (!flipping) {
      if (idx < currentPage) return -179.9;
      if (idx === currentPage) return 0;
      return 0;
    }

    const from = flipFromPage;

    if (flipDirection === 'next') {
      if (idx === from) return 0;
      if (idx === from + 1) return 0;
      if (idx < from) return -179.9;
      return 0;
    } else {
      if (idx === from) return 0;
      if (idx === from - 1) return -179.9;
      if (idx < from) return -179.9;
      return 0;
    }
  };

  const getPageZIndex = (idx: number): number => {
    if (!flipping) {
      if (idx === currentPage) return 100;
      if (idx < currentPage) return 100 - (currentPage - idx);
      return 100 - (idx - currentPage);
    }

    const from = flipFromPage;

    if (flipDirection === 'next') {
      if (idx === from) return 200;
      if (idx === from + 1) return 50;
      if (idx < from) return 10 - (from - idx);
      return 50 - (idx - from);
    } else {
      if (idx === from - 1) return 200;
      if (idx === from) return 50;
      if (idx < from) return 10 - (from - idx);
      return 50 - (idx - from);
    }
  };

  const showUploadArea = images.length === 0;
  const effectivePageForActive = flipping ? flipFromPage : currentPage;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.background,
        transition: 'background-color 0.6s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          zIndex: 50,
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? '18px' : '24px',
            color: theme.textColor,
            fontWeight: 600,
            letterSpacing: '2px',
            margin: 0,
          }}
        >
          ✦ 时光相册 · 折叠日记
        </h1>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={themeName}
            onChange={(e) => setThemeName(e.target.value as ThemeName)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${theme.borderColor}`,
              backgroundColor: theme.pageBackground,
              color: theme.textColor,
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {themeList.map((t) => (
              <option key={t.name} value={t.name}>
                🎨 {t.displayName}
              </option>
            ))}
          </select>

          <select
            value={cropRatio}
            onChange={(e) => setCropRatio(e.target.value as CropRatio)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${theme.borderColor}`,
              backgroundColor: theme.pageBackground,
              color: theme.textColor,
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
            }}
            title="裁剪比例（对新上传生效）"
          >
            <option value="original">📐 原始比例</option>
            <option value="3:2">📐 3:2</option>
            <option value="4:3">📐 4:3</option>
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES || uploading}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: theme.primary,
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: images.length >= MAX_IMAGES ? 'not-allowed' : 'pointer',
              opacity: images.length >= MAX_IMAGES ? 0.5 : 1,
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              if (images.length < MAX_IMAGES)
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                'translateY(0)';
            }}
          >
            {uploading ? '处理中…' : `📷 上传 (${images.length}/${MAX_IMAGES})`}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={onFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {showUploadArea ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginTop: isMobile ? '120px' : '140px',
            width: isMobile ? '88%' : 'min(720px, 80%)',
            height: isMobile ? '360px' : '420px',
            border: `3px dashed ${isDragOver ? theme.primary : theme.borderColor}`,
            borderRadius: '16px',
            backgroundColor: isDragOver
              ? theme.pageBackground
              : `${theme.pageBackground}80`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
            boxShadow: isDragOver
              ? `0 12px 40px ${theme.shadowColor}`
              : `0 4px 20px ${theme.shadowColor.replace('0.4', '0.2')}`,
          }}
        >
          <div style={{ fontSize: isMobile ? '64px' : '88px' }}>📖</div>
          <div
            style={{
              textAlign: 'center',
              color: theme.textColor,
              fontSize: isMobile ? '15px' : '18px',
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: isMobile ? '18px' : '22px' }}>
              点击或拖拽照片到此处
            </div>
            <div style={{ marginTop: '6px', opacity: 0.7 }}>
              支持 JPG / PNG 格式，单次最多 15 张，单张不超过 5MB
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            style={{
              padding: '12px 28px',
              borderRadius: '30px',
              border: 'none',
              backgroundColor: theme.primary,
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${theme.shadowColor}`,
            }}
          >
            + 选择照片
          </button>
        </div>
      ) : isMobile ? (
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            marginTop: '100px',
            width: '92%',
            maxWidth: '1000px',
            position: 'relative',
            perspective: '1500px',
            cursor: 'pointer',
            touchAction: 'pan-y',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '75%',
              backgroundColor: theme.pageBackground,
              borderRadius: '8px',
              boxShadow: `0 8px 30px ${theme.shadowColor}`,
              overflow: 'hidden',
              transition: mobileTransition
                ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s'
                : 'none',
              transform: mobileTransition ? 'translateX(-40px)' : 'translateX(0)',
              opacity: mobileTransition ? 0 : 1,
            }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <Page
                index={currentPage}
                imageSrc={images[currentPage].src}
                isActive={!mobileTransition}
                theme={theme}
                totalPages={images.length}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 6px',
            }}
          >
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              style={navBtnStyle(currentPage === 0, theme)}
            >
              ← 上一页
            </button>
            <span
              style={{
                color: theme.textColor,
                fontFamily: 'monospace',
                fontSize: '14px',
                alignSelf: 'center',
              }}
            >
              {currentPage + 1} / {images.length}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage === images.length - 1}
              style={navBtnStyle(currentPage === images.length - 1, theme)}
            >
              下一页 →
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) prevPage();
            else nextPage();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          style={{
            marginTop: '110px',
            width: '92%',
            maxWidth: '1000px',
            position: 'relative',
            perspective: '1500px',
            cursor: flipping ? 'grabbing' : 'pointer',
            paddingBottom: '60px',
            userSelect: 'none',
          }}
        >
          {isDragOver && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '3px dashed ' + theme.primary,
                borderRadius: '12px',
                backgroundColor: `${theme.pageBackground}90`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                color: theme.textColor,
                fontSize: '20px',
                fontWeight: 600,
                pointerEvents: 'none',
              }}
            >
              📷 松开以上传照片
            </div>
          )}

          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '75%',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '30px',
                background: theme.spineGradient,
                borderTopLeftRadius: '8px',
                borderBottomLeftRadius: '8px',
                boxShadow: `inset -4px 0 10px ${theme.shadowColor}`,
                zIndex: 4,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '30px',
                background: theme.spineGradient,
                borderTopRightRadius: '8px',
                borderBottomRightRadius: '8px',
                boxShadow: `inset 4px 0 10px ${theme.shadowColor}`,
                zIndex: 4,
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: '30px',
                right: '30px',
                top: 0,
                bottom: 0,
                backgroundColor: theme.pageBackground,
                boxShadow: `0 10px 40px ${theme.shadowColor}, inset 0 0 20px ${theme.shadowColor.replace('0.4', '0.1')}`,
                overflow: 'hidden',
              }}
            >
              {images.map((img, idx) => {
                const startRotate = getPageStartTransform(idx);
                const endRotate = getPageTransform(idx);
                const zIndex = getPageZIndex(idx);
                const isActiveNow = !flipping && idx === currentPage;

                const isFlippingThis = flipping && (
                  (flipDirection === 'next' && (idx === flipFromPage || idx === flipFromPage + 1)) ||
                  (flipDirection === 'prev' && (idx === flipFromPage || idx === flipFromPage - 1))
                );

                let display = 'block';
                if (!flipping) {
                  if (idx < currentPage - 2 || idx > currentPage + 2) {
                    display = 'none';
                  }
                } else {
                  const nearby = Math.abs(idx - flipFromPage) <= 2;
                  if (!nearby) display = 'none';
                }

                const currentRotate = flipping && isFlippingThis ? endRotate : startRotate;
                const hasTransition = isFlippingThis;

                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      transformOrigin: 'left center',
                      transform: `rotateY(${currentRotate}deg)`,
                      transition: hasTransition
                        ? 'transform 1.2s cubic-bezier(0.645, 0.045, 0.355, 1), box-shadow 0.3s'
                        : 'none',
                      zIndex,
                      display,
                      willChange: hasTransition ? 'transform' : 'auto',
                    }}
                  >
                    <Page
                      index={idx}
                      imageSrc={img.src}
                      isActive={isActiveNow}
                      theme={theme}
                      totalPages={images.length}
                    />
                    <BackSide theme={theme} />

                    {isFlippingThis && flipDirection === 'next' && idx === flipFromPage && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '10px',
                          background: `linear-gradient(90deg, ${theme.shadowColor.replace('0.4', '0.8')} 0%, transparent 100%)`,
                          pointerEvents: 'none',
                          zIndex: 999,
                          transform: 'translateZ(0.1px)',
                        }}
                      />
                    )}
                    {isFlippingThis && flipDirection === 'prev' && idx === flipFromPage - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '10px',
                          background: `linear-gradient(90deg, ${theme.shadowColor.replace('0.4', '0.8')} 0%, transparent 100%)`,
                          pointerEvents: 'none',
                          zIndex: 999,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '-28px',
              right: '8px',
              display: 'flex',
              gap: '6px',
              zIndex: 60,
              alignItems: 'center',
            }}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`删除第 ${idx + 1} 页？`)) removeImage(idx);
                }}
                style={{
                  width: idx === effectivePageForActive ? '11px' : '8px',
                  height: idx === effectivePageForActive ? '11px' : '8px',
                  borderRadius: '50%',
                  border: idx === effectivePageForActive ? `2px solid ${theme.thumbnailActiveBorder}` : 'none',
                  backgroundColor:
                    idx === effectivePageForActive
                      ? theme.primary
                      : `${theme.primary}60`,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.3s',
                  boxSizing: 'content-box',
                }}
                title={`第 ${idx + 1} 页（点击删除）`}
              />
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '8px',
              display: 'flex',
              gap: '14px',
              fontSize: '12px',
              color: theme.textColor,
              opacity: 0.6,
              zIndex: 60,
              pointerEvents: 'none',
            }}
          >
            <span>◀ 左侧点击上一页</span>
            <span>·</span>
            <span>右侧点击下一页 ▶</span>
          </div>
        </div>
      )}

      <ThumbnailBar
        images={images.map((i) => i.src)}
        currentIndex={flipping ? flipFromPage : currentPage}
        onSelect={goToPage}
        theme={theme}
      />

      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        button:focus, select:focus, input:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

function navBtnStyle(disabled: boolean, theme: Theme): React.CSSProperties {
  return {
    padding: '8px 18px',
    borderRadius: '20px',
    border: `1px solid ${theme.borderColor}`,
    backgroundColor: disabled ? `${theme.pageBackground}60` : theme.pageBackground,
    color: disabled ? `${theme.textColor}60` : theme.textColor,
    fontSize: '13px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
  };
}

export default App;
