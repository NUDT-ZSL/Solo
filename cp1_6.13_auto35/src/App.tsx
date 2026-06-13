import React, { useState, useCallback, useRef, useMemo } from 'react';
import RawInput from './components/RawInput';
import PlatformPreview from './components/PlatformPreview';
import { convertText, PLATFORM_CONFIGS } from './utils/converters';
import type { Platform } from './utils/converters';

const PLATFORMS: Platform[] = ['weibo', 'xiaohongshu', 'zhihu'];

const App: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [activePlatform, setActivePlatform] = useState<Platform>('weibo');
  const [toast, setToast] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPlatformIndex = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const formattedText = useMemo(
    () => convertText(rawText, activePlatform),
    [rawText, activePlatform]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const handlePlatformSwitch = useCallback((platform: Platform) => {
    const newIndex = PLATFORMS.indexOf(platform);
    const direction = newIndex > prevPlatformIndex.current ? 'left' : 'right';
    setSlideDirection(direction);
    setIsAnimating(true);
    setActivePlatform(platform);
    prevPlatformIndex.current = newIndex;
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  const handleEdit = useCallback((_editedText: string, _platform: Platform) => {
  }, []);

  return (
    <div className="app">
      <header className="app-banner">
        <h1 className="app-title">CrossPoster</h1>
      </header>

      <div className={`toast-notification ${toast ? 'toast-visible' : ''}`}>
        {toast}
      </div>

      <main className="app-main">
        <div className="app-left">
          <RawInput
            rawText={rawText}
            onTextChange={setRawText}
            activePlatform={activePlatform}
          />
        </div>

        <div className="app-right">
          <div className="platform-tabs">
            {PLATFORMS.map((p) => {
              const config = PLATFORM_CONFIGS[p];
              const isActive = p === activePlatform;
              return (
                <button
                  key={p}
                  className={`platform-tab ${isActive ? 'tab-active' : ''}`}
                  style={{
                    backgroundColor: isActive ? config.color : '#e5e7eb',
                    color: isActive ? '#ffffff' : '#374151',
                  }}
                  onClick={() => handlePlatformSwitch(p)}
                >
                  {config.name}
                </button>
              );
            })}
          </div>

          <div className="preview-wrapper">
            <div
              className={`preview-slide ${isAnimating ? `slide-${slideDirection}` : ''}`}
            >
              <PlatformPreview
                key={activePlatform}
                formattedText={formattedText}
                platform={activePlatform}
                onEdit={handleEdit}
                showToast={showToast}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
