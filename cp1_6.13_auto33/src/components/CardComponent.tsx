import React, { useState, useCallback } from 'react';
import { Card } from '../types';

interface CardComponentProps {
  card?: Card;
  isFacingUp: boolean;
  isClickable?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: { [key: string]: string } = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RANK_DISPLAY: { [key: number]: string } = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isFacingUp,
  isClickable = false,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = useCallback(() => {
    if (isClickable && isFacingUp) {
      setIsFlipped((prev) => !prev);
    }
  }, [isClickable, isFacingUp]);

  const getRankDisplay = (rank: number): string => {
    return RANK_DISPLAY[rank] || rank.toString();
  };

  const getSuitColor = (suit: string): string => {
    return suit === 'hearts' || suit === 'diamonds' ? 'card-red' : 'card-black';
  };

  if (!isFacingUp) {
    return (
      <div className={`card back ${className}`}>
        <div className="card-inner">
          <div className="card-face card-back"></div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className={`card back ${className}`}>
        <div className="card-inner">
          <div className="card-face card-back"></div>
        </div>
      </div>
    );
  }

  const showFace = isClickable ? !isFlipped : true;

  return (
    <div
      className={`card ${className} ${isClickable ? 'clickable' : ''}`}
      onClick={handleClick}
    >
      <div className={`card-inner ${!showFace ? 'flipped' : ''}`}>
        <div className={`card-face card-front ${getSuitColor(card.suit)}`}>
          <div className="card-rank-top">
            {getRankDisplay(card.rank)}
            {SUIT_SYMBOLS[card.suit]}
          </div>
          <div className="card-suit-center">{SUIT_SYMBOLS[card.suit]}</div>
          <div className="card-rank-bottom">
            {getRankDisplay(card.rank)}
            {SUIT_SYMBOLS[card.suit]}
          </div>
        </div>
        <div className="card-face card-back"></div>
      </div>
    </div>
  );
};

export default React.memo(CardComponent);
