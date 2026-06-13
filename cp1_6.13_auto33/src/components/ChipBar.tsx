import React, { useState, useCallback, useEffect } from 'react';
import { GameAction } from '../types';

interface ChipBarProps {
  isVisible: boolean;
  isDisabled: boolean;
  currentBet: number;
  playerChips: number;
  playerCurrentBet: number;
  pot: number;
  isFolded?: boolean;
  isAllIn?: boolean;
  gameStatus?: 'waiting' | 'playing' | 'finished';
  round?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  onAction: (action: GameAction, amount?: number) => void;
}

const ChipBar: React.FC<ChipBarProps> = ({
  isVisible,
  isDisabled,
  currentBet,
  playerChips,
  playerCurrentBet,
  pot,
  isFolded = false,
  isAllIn = false,
  gameStatus = 'waiting',
  round = 'preflop',
  onAction,
}) => {
  const [raiseAmount, setRaiseAmount] = useState(40);
  const [foldFlashing, setFoldFlashing] = useState(false);

  const callAmount = currentBet - playerCurrentBet;
  const minRaise = Math.max(currentBet * 2 - playerCurrentBet, 40);
  const maxRaise = playerChips + playerCurrentBet;

  useEffect(() => {
    if (currentBet > 0) {
      setRaiseAmount(Math.max(currentBet * 2 - playerCurrentBet, 40));
    }
  }, [currentBet, playerCurrentBet]);

  const canAct = 
    !isDisabled && 
    gameStatus === 'playing' && 
    round !== 'showdown' && 
    !isFolded && 
    !isAllIn &&
    playerChips >= 0;

  const canFold = canAct && round !== 'showdown';
  const canCall = canAct && playerChips > 0;
  const canRaise = canAct && playerChips > minRaise - playerCurrentBet;
  const canAllIn = canAct && playerChips > 0;

  const handleFold = useCallback(() => {
    if (!canFold) return;
    setFoldFlashing(true);
    setTimeout(() => {
      setFoldFlashing(false);
      onAction('fold');
    }, 300);
  }, [canFold, onAction]);

  const handleCall = useCallback(() => {
    if (!canCall) return;
    onAction('call');
  }, [canCall, onAction]);

  const handleRaise = useCallback(() => {
    if (!canRaise) return;
    const amount = Math.min(Math.max(raiseAmount, minRaise), maxRaise);
    onAction('raise', amount);
  }, [raiseAmount, minRaise, maxRaise, canRaise, onAction]);

  const handleAllIn = useCallback(() => {
    if (!canAllIn) return;
    onAction('allin');
  }, [canAllIn, onAction]);

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
        disabled={!canFold}
      >
        弃牌
      </button>
      <button
        className="chip-btn call"
        onClick={handleCall}
        disabled={!canCall}
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
          disabled={!canRaise}
        />
      </div>
      <button
        className="chip-btn raise"
        onClick={handleRaise}
        disabled={!canRaise}
      >
        加注
      </button>
      <button
        className="chip-btn allin"
        onClick={handleAllIn}
        disabled={!canAllIn}
      >
        全下
      </button>
    </div>
  );
};

export default React.memo(ChipBar);
