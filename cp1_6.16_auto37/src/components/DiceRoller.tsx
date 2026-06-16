import React, { useState, useEffect } from 'react';
import { DiceResult } from '@/gameLogic';

interface DiceRollerProps {
  onRollComplete: (result: DiceResult) => void;
  isRolling: boolean;
  setIsRolling: (rolling: boolean) => void;
  disabled: boolean;
}

const Dice: React.FC<{
  value: number;
  isRolling: boolean;
  delay: number;
}> = ({ value, isRolling, delay }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 80);
      
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [isRolling, value]);

  const getDiceFace = (val: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ['center'],
      2: ['top-right', 'bottom-left'],
      3: ['top-right', 'center', 'bottom-left'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
    };
    
    const positions = dotPositions[val] || [];
    
    return (
      <div className="dice-face">
        {positions.map((pos, idx) => (
          <div key={idx} className={`dice-dot ${pos}`} />
        ))}
      </div>
    );
  };

  return (
    <div
      className={`dice ${isRolling ? 'rolling' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="dice-inner">
        {getDiceFace(displayValue)}
      </div>
    </div>
  );
};

const DiceRoller: React.FC<DiceRollerProps> = ({
  onRollComplete,
  isRolling,
  setIsRolling,
  disabled,
}) => {
  const [diceValues, setDiceValues] = useState<number[]>([1, 1, 1, 1, 1]);
  const [total, setTotal] = useState<number | null>(null);

  const handleRoll = () => {
    if (disabled || isRolling) return;

    setIsRolling(true);
    setTotal(null);

    const newDice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
    const diceTotal = newDice.reduce((sum, val) => sum + val, 0);

    setTimeout(() => {
      setDiceValues(newDice);
      setIsRolling(false);
      setTotal(diceTotal);
      onRollComplete({ dice: newDice, total: diceTotal });
    }, 1000);
  };

  return (
    <div className="dice-roller-container">
      <div className="dice-area">
        <div className="dice-container">
          {diceValues.map((value, index) => (
            <Dice
              key={index}
              value={value}
              isRolling={isRolling}
              delay={index * 100}
            />
          ))}
        </div>
        
        {total !== null && !isRolling && (
          <div className="dice-total">
            <span style={{ color: '#BDC3C7' }}>总点数: </span>
            <span style={{ color: '#F1C40F', fontWeight: 'bold' }}>{total}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleRoll}
        disabled={disabled || isRolling}
        className="roll-button"
      >
        {isRolling ? '投掷中...' : '掷骰'}
      </button>

      <style>{`
        .dice-roller-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          width: 100%;
        }

        .dice-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 32px;
          border-radius: 16px;
          background: rgba(44, 62, 80, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
          max-width: 500px;
        }

        .dice-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
        }

        .dice {
          width: 60px;
          height: 60px;
          perspective: 300px;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .dice.rolling {
          animation: diceRoll 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     diceShake 0.08s ease-in-out infinite;
        }

        .dice-inner {
          width: 100%;
          height: 100%;
          background-color: #34495E;
          background-image: 
            linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            linear-gradient(225deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(0, 0, 0, 0.15) 0%, transparent 60%);
          border-radius: 10px;
          box-shadow: 
            inset 0 2px 4px rgba(255, 255, 255, 0.12),
            inset 0 -2px 4px rgba(0, 0, 0, 0.25),
            inset 0 0 20px rgba(0, 0, 0, 0.1),
            0 4px 12px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          filter: saturate(0.9);
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .dice.rolling .dice-inner {
          animation: diceInnerShake 0.08s ease-in-out infinite;
        }

        .dice-face {
          width: 100%;
          height: 100%;
          position: relative;
          padding: 8px;
          box-sizing: border-box;
        }

        .dice-dot {
          width: 10px;
          height: 10px;
          background: #FFFFFF;
          border-radius: 50%;
          position: absolute;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .dice-dot.center {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .dice-dot.top-left {
          top: 8px;
          left: 8px;
        }

        .dice-dot.top-right {
          top: 8px;
          right: 8px;
        }

        .dice-dot.bottom-left {
          bottom: 8px;
          left: 8px;
        }

        .dice-dot.bottom-right {
          bottom: 8px;
          right: 8px;
        }

        .dice-dot.middle-left {
          top: 50%;
          left: 8px;
          transform: translateY(-50%);
        }

        .dice-dot.middle-right {
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
        }

        .dice-total {
          font-size: 18px;
          padding: 8px 24px;
          background: rgba(52, 73, 94, 0.8);
          border-radius: 8px;
          animation: fadeInUp 0.3s ease-out;
        }

        .roll-button {
          padding: 16px 48px;
          font-size: 18px;
          font-weight: bold;
          color: #2C3E50;
          background: linear-gradient(145deg, #F1C40F 0%, #F39C12 100%);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease-out;
          box-shadow: 0 4px 15px rgba(241, 196, 15, 0.4);
          min-height: 56px;
        }

        .roll-button:hover:not(:disabled) {
          background: linear-gradient(145deg, #F4D03F 0%, #F5AB35 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(241, 196, 15, 0.5);
        }

        .roll-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .roll-button:disabled {
          background: #7F8C8D;
          cursor: not-allowed;
          opacity: 0.6;
          box-shadow: none;
        }

        @keyframes diceRoll {
          0% {
            transform: rotateX(0deg) rotateY(0deg) scale(1);
          }
          25% {
            transform: rotateX(180deg) rotateY(90deg) scale(1.1);
          }
          50% {
            transform: rotateX(360deg) rotateY(180deg) scale(1);
          }
          75% {
            transform: rotateX(540deg) rotateY(270deg) scale(1.05);
          }
          100% {
            transform: rotateX(720deg) rotateY(360deg) scale(1);
          }
        }

        @keyframes diceShake {
          0% {
            transform: translateX(0) translateY(0) translateZ(0);
          }
          12.5% {
            transform: translateX(-3px) translateY(2px) translateZ(0) rotateZ(1deg);
          }
          25% {
            transform: translateX(2px) translateY(-2px) translateZ(0) rotateZ(-1deg);
          }
          37.5% {
            transform: translateX(-4px) translateY(1px) translateZ(0) rotateZ(2deg);
          }
          50% {
            transform: translateX(3px) translateY(-3px) translateZ(0) rotateZ(-2deg);
          }
          62.5% {
            transform: translateX(-2px) translateY(3px) translateZ(0) rotateZ(1deg);
          }
          75% {
            transform: translateX(4px) translateY(-1px) translateZ(0) rotateZ(-1deg);
          }
          87.5% {
            transform: translateX(-3px) translateY(2px) translateZ(0) rotateZ(2deg);
          }
          100% {
            transform: translateX(0) translateY(0) translateZ(0) rotateZ(0deg);
          }
        }

        @keyframes diceInnerShake {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(-1px, 1px, 0);
          }
          50% {
            transform: translate3d(1px, -1px, 0);
          }
          75% {
            transform: translate3d(-1px, -1px, 0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .dice {
            width: 50px;
            height: 50px;
          }

          .dice-dot {
            width: 8px;
            height: 8px;
          }

          .dice-area {
            padding: 20px;
          }

          .roll-button {
            padding: 12px 36px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default DiceRoller;
