import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ColorGrid, Cell } from './ColorGrid';
import { PaletteItem, paletteGenerator } from '../ColorEngine/PaletteGenerator';
import { colorEngine, LevelConfig, LEVELS } from '../ColorEngine/ColorEngine';
import {
  RGB,
  rgbToString,
  generateId,
  formatTime,
  lerpRgb,
} from '../../utils/helpers';

interface GameResult {
  level: number;
  matchPercentage: number;
  elapsedTime: number;
  isSuccess: boolean;
  isPerfect: boolean;
}

interface GameBoardProps {
  onComplete: (result: GameResult) => void;
  onBack: () => void;
}

const MAX_HINTS = 3;
const SUCCESS_THRESHOLD = 80;
const FAIL_THRESHOLD = 60;

export const GameBoard: React.FC<GameBoardProps> = ({ onComplete, onBack }) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [palette, setPalette] = useState<PaletteItem[]>([]);
  const [targetPattern, setTargetPattern] = useState<RGB[][]>([]);
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
  const [highlightedCells, setHighlightedCells] = useState<string[]>([]);
  const [hintCells, setHintCells] = useState<Map<string, RGB>>(new Map());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragColor, setDragColor] = useState<RGB | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const matchCalculationRef = useRef<number | null>(null);
  const recentlyPlacedRef = useRef<Set<string>>(new Set());

  const level = LEVELS[currentLevel];

  const initializeGame = useCallback((levelConfig: LevelConfig) => {
    const target = colorEngine.generateTargetPattern(levelConfig);
    setTargetPattern(target);

    const newGrid: Cell[][] = [];
    for (let row = 0; row < levelConfig.gridSize; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < levelConfig.gridSize; col++) {
        rowCells.push({
          id: generateId(),
          row,
          col,
          color: null,
          targetColor: target[row][col],
          isHighlighted: false,
        });
      }
      newGrid.push(rowCells);
    }
    setGrid(newGrid);

    const newPalette = paletteGenerator.generatePalette(levelConfig);
    setPalette(newPalette);

    setMatchPercentage(0);
    setHintsRemaining(MAX_HINTS);
    setHighlightedCells([]);
    setHintCells(new Map());
    setElapsedTime(0);
    setIsComplete(false);
    setIsSuccess(false);
    setShowResult(false);

    startTimeRef.current = Date.now();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  useEffect(() => {
    initializeGame(level);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (matchCalculationRef.current) {
        clearTimeout(matchCalculationRef.current);
      }
    };
  }, [currentLevel, level, initializeGame]);

  const calculateMatch = useCallback(() => {
    if (matchCalculationRef.current) {
      clearTimeout(matchCalculationRef.current);
    }

    matchCalculationRef.current = window.setTimeout(() => {
      const userGrid: (RGB | null)[][] = grid.map((row) =>
        row.map((cell) => cell.color)
      );

      const percentage = colorEngine.calculateMatchPercentage(
        userGrid,
        targetPattern
      );
      setMatchPercentage(percentage);

      const filledCells = userGrid.flat().filter((c) => c !== null).length;
      const totalCells = level.gridSize * level.gridSize;

      if (filledCells === totalCells) {
        handleGameComplete(percentage);
      }
    }, 100);
  }, [grid, targetPattern, level.gridSize]);

  useEffect(() => {
    if (grid.length > 0 && targetPattern.length > 0) {
      calculateMatch();
    }
  }, [grid, targetPattern, calculateMatch]);

  const handleGameComplete = (percentage: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsComplete(true);
    const success = percentage >= SUCCESS_THRESHOLD;
    setIsSuccess(success);
    setShowResult(true);

    onComplete({
      level: currentLevel + 1,
      matchPercentage: percentage,
      elapsedTime,
      isSuccess: success,
      isPerfect: percentage === 100,
    });
  };

  const handleCellDrop = useCallback(
    (row: number, col: number, color: RGB, paletteItemId: string) => {
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => r.map((c) => ({ ...c })));
        const oldColor = newGrid[row][col].color;

        if (oldColor) {
          const oldPaletteItem = palette.find(
            (p) => p.color.r === oldColor.r && p.color.g === oldColor.g && p.color.b === oldColor.b && p.isUsed
          );
          if (oldPaletteItem) {
            setPalette((prev) =>
              paletteGenerator.markAsUnused(prev, oldPaletteItem.id)
            );
          }
        }

        newGrid[row][col].color = color;
        newGrid[row][col].justPlaced = true;

        const cellId = newGrid[row][col].id;
        recentlyPlacedRef.current.add(cellId);
        setTimeout(() => {
          recentlyPlacedRef.current.delete(cellId);
          setGrid((g) => {
            const updated = g.map((r) => r.map((c) => ({ ...c })));
            updated[row][col].justPlaced = false;
            return updated;
          });
        }, 400);

        return newGrid;
      });

      setPalette((prev) => paletteGenerator.markAsUsed(prev, paletteItemId));
      setIsDragging(false);
      setDragColor(null);
    },
    [palette]
  );

  const handleCellClear = useCallback(
    (row: number, col: number) => {
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => r.map((c) => ({ ...c })));
        const clearedColor = newGrid[row][col].color;
        newGrid[row][col].color = null;

        if (clearedColor) {
          const paletteItem = palette.find(
            (p) =>
              p.isUsed &&
              p.color.r === clearedColor.r &&
              p.color.g === clearedColor.g &&
              p.color.b === clearedColor.b
          );
          if (paletteItem) {
            setPalette((prev) =>
              paletteGenerator.markAsUnused(prev, paletteItem.id)
            );
          }
        }

        return newGrid;
      });
    },
    [palette]
  );

  const handleCellDragOver = useCallback((_row: number, _col: number) => {}, []);

  const handlePaletteItemDragStart = useCallback(
    (e: React.DragEvent, item: PaletteItem) => {
      if (item.isUsed) return;

      e.dataTransfer.setData('application/json', JSON.stringify(item.color));
      e.dataTransfer.setData('text/palette-id', item.id);
      e.dataTransfer.effectAllowed = 'copy';

      setPalette((prev) =>
        paletteGenerator.setDragging(prev, item.id, true)
      );
      setIsDragging(true);
      setDragColor(item.color);

      const updatePosition = (clientX: number, clientY: number) => {
        requestAnimationFrame(() => {
          setDragPosition({ x: clientX, y: clientY });
        });
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        updatePosition(moveEvent.clientX, moveEvent.clientY);
      };

      const handleDragEnd = () => {
        setPalette((prev) =>
          paletteGenerator.setDragging(prev, item.id, false)
        );
        setIsDragging(false);
        setDragColor(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('dragend', handleDragEnd);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('dragend', handleDragEnd);

      updatePosition(e.clientX, e.clientY);
    },
    []
  );

  const handleHint = useCallback(() => {
    if (hintsRemaining <= 0) return;

    const userGrid: (RGB | null)[][] = grid.map((row) =>
      row.map((cell) => cell.color)
    );
    const differences = colorEngine.calculateCellDifferences(
      userGrid,
      targetPattern
    );
    const worstCells = colorEngine.findWorstMatchingCells(differences, 5);

    const highlighted: string[] = [];
    const hints = new Map<string, RGB>();

    worstCells.forEach(([row, col]) => {
      const cell = grid[row][col];
      highlighted.push(cell.id);
      hints.set(cell.id, targetPattern[row][col]);
    });

    setHighlightedCells(highlighted);
    setHintCells(hints);
    setHintsRemaining((prev) => prev - 1);

    setTimeout(() => {
      setHighlightedCells([]);
      setHintCells(new Map());
    }, 5000);
  }, [grid, targetPattern, hintsRemaining]);

  const handleRestart = useCallback(() => {
    initializeGame(level);
  }, [level, initializeGame]);

  const handleNextLevel = useCallback(() => {
    if (currentLevel < LEVELS.length - 1) {
      setCurrentLevel((prev) => prev + 1);
    }
  }, [currentLevel]);

  const handleSelectLevel = useCallback((levelIndex: number) => {
    setCurrentLevel(levelIndex);
  }, []);

  const getProgressBarColor = () => {
    const startColor = { r: 255, g: 69, b: 0 };
    const endColor = { r: 34, g: 139, b: 34 };
    return rgbToString(lerpRgb(startColor, endColor, matchPercentage / 100));
  };

  const isGlowing = matchPercentage >= SUCCESS_THRESHOLD && isComplete;

  return (
    <div className="game-container">
      <header className="game-header">
        <div className="header-left">
          <button className="btn btn-secondary" onClick={onBack}>
            ← 返回
          </button>
          <div className="level-selector">
            {LEVELS.map((l, idx) => (
              <button
                key={l.id}
                className={`level-btn ${idx === currentLevel ? 'active' : ''}`}
                onClick={() => handleSelectLevel(idx)}
              >
                关卡 {l.id}
              </button>
            ))}
          </div>
        </div>
        <div className="header-center">
          <h1 className="game-title">颜色迷宫</h1>
          <span className="level-name">{level.name}</span>
        </div>
        <div className="header-right">
          <div className="timer">
            <span className="timer-label">用时</span>
            <span className="timer-value">{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </header>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{
            width: `${matchPercentage}%`,
            backgroundColor: getProgressBarColor(),
          }}
        />
        <span className="progress-text">{matchPercentage}% 匹配</span>
      </div>

      <div className="game-content">
        <div className={`game-board ${isGlowing ? 'glowing' : ''}`}>
          <ColorGrid
            cells={grid}
            onCellDrop={handleCellDrop}
            onCellDragOver={handleCellDragOver}
            onCellClear={handleCellClear}
            highlightedCells={highlightedCells}
            hintCells={hintCells}
          />
        </div>

        <div className="palette-panel">
          <div className="palette-header">
            <h3>色板</h3>
            <span className="palette-count">
              {palette.filter((p) => !p.isUsed).length} / {palette.length} 可用
            </span>
          </div>

          <div className="palette-grid">
            {palette.map((item) => (
              <div
                key={item.id}
                className={`palette-item ${item.isUsed ? 'used' : ''} ${
                  item.isDragging ? 'dragging' : ''
                }`}
                style={{
                  backgroundColor: rgbToString(item.color),
                }}
                draggable={!item.isUsed}
                onDragStart={(e) => handlePaletteItemDragStart(e, item)}
                title={item.isUsed ? '已使用' : '拖拽到网格'}
              />
            ))}
          </div>

          <div className="controls">
            <button
              className="btn btn-primary"
              onClick={handleHint}
              disabled={hintsRemaining <= 0}
            >
              提示 ({hintsRemaining}/{MAX_HINTS})
            </button>
            <button className="btn btn-secondary" onClick={handleRestart}>
              重新开始
            </button>
          </div>
        </div>
      </div>

      {isDragging && dragColor && (
        <div
          className="drag-preview"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            backgroundColor: rgbToString(dragColor),
          }}
        />
      )}

      {showResult && (
        <div className="result-modal-overlay">
          <div className={`result-modal ${isSuccess ? 'success' : 'fail'}`}>
            <div className="result-content">
              {isSuccess ? (
                <>
                  <div className="result-badge">
                    {matchPercentage === 100 ? '🏆 完美！' : '🎉 成功！'}
                  </div>
                  <h2>恭喜完成关卡 {level.id}</h2>
                </>
              ) : (
                <>
                  <div className="result-badge">😔 再试一次</div>
                  <h2>匹配度低于 {FAIL_THRESHOLD}%</h2>
                </>
              )}

              <div className="result-stats">
                <div className="stat-item">
                  <span className="stat-label">匹配度</span>
                  <span className="stat-value">{matchPercentage}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">用时</span>
                  <span className="stat-value">{formatTime(elapsedTime)}</span>
                </div>
              </div>

              {matchPercentage === 100 && (
                <div className="achievement">
                  <span className="achievement-icon">🎖️</span>
                  <span className="achievement-text">完美主义者成就已解锁！</span>
                </div>
              )}

              <div className="result-actions">
                <button className="btn btn-secondary" onClick={handleRestart}>
                  再玩一次
                </button>
                {isSuccess && currentLevel < LEVELS.length - 1 && (
                  <button className="btn btn-primary" onClick={handleNextLevel}>
                    下一关 →
                  </button>
                )}
                {!isSuccess && (
                  <button className="btn btn-primary" onClick={handleRestart}>
                    重试
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
