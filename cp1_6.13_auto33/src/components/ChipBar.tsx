import React, { useState, useCallback } from 'react';
import { GameAction } from '../types';

interface ChipBarProps {
  isVisible: boolean;
  isDisabled: boolean;
  currentBet: number;
  playerChips: number;
  playerCurrentBet: number;
  pot: number;
  onAction: (action: GameAction, amount?: number) => void;
}

const ChipBar: React.FC<ChipBarProps> = ({
  isVisible,
  isDisabled,
  currentBet,
  playerChips,
  playerCurrentBet,
  pot,
  onAction,
}) => {
  const [raiseAmount, setRaiseAmount] = useState(40);
  const [foldFlashing, setFoldFlashing] = useState(false);

  const callAmount = currentBet - playerCurrentBet;
  const minRaise = Math.max(currentBet * 2 - playerCurrentBet, 40);
  const maxRaise = playerChips + playerCurrentBet;

  const handleFold = useCallback(() => {
    setFoldFlashing(true);
    setTimeout(() => {
      setFoldFlashing(false);
      onAction('fold');
    }, 300);
  }, [onAction]);

  const handleCall = useCallback(() => {
    onAction('call');
  }, [onAction]);

  const handleRaise = useCallback(() => {
    const amount = Math.min(Math.max(raiseAmount, minRaise), maxRaise);
    onAction('raise', amount);
  }, [raiseAmount, minRaise, maxRaise, onAction]);

  const handleAllIn = useCallback(() => {
    onAction('allin');
  }, [onAction]);

  const handleRaiseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || minRaise;
      setRaiseAmount(Math.min(Math.max(value, minRaise), maxRaise));
    },
    [minRaise, maxRaise]
  );

  if (!isVisible) {
    return <div className="chip-bar hidden"></div>;
  }

  return (
    <div className="chip-bar">
      <div className="chip-info">
        <div className="chip-info-pot">
          底池: <span>{pot}</span>
        </div>
        <div className="chip-info-my">
          筹码: <span>{playerChips}</span>
        </div>
      </div>
      <button
        className={`chip-btn fold ${foldFlashing ? 'flashing' : ''}`}
        onClick={handleFold}
        disabled={isDisabled}
      >
        弃牌
      </button>
      <button
        className="chip-btn call"
        onClick={handleCall}
        disabled={isDisabled || playerChips <= 0}
      >
        {callAmount === 0 ? '过牌' : `跟注 ${callAmount}`}
      </button>
      <div className="raise-amount">
        <input
          type="number"
          value={raiseAmount}
          onChange={handleRaiseChange}
          min={minRaise}
          max={maxRaise}
          disabled={isDisabled || playerChips <= 0}
        />
      </div>
      <button
        className="chip-btn raise"
        onClick={handleRaise}
        disabled={isDisabled || playerChips <= 0}
      >
        加注
      </button>
      <button
        className="chip-btn allin"
        onClick={handleAllIn}
        disabled={isDisabled || playerChips <= 0}
      >
        全下
      </button>
    </div>
  );
};

export default React.memo(ChipBar);
