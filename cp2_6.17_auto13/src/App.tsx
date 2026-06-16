import React, { useState, useEffect, useCallback } from 'react';
import { Star, Constellation, DivinationResult } from './types';
import { CONFIG, DIVINATION_TEXTS, WEATHER_ICONS } from './config';
import GameBoard from './GameBoard';
import DivinationPanel from './DivinationPanel';
import LogPanel from './LogPanel';

const STORAGE_KEYS = {
  LAST_DIVINATION_TIME: 'star_divination_last_time',
  LAST_RESULT: 'star_divination_last_result',
  LOGS: 'star_divination_logs'
};

const App: React.FC = () => {
  const [stars, setStars] = useState<Star[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [currentResult, setCurrentResult] = useState<DivinationResult | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<DivinationResult[]>([]);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  useEffect(() => {
    try {
      const savedLastTime = localStorage.getItem(STORAGE_KEYS.LAST_DIVINATION_TIME);
      const savedLastResult = localStorage.getItem(STORAGE_KEYS.LAST_RESULT);
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);

      if (savedLastResult) {
        setCurrentResult(JSON.parse(savedLastResult));
        setIsPanelOpen(true);
      }

      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }

      if (savedLastTime) {
        const lastTime = parseInt(savedLastTime, 10);
        const now = Date.now();
        const elapsed = now - lastTime;
        const remaining = Math.max(0, CONFIG.TIME.DIVINATION_COOLDOWN - elapsed);
        setCooldownRemaining(remaining);
      }
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs:', e);
    }
  }, [logs]);

  useEffect(() => {
    try {
      if (currentResult) {
        localStorage.setItem(STORAGE_KEYS.LAST_RESULT, JSON.stringify(currentResult));
        localStorage.setItem(STORAGE_KEYS.LAST_DIVINATION_TIME, String(currentResult.timestamp));
      } else {
        localStorage.removeItem(STORAGE_KEYS.LAST_RESULT);
        localStorage.removeItem(STORAGE_KEYS.LAST_DIVINATION_TIME);
      }
    } catch (e) {
      console.error('Failed to save result:', e);
    }
  }, [currentResult]);

  const canDivinate = cooldownRemaining <= 0;

  const handleConstellationClick = useCallback((constellation: Constellation) => {
    if (!canDivinate) {
      if (currentResult) {
        setIsPanelOpen(true);
      }
      return;
    }

    const randomText = DIVINATION_TEXTS[Math.floor(Math.random() * DIVINATION_TEXTS.length)];
    const randomWeather = WEATHER_ICONS[Math.floor(Math.random() * WEATHER_ICONS.length)];
    const now = Date.now();

    const result: DivinationResult = {
      id: now,
      constellationId: constellation.id,
      constellationName: constellation.name,
      zodiac: constellation.zodiac,
      text: randomText,
      weather: randomWeather,
      date: formatDate(new Date(now)),
      timestamp: now
    };

    setCurrentResult(result);
    setIsPanelOpen(true);
    setCooldownRemaining(CONFIG.TIME.DIVINATION_COOLDOWN);
    setLogs(prev => [...prev, result]);
  }, [canDivinate, currentResult]);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const handleToggleLog = useCallback(() => {
    setIsLogOpen(prev => !prev);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <GameBoard
        onConstellationClick={handleConstellationClick}
        canDivinate={canDivinate}
        stars={stars}
        constellations={constellations}
        setStars={setStars}
        setConstellations={setConstellations}
      />

      <DivinationPanel
        result={currentResult}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        cooldownRemaining={cooldownRemaining}
      />

      <LogPanel
        logs={logs}
        isOpen={isLogOpen}
        onClose={handleToggleLog}
      />

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 50
        }}
      >
        <h1
          style={{
            fontFamily: 'serif',
            color: CONFIG.COLORS.CONSTELLATION_TEXT,
            fontSize: 'clamp(18px, 4vw, 28px)',
            fontWeight: 'bold',
            margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            letterSpacing: '4px'
          }}
        >
          星 宿 占 卜
        </h1>
        <p
          style={{
            fontFamily: 'serif',
            color: CONFIG.COLORS.CONSTELLATION_TEXT,
            fontSize: 'clamp(10px, 2vw, 13px)',
            margin: '8px 0 0 0',
            opacity: 0.7,
            letterSpacing: '2px'
          }}
        >
          {canDivinate ? '点击星宿，占卜明日吉凶' : '今日已占卜，请明日再来'}
        </p>
      </div>
    </div>
  );
};

export default App;
