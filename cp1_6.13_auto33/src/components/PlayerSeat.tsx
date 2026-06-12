import React from 'react';
import { Player } from '../types';
import CardComponent from './CardComponent';

interface PlayerSeatProps {
  player: Player;
  isCurrentPlayer: boolean;
  isSelf: boolean;
  isWinner: boolean;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentPlayer,
  isSelf,
  isWinner,
}) => {
  const seatClass = `seat-${player.seat}`;
  const statusClass = player.isFolded ? 'folded' : player.isAllIn ? 'allin' : '';

  const getStatusText = () => {
    if (player.isFolded) return '已弃牌';
    if (player.isAllIn) return '全下';
    if (isCurrentPlayer) return '思考中...';
    return '';
  };

  return (
    <div
      className={`player-seat ${seatClass} ${isCurrentPlayer ? 'active' : ''} ${
        player.isFolded ? 'folded' : ''
      } ${isWinner ? 'winner' : ''}`}
    >
      <div className="player-avatar">
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="player-name">{player.name}</div>
      <div className="player-chips">💰 {player.chips}</div>
      {player.currentBet > 0 && (
        <div className="player-bet">下注: {player.currentBet}</div>
      )}
      {getStatusText() && (
        <div className={`player-status ${statusClass}`}>{getStatusText()}</div>
      )}
      <div className="player-hand">
        {player.hand.map((card, index) => (
          <CardComponent
            key={card.id}
            card={card}
            isFacingUp={isSelf || isWinner}
            isClickable={isSelf && !player.isFolded}
          />
        ))}
        {player.hand.length === 0 && !player.isFolded && isSelf === false && (
          <>
            <CardComponent card={undefined} isFacingUp={false} />
            <CardComponent card={undefined} isFacingUp={false} />
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(PlayerSeat);
