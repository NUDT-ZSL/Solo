import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp, PoemFragment } from './App';

const GRID_ROWS = 6;
const GRID_COLS = 6;
const CELL_SIZE = 90;

type CellState = {
  row: number;
  col: number;
  fragmentId: string | null;
  highlighted: boolean;
};

type Props = {
  onPoemComplete: (lines: string[], fragments: PoemFragment[]) => void;
  onLineComplete: (line: string) => void;
};

export default function PuzzleBoard({ onPoemComplete, onLineComplete }: Props) {
  const { collectedFragments } = useApp();
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  
  const [cells, setCells] = useState<CellState[][]>(() => {
    const grid: CellState[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: CellState[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        row.push({ row: r, col: c, fragmentId: null, highlighted: false });
      }
      grid.push(row);
    }
    return grid;
  });
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [completedLines, setCompletedLines] = useState<Set<string>>(new Set());
  const [completedRowSets, setCompletedRowSets] = useState<Set<number>>(new Set());
  const [completedColSets, setCompletedColSets] = useState<Set<number>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayRef = useRef(0);
  const [fragmentsState, setFragmentsState] = useState<PoemFragment[]>([]);

  useEffect(() => {
    setFragmentsState(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const newOnes = collectedFragments.filter(f => !existingIds.has(f.id));
      if (newOnes.length === 0) return prev;
      return [...prev, ...newOnes];
    });
  }, [collectedFragments]);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playRisingScale = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayRef.current < 500) return;
    lastPlayRef.current = now;
    
    try {
      const ctx = getAudioCtx();
      const notes = [261.63, 293.66, 329.63, 392, 440, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.3);
      });
    } catch (e) {}
  }, [getAudioCtx]);

  const playClick = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }, [getAudioCtx]);

  const getFragmentById = useCallback((id: string): PoemFragment | undefined => {
    return fragmentsState.find(f => f.id === id);
  }, [fragmentsState]);

  const getFragmentPosition = useCallback((fragmentId: string): { row: number; col: number } | null => {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (cells[r][c].fragmentId === fragmentId) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, [cells]);

  const validateLine = useCallback(async (fragments: PoemFragment[]): Promise<{ valid: boolean; line: string; score: number }> => {
    try {
      const res = await fetch('/api/validate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fragments })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('验证请求失败，使用本地规则');
    }
    
    const line = fragments.map(f => f.text).join('');
    const subjects = ['月光', '清风', '青山', '绿水', '孤帆', '桃花', '小桥', '古道', '长河', '大漠', '黄鹂', '白鹭', '春眠', '明月', '红豆', '春风', '飞流', '日照', '朝辞', '葡萄', '秦时'];
    const verbs = ['洒落', '拂过', '横斜', '浮动', '不老', '长流', '远影', '如洗', '流水', '三月', '烟雨', '依依', '人家', '西风', '落日', '孤烟', '入海', '依山', '鸟飞', '人踪'];
    const objects = ['碧空', '江南', '天涯', '夕阳', '银河', '白帝', '夜光', '琵琶', '故乡', '相思', '衣裳', '瑶台', '香炉', '瀑布', '江陵', '猿声', '万山', '美酒', '胡马', '东吴'];
    
    const chars = line.replace(/\s/g, '');
    let hasSubj = subjects.some(s => line.includes(s));
    let hasVerb = verbs.some(v => line.includes(v));
    let hasObj = objects.some(o => line.includes(o));
    const lenOk = chars.length >= 5 && chars.length <= 7;
    const structOk = (hasSubj ? 1 : 0) + (hasVerb ? 1 : 0) + (hasObj ? 1 : 0) >= 2;
    
    return { valid: lenOk && structOk, line, score: structOk ? 70 : 30 };
  }, []);

  const checkRow = useCallback(async (row: number) => {
    const rowCells = cells[row];
    const startCol = rowCells.findIndex(c => c.fragmentId !== null);
    if (startCol === -1) return;
    
    let endCol = startCol;
    while (endCol < GRID_COLS && rowCells[endCol].fragmentId !== null) {
      endCol++;
    }
    endCol--;
    
    if (endCol - startCol < 1) return;
    
    const frags: PoemFragment[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const frag = getFragmentById(rowCells[c].fragmentId!);
      if (frag) frags.push(frag);
    }
    
    const result = await validateLine(frags);
    if (result.valid) {
      const lineKey = `r${row}-${startCol}-${endCol}`;
      if (!completedLines.has(lineKey)) {
        setCompletedLines(prev => new Set([...prev, lineKey]));
        setCompletedRowSets(prev => new Set([...prev, row]));
        playRisingScale();
        onLineComplete(result.line);
        
        setCells(prev => {
          const newCells = prev.map(r => r.map(c => ({ ...c })));
          for (let c = startCol; c <= endCol; c++) {
            newCells[row][c].highlighted = true;
          }
          return newCells;
        });
      }
    }
  }, [cells, getFragmentById, validateLine, completedLines, playRisingScale, onLineComplete]);

  const checkCol = useCallback(async (col: number) => {
    const colCells = cells.map(row => row[col]);
    const startRow = colCells.findIndex(c => c.fragmentId !== null);
    if (startRow === -1) return;
    
    let endRow = startRow;
    while (endRow < GRID_ROWS && colCells[endRow].fragmentId !== null) {
      endRow++;
    }
    endRow--;
    
    if (endRow - startRow < 1) return;
    
    const frags: PoemFragment[] = [];
    for (let r = startRow; r <= endRow; r++) {
      const frag = getFragmentById(colCells[r].fragmentId!);
      if (frag) frags.push(frag);
    }
    
    const result = await validateLine(frags);
    if (result.valid) {
      const lineKey = `c${col}-${startRow}-${endRow}`;
      if (!completedLines.has(lineKey)) {
        setCompletedLines(prev => new Set([...prev, lineKey]));
        setCompletedColSets(prev => new Set([...prev, col]));
        playRisingScale();
        onLineComplete(result.line);
        
        setCells(prev => {
          const newCells = prev.map(r => r.map(c => ({ ...c })));
          for (let r = startRow; r <= endRow; r++) {
            newCells[r][col].highlighted = true;
          }
          return newCells;
        });
      }
    }
  }, [cells, getFragmentById, validateLine, completedLines, playRisingScale, onLineComplete]);

  useEffect(() => {
    const checkAll = async () => {
      for (let r = 0; r < GRID_ROWS; r++) {
        await checkRow(r);
      }
      for (let c = 0; c < GRID_COLS; c++) {
        await checkCol(c);
      }
    };
    checkAll();
  }, [cells]);

  useEffect(() => {
    const lineCount = completedLines.size;
    if (lineCount >= 4) {
      const linesMap = new Map<string, { frags: PoemFragment[]; rowOrCol: string }>();
      
      for (let r = 0; r < GRID_ROWS; r++) {
        if (!completedRowSets.has(r)) continue;
        const rowCells = cells[r];
        let frags: PoemFragment[] = [];
        for (let c = 0; c < GRID_COLS; c++) {
          if (rowCells[c].fragmentId) {
            const frag = getFragmentById(rowCells[c].fragmentId!);
            if (frag) frags.push(frag);
          } else if (frags.length > 0) {
            if (frags.length >= 2) {
              const line = frags.map(f => f.text).join('');
              linesMap.set(line, { frags: [...frags], rowOrCol: `r${r}` });
            }
            frags = [];
          }
        }
        if (frags.length >= 2) {
          const line = frags.map(f => f.text).join('');
          linesMap.set(line, { frags: [...frags], rowOrCol: `r${r}` });
        }
      }
      
      for (let c = 0; c < GRID_COLS; c++) {
        if (!completedColSets.has(c)) continue;
        let frags: PoemFragment[] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
          if (cells[r][c].fragmentId) {
            const frag = getFragmentById(cells[r][c].fragmentId!);
            if (frag) frags.push(frag);
          } else if (frags.length > 0) {
            if (frags.length >= 2) {
              const line = frags.map(f => f.text).join('');
              if (!linesMap.has(line)) {
                linesMap.set(line, { frags: [...frags], rowOrCol: `c${c}` });
              }
            }
            frags = [];
          }
        }
        if (frags.length >= 2) {
          const line = frags.map(f => f.text).join('');
          if (!linesMap.has(line)) {
            linesMap.set(line, { frags: [...frags], rowOrCol: `c${c}` });
          }
        }
      }
      
      const lines = Array.from(linesMap.keys()).filter(l => {
        const len = l.replace(/\s/g, '').length;
        return len >= 5 && len <= 7;
      });
      
      const allFrags: PoemFragment[] = [];
      for (const val of linesMap.values()) {
        allFrags.push(...val.frags);
      }
      
      if (lines.length >= 4) {
        const uniqueFrags = Array.from(new Map(allFrags.map(f => [f.id, f])).values());
        onPoemComplete(lines.slice(0, 8), uniqueFrags);
      }
    }
  }, [completedLines, completedRowSets, completedColSets, cells, getFragmentById, onPoemComplete]);

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent, fragmentId: string) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let fragEl: HTMLElement | null = null;
    let foundFrag = null;
    
    for (const frag of fragmentsState) {
      if (frag.id === fragmentId) {
        foundFrag = frag;
        break;
      }
    }
    
    const boardRect = boardRef.current?.getBoundingClientRect();
    const pos = getFragmentPosition(fragmentId);
    
    if (pos && boardRect) {
      fragEl = {
        getBoundingClientRect: () => ({
          left: boardRect.left + 20 + pos.col * CELL_SIZE,
          top: boardRect.top + 20 + pos.row * CELL_SIZE,
          width: CELL_SIZE - 8,
          height: CELL_SIZE - 8
        })
      } as any;
    }
    
    if (!fragEl) {
      const trayRect = trayRef.current?.getBoundingClientRect();
      if (trayRect) {
        fragEl = {
          getBoundingClientRect: () => ({
            left: trayRect.left + 10,
            top: trayRect.top + 10,
            width: 74,
            height: 74
          })
        } as any;
      }
    }
    
    if (fragEl) {
      const rect = (fragEl as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
    
    setDragPos({ x: clientX, y: clientY });
    setDraggingId(fragmentId);
    playClick();
  }, [fragmentsState, getFragmentPosition, playClick]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingId) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPos({ x: clientX, y: clientY });
  }, [draggingId]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingId) return;
    
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
    
    const boardRect = boardRef.current?.getBoundingClientRect();
    
    if (boardRect) {
      const relX = clientX - boardRect.left - 20;
      const relY = clientY - boardRect.top - 20;
      
      const col = Math.floor(relX / CELL_SIZE);
      const row = Math.floor(relY / CELL_SIZE);
      
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const pos = getFragmentPosition(draggingId);
        
        setCells(prev => {
          const newCells = prev.map(r => r.map(c => ({ ...c })));
          
          if (pos) {
            newCells[pos.row][pos.col].fragmentId = null;
          }
          
          const targetCell = newCells[row][col];
          if (targetCell.fragmentId && targetCell.fragmentId !== draggingId) {
            const oldPos = pos;
            if (oldPos) {
              newCells[oldPos.row][oldPos.col].fragmentId = targetCell.fragmentId;
            }
          }
          newCells[row][col].fragmentId = draggingId;
          newCells[row][col].highlighted = false;
          
          return newCells;
        });
        playClick();
      } else {
        const pos = getFragmentPosition(draggingId);
        if (pos) {
          setCells(prev => {
            const newCells = prev.map(r => r.map(c => ({ ...c })));
            newCells[pos.row][pos.col].fragmentId = null;
            return newCells;
          });
        }
      }
    }
    
    setDraggingId(null);
  }, [draggingId, getFragmentPosition, playClick]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const handleEnd = (e: MouseEvent | TouchEvent) => handleDragEnd(e);
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  const trayFragments = useMemo(() => {
    const placedIds = new Set<string>();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (cells[r][c].fragmentId) {
          placedIds.add(cells[r][c].fragmentId!);
        }
      }
    }
    return fragmentsState.filter(f => !placedIds.has(f.id) && f.id !== draggingId);
  }, [fragmentsState, cells, draggingId]);

  const renderFragmentCard = (frag: PoemFragment, options?: { inBoard?: boolean }) => {
    const isDragging = draggingId === frag.id;
    
    return (
      <div
        key={frag.id}
        onMouseDown={(e) => startDrag(e, frag.id)}
        onTouchStart={(e) => startDrag(e, frag.id)}
        style={{
          width: options?.inBoard ? '100%' : '74px',
          height: options?.inBoard ? '100%' : '74px',
          position: options?.inBoard ? 'relative' : (isDragging ? 'fixed' : 'relative'),
          zIndex: isDragging ? 1000 : 1,
          cursor: 'grab',
          transition: isDragging ? 'none' : 'all 0.3s ease-out',
          transform: isDragging 
            ? `translate(${dragPos.x - dragOffset.x - (options?.inBoard ? 0 : 0)}px, ${dragPos.y - dragOffset.y - (options?.inBoard ? 0 : 0)}px) scale(1.1)` 
            : 'scale(1)',
          pointerEvents: isDragging ? 'none' : 'auto',
          borderRadius: '8px',
          padding: '4px',
          ...(options?.inBoard ? {} : { flexShrink: 0 })
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            left: '-8px',
            right: '-8px',
            bottom: '-8px',
            borderRadius: '12px',
            background: `radial-gradient(circle, hsla(${frag.hue}, 80%, 70%, 0.4) 0%, transparent 70%)`,
            filter: 'blur(6px)',
            zIndex: -1,
            transition: 'all 0.3s ease-out'
          }}
        />
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            background: `
              linear-gradient(135deg, 
                hsla(${frag.hue}, 60%, 28%, 0.95) 0%, 
                hsla(${frag.hue}, 50%, 22%, 0.95) 50%,
                hsla(${frag.hue}, 65%, 32%, 0.95) 100%
              )
            `,
            border: `1px solid hsla(${frag.hue}, 75%, 65%, 0.7)`,
            display: 'flex',
            flexDirection: frag.text.length <= 2 ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `
              inset 0 1px 0 hsla(${frag.hue}, 80%, 80%, 0.25),
              0 0 15px hsla(${frag.hue}, 70%, 55%, 0.35),
              0 2px 8px rgba(0, 0, 0, 0.3)
            `,
            transition: 'all 0.3s ease-out',
            backdropFilter: 'blur(4px)'
          }}
        >
          <span
            style={{
              fontSize: frag.text.length <= 2 ? '18px' : '14px',
              fontWeight: 500,
              color: `hsl(${frag.hue}, 85%, 92%)`,
              textShadow: `0 0 8px hsla(${frag.hue}, 80%, 70%, 0.7)`,
              letterSpacing: frag.text.length <= 2 ? '3px' : '1px',
              lineHeight: 1.25,
              textAlign: 'center',
              writingMode: frag.text.length <= 2 ? 'vertical-rl' : 'horizontal-tb',
              textOrientation: 'upright'
            }}
          >
            {frag.text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '12px 20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'stretch',
        background: 'linear-gradient(0deg, hsla(210, 40%, 8%, 0.98), hsla(210, 35%, 15%, 0.95))',
        borderTop: '2px solid hsla(45, 60%, 55%, 0.6)',
        boxShadow: '0 -4px 40px hsla(45, 60%, 45%, 0.2), inset 0 2px 20px hsla(45, 50%, 40%, 0.1)'
      }}
    >
      <div
        ref={boardRef}
        style={{
          flex: 1,
          maxWidth: `${GRID_COLS * CELL_SIZE + 40}px`,
          padding: '20px',
          background: 'linear-gradient(135deg, hsla(210, 30%, 22%, 0.7), hsla(210, 25%, 18%, 0.7))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid hsla(45, 50%, 55%, 0.3)',
          boxShadow: 'inset 0 0 40px hsla(45, 50%, 40%, 0.08)',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: 'hsla(45, 50%, 70%, 0.6)',
            letterSpacing: '3px'
          }}
        >
          拼 · 诗 · 板 · 已成 {completedLines.size}/4 句
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`,
            gap: 0
          }}
        >
          {cells.flat().map((cell) => {
            const isRowHighlighted = completedRowSets.has(cell.row);
            const isColHighlighted = completedColSets.has(cell.col);
            const hasGoldBorder = cell.highlighted;
            
            return (
              <div
                key={`${cell.row}-${cell.col}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  padding: '4px',
                  border: `0.5px solid hsla(45, 80%, 80%, ${hasGoldBorder ? 0.9 : 0.25})`,
                  position: 'relative',
                  transition: 'all 0.3s ease-out',
                  background: hasGoldBorder 
                    ? 'linear-gradient(135deg, hsla(45, 80%, 70%, 0.15), hsla(45, 60%, 50%, 0.1))' 
                    : 'transparent',
                  boxShadow: hasGoldBorder 
                    ? 'inset 0 0 20px hsla(45, 80%, 60%, 0.3), 0 0 12px hsla(45, 80%, 60%, 0.15)' 
                    : 'none'
                }}
              >
                {(cell.row === 0 || isColHighlighted) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '1px',
                      background: `linear-gradient(90deg, transparent, hsla(45, 80%, ${isColHighlighted ? 80 : 70}%, ${isColHighlighted ? 0.9 : 0.35}), transparent)`,
                      boxShadow: isColHighlighted ? '0 0 8px hsla(45, 80%, 70%, 0.6)' : 'none'
                    }}
                  />
                )}
                {(cell.col === 0 || isRowHighlighted) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: '1px',
                      background: `linear-gradient(180deg, transparent, hsla(45, 80%, ${isRowHighlighted ? 80 : 70}%, ${isRowHighlighted ? 0.9 : 0.35}), transparent)`,
                      boxShadow: isRowHighlighted ? '0 0 8px hsla(45, 80%, 70%, 0.6)' : 'none'
                    }}
                  />
                )}
                {cell.fragmentId && (() => {
                  const frag = getFragmentById(cell.fragmentId);
                  return frag ? renderFragmentCard(frag, { inBoard: true }) : null;
                })()}
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={trayRef}
        style={{
          width: '300px',
          minWidth: '260px',
          padding: '20px 12px',
          background: 'linear-gradient(135deg, hsla(210, 30%, 20%, 0.7), hsla(210, 25%, 15%, 0.7))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid hsla(45, 50%, 55%, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'hsla(45, 50%, 70%, 0.6)',
            letterSpacing: '3px',
            paddingBottom: '8px',
            borderBottom: '1px solid hsla(45, 50%, 55%, 0.2)'
          }}
        >
          碎 · 片 · 托 · 盘
        </div>
        <div
          style={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            gap: '8px',
            padding: '4px'
          }}
        >
          {trayFragments.length === 0 ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: 'hsla(45, 40%, 60%, 0.35)',
                letterSpacing: '2px'
              }}
            >
              在回廊中收集碎片
            </div>
          ) : (
            trayFragments.map(frag => renderFragmentCard(frag))
          )}
        </div>
        <div
          style={{
            padding: '8px',
            fontSize: '11px',
            color: 'hsla(45, 40%, 65%, 0.5)',
            textAlign: 'center',
            borderTop: '1px solid hsla(45, 50%, 55%, 0.15)',
            letterSpacing: '1px'
          }}
        >
          拖拽碎片到网格 · 连成诗句
        </div>
      </div>

      {draggingId && (() => {
        const frag = getFragmentById(draggingId);
        if (!frag) return null;
        return (
          <div
            style={{
              position: 'fixed',
              left: dragPos.x - dragOffset.x,
              top: dragPos.y - dragOffset.y,
              width: '74px',
              height: '74px',
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'scale(1.1)',
              transition: 'none'
            }}
          >
            {renderFragmentCard(frag)}
          </div>
        );
      })()}
    </div>
  );
}
