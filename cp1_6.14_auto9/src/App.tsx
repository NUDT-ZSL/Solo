import React, { useState, useCallback, useEffect, useRef } from 'react';
import ControlPanel from './ControlPanel';
import PreviewArea from './PreviewArea';
import {
  type FontPair,
  type FontConfig,
  defaultFontPairs,
  loadGoogleFonts,
  getAllUniqueFontNames,
} from './fonts';

interface TextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

const DEFAULT_TEXT = '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。';

const App: React.FC = () => {
  const [fontPairs, setFontPairs] = useState<FontPair[]>(defaultFontPairs);
  const [activePairIndex, setActivePairIndex] = useState(0);
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
  });
  const [testText, setTestText] = useState(DEFAULT_TEXT);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<{ handleScreenshot: () => Promise<void> }>(null);
  const prevFontNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentNames = new Set(getAllUniqueFontNames(fontPairs));
    const newNames = Array.from(currentNames).filter(
      (name) => !prevFontNamesRef.current.has(name)
    );

    if (newNames.length > 0) {
      const hasGoogleFont = newNames.some((name) => {
        for (const pair of fontPairs) {
          if (pair.title.name === name && pair.title.category === 'google') return true;
          if (pair.body.name === name && pair.body.category === 'google') return true;
        }
        return false;
      });

      if (hasGoogleFont) {
        setLoading(true);
        const loadPromise = loadGoogleFonts(newNames);
        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 800));

        Promise.race([loadPromise, timeoutPromise]).finally(() => {
          setTimeout(() => setLoading(false), 50);
        });
      }
    }

    prevFontNamesRef.current = currentNames;
  }, [fontPairs]);

  const handleTitleFontChange = useCallback(
    (pairIndex: number, font: FontConfig) => {
      setFontPairs((prev) =>
        prev.map((p, i) => (i === pairIndex ? { ...p, title: font } : p))
      );
    },
    []
  );

  const handleBodyFontChange = useCallback(
    (pairIndex: number, font: FontConfig) => {
      setFontPairs((prev) =>
        prev.map((p, i) => (i === pairIndex ? { ...p, body: font } : p))
      );
    },
    []
  );

  const handleReorderPairs = useCallback((newPairs: FontPair[]) => {
    setFontPairs(newPairs);
  }, []);

  const handleScreenshot = useCallback(async () => {
    if (previewRef.current) {
      await previewRef.current.handleScreenshot();
    }
  }, []);

  const handleScreenshotReady = useCallback((fn: () => Promise<void>) => {
    previewRef.current = { handleScreenshot: fn };
  }, []);

  return (
    <div className="app-container">
      <ControlPanel
        fontPairs={fontPairs}
        activePairIndex={activePairIndex}
        onActivePairChange={setActivePairIndex}
        onTitleFontChange={handleTitleFontChange}
        onBodyFontChange={handleBodyFontChange}
        textStyle={textStyle}
        onTextStyleChange={setTextStyle}
        testText={testText}
        onTestTextChange={setTestText}
        onScreenshot={handleScreenshot}
      />
      <PreviewArea
        ref={previewRef}
        fontPairs={fontPairs}
        onReorderPairs={handleReorderPairs}
        textStyle={textStyle}
        testText={testText}
        loading={loading}
        onScreenshotReady={handleScreenshotReady}
      />
    </div>
  );
};

export default App;
