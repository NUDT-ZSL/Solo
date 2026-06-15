import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './engine/Game';
import { ParamPanel } from './components/ParamPanel';
import { GameParams } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [params, setParams] = useState<GameParams>({
    jumpHeight: 400,
    gravity: 1000,
    lightDamage: 10,
    heavyDamage: 25,
    dashCooldown: 0.8,
  });
  const [gameOver, setGameOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gameRef.current) {
        gameRef.current.resize();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const game = new Game(canvas);
    gameRef.current = game;

    game.setOnGameOver(() => {
      setGameOver(true);
    });

    game.start();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      game.destroy();
    };
  }, []);

  const handleParamChange = useCallback((key: keyof GameParams, value: number) => {
    setParams(prev => {
      const newParams = { ...prev, [key]: value };
      if (gameRef.current) {
        gameRef.current.setParams({ [key]: value });
      }
      return newParams;
    });
  }, []);

  const handleToggleRecording = useCallback((): boolean => {
    if (!gameRef.current) return false;
    const result = gameRef.current.toggleRecording();
    setIsRecording(result);
    if (!result) {
      setHasRecording(gameRef.current.hasRecording());
    }
    return result;
  }, []);

  const handleStartPlayback = useCallback((): boolean => {
    if (!gameRef.current) return false;
    return gameRef.current.startPlayback();
  }, []);

  const handleExportConfig = useCallback((): string => {
    if (!gameRef.current) return '';
    return gameRef.current.exportConfig();
  }, []);

  const handleReset = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.reset();
      setGameOver(false);
      setIsRecording(false);
      setHasRecording(false);
    }
  }, []);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    imageRendering: 'pixelated',
    imageRendering: '-moz-crisp-edges',
    imageRendering: 'crisp-edges',
  };

  const gameOverOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 200,
    animation: 'fadeIn 0.3s ease',
  };

  const retryButtonStyle: React.CSSProperties = {
    padding: '16px 48px',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#d9534f',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 16px rgba(217, 83, 79, 0.4)',
  };

  return (
    <div style={containerStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />

      <ParamPanel
        params={params}
        onParamChange={handleParamChange}
        onToggleRecording={handleToggleRecording}
        onStartPlayback={handleStartPlayback}
        onExportConfig={handleExportConfig}
        onReset={handleReset}
        isRecording={isRecording}
        hasRecording={hasRecording}
      />

      {gameOver && (
        <div style={gameOverOverlayStyle}>
          <button
            onClick={handleReset}
            style={retryButtonStyle}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(255,255,255,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(217, 83, 79, 0.4)';
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            重试
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4A90D9;
          cursor: pointer;
          border: 2px solid #fff;
          transition: transform 0.1s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4A90D9;
          cursor: pointer;
          border: 2px solid #fff;
          transition: transform 0.1s ease;
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #333;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
    </div>
  );
};

export default App;
