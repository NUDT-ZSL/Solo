import { useState, useEffect } from 'react';
import type { Puzzle } from '../../types';

interface PuzzleModalProps {
  puzzle: Puzzle;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answer: string) => void;
  result: 'idle' | 'success' | 'error';
}

function PuzzleModal({ puzzle, itemName, isOpen, onClose, onSubmit, result }: PuzzleModalProps) {
  const [answer, setAnswer] = useState('');
  const [textPieces, setTextPieces] = useState<string[]>([]);
  const [arrangedText, setArrangedText] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [imagePieces, setImagePieces] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAnswer('');
      setArrangedText([]);
      setIsShaking(false);
      setIsClosing(false);
      
      if (puzzle.type === 'text' && puzzle.scrambledText) {
        const pieces = puzzle.scrambledText.split('');
        for (let i = pieces.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        setTextPieces(pieces);
      }
      
      if (puzzle.type === 'image') {
        const pieces = Array.from({ length: 9 }, (_, i) => i);
        for (let i = pieces.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        setImagePieces(pieces);
      }
    }
  }, [isOpen, puzzle]);

  useEffect(() => {
    if (result === 'error') {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }
  }, [result]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (puzzle.type === 'text') {
      onSubmit(arrangedText.join(''));
    } else if (puzzle.type === 'image') {
      const isCorrect = imagePieces.every((v, i) => v === i);
      onSubmit(isCorrect ? puzzle.answer : 'wrong');
    } else {
      onSubmit(answer);
    }
  };

  const handleTextPieceClick = (piece: string, index: number) => {
    if (arrangedText.length < textPieces.length) {
      setArrangedText([...arrangedText, piece]);
      setTextPieces(textPieces.filter((_, i) => i !== index));
    }
  };

  const handleArrangedClick = (index: number) => {
    const piece = arrangedText[index];
    setArrangedText(arrangedText.filter((_, i) => i !== index));
    setTextPieces([...textPieces, piece]);
  };

  const handleImageSwap = (index1: number, index2: number) => {
    const newPieces = [...imagePieces];
    [newPieces[index1], newPieces[index2]] = [newPieces[index2], newPieces[index1]];
    setImagePieces(newPieces);
  };

  const [selectedImagePiece, setSelectedImagePiece] = useState<number | null>(null);

  const handleImagePieceClick = (index: number) => {
    if (selectedImagePiece === null) {
      setSelectedImagePiece(index);
    } else {
      handleImageSwap(selectedImagePiece, index);
      setSelectedImagePiece(null);
    }
  };

  const renderNumberPuzzle = () => (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
        {puzzle.question}
      </p>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="输入密码..."
        autoFocus
        style={{
          width: '100%',
          padding: '14px',
          fontSize: '24px',
          textAlign: 'center',
          backgroundColor: '#0f172a',
          border: '2px solid #475569',
          borderRadius: '8px',
          color: '#f97316',
          letterSpacing: '8px',
          fontFamily: 'monospace',
          fontWeight: 'bold'
        }}
      />
      {puzzle.hint && (
        <p style={{ color: '#64748b', marginTop: '12px', fontSize: '13px' }}>
          提示：{puzzle.hint}
        </p>
      )}
    </div>
  );

  const renderTextPuzzle = () => (
    <div>
      <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
        {puzzle.question}
      </p>
      <div style={{
        minHeight: '60px',
        padding: '12px',
        backgroundColor: '#0f172a',
        border: '2px dashed #475569',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {arrangedText.length === 0 ? (
          <span style={{ color: '#64748b' }}>点击下方字符进行排列</span>
        ) : (
          arrangedText.map((piece, i) => (
            <div
              key={i}
              onClick={() => handleArrangedClick(i)}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f97316',
                color: 'white',
                borderRadius: '6px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.15s'
              }}
            >
              {piece}
            </div>
          ))
        )}
      </div>
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {textPieces.map((piece, i) => (
          <div
            key={i}
            onClick={() => handleTextPieceClick(piece, i)}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#334155',
              color: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#475569';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#334155';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {piece}
          </div>
        ))}
      </div>
    </div>
  );

  const renderImagePuzzle = () => (
    <div>
      <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
        {puzzle.question}
      </p>
      <p style={{ color: '#64748b', marginBottom: '12px', fontSize: '12px', textAlign: 'center' }}>
        点击两个方块交换位置，按顺序排列
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        width: '240px',
        margin: '0 auto',
        padding: '8px',
        backgroundColor: '#0f172a',
        borderRadius: '8px'
      }}>
        {imagePieces.map((pieceIndex, i) => (
          <div
            key={i}
            onClick={() => handleImagePieceClick(i)}
            style={{
              width: '72px',
              height: '72px',
              backgroundColor: selectedImagePiece === i ? '#f97316' : `hsl(${pieceIndex * 40}, 70%, 50%)`,
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white',
              transition: 'all 0.2s',
              border: selectedImagePiece === i ? '2px solid #fff' : '2px solid transparent'
            }}
          >
            {pieceIndex + 1}
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOpen && !isClosing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: isClosing ? 'blur(0px)' : 'blur(4px)',
        backgroundColor: isClosing ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.6)',
        transition: 'all 0.2s ease-out',
        animation: isClosing ? undefined : 'fadeIn 0.2s ease-out'
      }}
      onClick={handleClose}
    >
      <div
        className={isShaking ? 'shake' : ''}
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '420px',
          width: '90%',
          border: '1px solid #334155',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          transform: isClosing ? 'scale(0.8)' : 'scale(1)',
          opacity: isClosing ? 0 : 1,
          transition: 'all 0.2s ease-out',
          animation: isClosing ? undefined : 'scaleIn 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#f1f5f9', fontSize: '18px' }}>
            🔒 {itemName}
          </h3>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {puzzle.type === 'number' && renderNumberPuzzle()}
          {puzzle.type === 'text' && renderTextPuzzle()}
          {puzzle.type === 'image' && renderImagePuzzle()}

          {result === 'error' && (
            <div style={{
              marginTop: '16px',
              padding: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#fca5a5',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              ❌ 答案错误，再试试看！
            </div>
          )}

          {result === 'success' && (
            <div style={{
              marginTop: '16px',
              padding: '10px',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid #22c55e',
              borderRadius: '6px',
              color: '#86efac',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              ✅ 解谜成功！
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '20px',
              backgroundColor: result === 'success' ? '#22c55e' : '#f97316',
              color: 'white',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {result === 'success' ? '✓ 完成' : '提交答案'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PuzzleModal;
