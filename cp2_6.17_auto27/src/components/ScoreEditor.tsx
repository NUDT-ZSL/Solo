import React, { useEffect, useRef, useState } from 'react';
import { Notation, ScoreNote } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ScoreEditorProps {
  notes: ScoreNote[];
  setNotes: React.Dispatch<React.SetStateAction<ScoreNote[]>>;
  onDropNotation: (notation: Notation, bar: number, position: number) => void;
  isPlaying: boolean;
  currentPlayingId: string | null;
  onNoteClick: (noteId: string) => void;
  selectedNoteId: string | null;
  title: string;
  onTitleChange: (title: string) => void;
}

const TOTAL_BARS = 8;
const NOTES_PER_BAR = 4;
const BAR_WIDTH = 140;
const STAFF_HEIGHT = 160;
const NOTE_SPACING = BAR_WIDTH / NOTES_PER_BAR;

const ScoreEditor: React.FC<ScoreEditorProps> = ({
  notes,
  onDropNotation,
  isPlaying,
  currentPlayingId,
  onNoteClick,
  selectedNoteId,
  title,
  onTitleChange
}) => {
  const staffRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverBar, setDragOverBar] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<number | null>(null);
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = staffRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const totalWidth = TOTAL_BARS * BAR_WIDTH + 80;
    const totalHeight = STAFF_HEIGHT;
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, totalWidth, totalHeight);

    const leftPadding = 60;
    const staffTop = 50;
    const staffBottom = 110;
    const lineSpacing = (staffBottom - staffTop) / 4;

    ctx.strokeStyle = '#a0896b';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const y = staffTop + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(totalWidth - 20, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#5c4033';
    ctx.fillRect(leftPadding - 10, staffTop - 5, 4, staffBottom - staffTop + 10);

    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1.5;
    for (let bar = 0; bar <= TOTAL_BARS; bar++) {
      const x = leftPadding + bar * BAR_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, staffTop - 5);
      ctx.lineTo(x, staffBottom + 5);
      ctx.stroke();

      if (bar > 0 && bar % 4 === 0) {
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(x - 6, staffTop - 5, 3, staffBottom - staffTop + 10);
      }
    }

    const barLabelPositions = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
    for (let i = 0; i < 10; i++) {
      const y = staffTop + i * (lineSpacing / 2);
      ctx.fillStyle = '#8b5a2b';
      ctx.font = '11px "ZCOOL XiaoWei", serif';
      ctx.textAlign = 'right';
      if ([0, 2, 4, 6, 8, 9].includes(i)) {
        const labels = ['七', '六', '五', '四', '三', '二'];
        const idx = [0, 2, 4, 6, 8, 9].indexOf(i);
        ctx.fillText(labels[idx], leftPadding - 15, y + 4);
      }
    }

    ctx.fillStyle = '#5c4033';
    ctx.font = 'bold 14px "Ma Shan Zheng", serif';
    ctx.textAlign = 'left';
    for (let bar = 1; bar <= TOTAL_BARS; bar++) {
      if (bar % 4 === 1) {
        const x = leftPadding + (bar - 1) * BAR_WIDTH + 8;
        ctx.fillText(`第${Math.ceil(bar / 4)}段`, x, staffTop - 12);
      }
    }

  }, [notes, dragOverBar, dragOverPos]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;

    if (x < 0 || x > TOTAL_BARS * BAR_WIDTH) {
      setDragOverBar(null);
      setDragOverPos(null);
      return;
    }

    const bar = Math.min(Math.floor(x / BAR_WIDTH), TOTAL_BARS - 1);
    const posInBar = x - bar * BAR_WIDTH;
    const position = Math.min(Math.floor(posInBar / NOTE_SPACING), NOTES_PER_BAR - 1);

    setDragOverBar(bar);
    setDragOverPos(position);
  };

  const handleDragLeave = () => {
    setDragOverBar(null);
    setDragOverPos(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data || dragOverBar === null || dragOverPos === null) {
      setDragOverBar(null);
      setDragOverPos(null);
      return;
    }

    try {
      const notation: Notation = JSON.parse(data);
      const newNoteId = uuidv4();
      setJustPlacedId(newNoteId);
      setTimeout(() => setJustPlacedId(null), 200);
      onDropNotation(notation, dragOverBar, dragOverPos);
    } catch (err) {
      console.error('Drop parse error:', err);
    }

    setDragOverBar(null);
    setDragOverPos(null);
  };

  const getNoteDisplayPosition = (bar: number, position: number) => {
    const leftPadding = 60;
    const x = leftPadding + bar * BAR_WIDTH + position * NOTE_SPACING + NOTE_SPACING / 2;
    const y = 55 + (Math.random() * 30);
    return { x, y };
  };

  const renderNote = (note: ScoreNote) => {
    const { x } = getNoteDisplayPosition(note.bar, note.position);

    const stringNum = note.notation.string;
    let y;
    const staffTop = 50;
    const lineSpacing = (110 - 50) / 4;
    const stringToLine: Record<number, number> = {
      1: 4.3, 2: 3.8, 3: 3.2, 4: 2.5, 5: 1.8, 6: 1.0, 7: 0.3
    };

    const firstDigit = Number(String(stringNum).charAt(0));
    const lineKey = stringToLine[firstDigit] ?? 2;
    y = staffTop + lineKey * lineSpacing;

    const isPlaying = currentPlayingId === note.id;
    const isSelected = selectedNoteId === note.id;
    const isJustPlaced = justPlacedId === note.id;

    return (
      <div
        key={note.id}
        onClick={(e) => {
          e.stopPropagation();
          onNoteClick(note.id);
        }}
        style={{
          position: 'absolute',
          left: `${x - 25}px`,
          top: `${y - 22}px`,
          width: '50px',
          height: '50px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transform: isJustPlaced ? 'scale(1.05)' : 'scale(1)',
          animation: isJustPlaced ? 'placeBounce 0.2s ease-out' : 'none',
          zIndex: isPlaying || isSelected ? 20 : 10
        }}
      >
        {isPlaying && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '60px',
              height: '60px',
              marginLeft: '-30px',
              marginTop: '-30px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(230,126,34,0.6) 0%, rgba(230,126,34,0) 70%)',
              animation: 'pulseGlow 0.6s ease-in-out infinite',
              zIndex: -1
            }}
          />
        )}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: isPlaying ? '8px' : '6px',
            background: isPlaying
              ? 'linear-gradient(135deg, #e67e22, #d35400)'
              : isSelected
              ? 'linear-gradient(135deg, #fff3e0, #ffe0b2)'
              : '#f5f0e8',
            border: `1.5px solid ${isPlaying ? '#e67e22' : isSelected ? '#e67e22' : '#d4c5a9'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPlaying
              ? '0 0 16px rgba(230,126,34,0.5)'
              : isSelected
              ? '0 2px 8px rgba(230,126,34,0.25)'
              : '0 1px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
            animation: isPlaying ? 'flicker 0.4s ease-in-out infinite alternate' : 'none'
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: isPlaying ? '#fff' : '#2c2a26',
              fontFamily: '"Ma Shan Zheng", serif',
              lineHeight: 1.1
            }}
          >
            {note.notation.upperChar}
          </div>
          <div
            style={{
              width: '20px',
              height: '1px',
              backgroundColor: isPlaying ? 'rgba(255,255,255,0.5)' : '#8b5a2b',
              margin: '1px 0'
            }}
          />
          <div
            style={{
              fontSize: '11px',
              color: isPlaying ? '#fff' : '#5c4033',
              fontFamily: '"Ma Shan Zheng", serif',
              lineHeight: 1.1
            }}
          >
            {note.notation.lowerChar}
          </div>
        </div>
      </div>
    );
  };

  const renderDropIndicator = () => {
    if (dragOverBar === null || dragOverPos === null) return null;
    const { x } = getNoteDisplayPosition(dragOverBar, dragOverPos);
    return (
      <div
        style={{
          position: 'absolute',
          left: `${x - 24}px`,
          top: '42px',
          width: '48px',
          height: '66px',
          border: '2px dashed #e67e22',
          borderRadius: '8px',
          backgroundColor: 'rgba(230,126,34,0.08)',
          pointerEvents: 'none',
          zIndex: 5,
          animation: 'blink 0.6s ease-in-out infinite alternate'
        }}
      />
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#faf5ef',
        borderRadius: '14px',
        padding: '20px',
        border: '1px solid #e6dcd0',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          padding: '8px 0'
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入曲名..."
          style={{
            fontFamily: '"Ma Shan Zheng", "ZCOOL XiaoWei", serif',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#2c2a26',
            textAlign: 'center',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            borderBottom: '2px dashed transparent',
            padding: '4px 16px',
            transition: 'border-color 0.2s ease',
            minWidth: '300px',
            cursor: 'text'
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#d4a373'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
        />
      </div>

      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          backgroundColor: '#fffdf8',
          borderRadius: '10px',
          border: '1px solid #f0e6d8',
          padding: '10px',
          minHeight: '220px'
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            minWidth: '100%'
          }}
        >
          <canvas ref={staffRef} style={{ display: 'block' }} />
          {renderDropIndicator()}
          {notes.map(renderNote)}
        </div>
      </div>

      <style>
        {`
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          }
          @keyframes flicker {
            0% { box-shadow: 0 0 12px rgba(230,126,34,0.4); }
            100% { box-shadow: 0 0 20px rgba(230,126,34,0.7); }
          }
          @keyframes placeBounce {
            0% { transform: scale(0.8); }
            60% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes blink {
            0% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default ScoreEditor;
