import React from 'react';
import { Player } from '../types';
import CardComponent from './CardComponent';

interface PlayerSeatProps {
  player: Player;
  isCurrentPlayer: boolean;
  isSelf: boolean;
  isWinner: boolean;
  isDealing?: boolean;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentPlayer,
  isSelf,
  isWinner,
  isDealing = false,
}) => {
  const seatClass = `seat-${player.seat}`;
  const statusClass = player.isFolded ? 'folded' : player.isAllIn ? 'allin' : '';
  const dealClass = isDealing && player.hand.length > 0 ? 'dealing' : '';

  const getStatusText = () => {
    if (player.isFolded) return '已弃牌';
    if (player.isAllIn) return '全下';
    if (isCurrentPlayer) return '思考中...';
    if (!player.isActive) return '离线';
    return '';
  };

  return (
    <div
      className={`player-seat ${seatClass} ${isCurrentPlayer ? 'active' : ''} ${
        player.isFolded ? 'folded' : ''
      } ${isWinner ? 'winner' : ''} ${!player.isActive ? 'offline' : ''}`}
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
      <div className={`player-hand ${dealClass}`}>
        {player.hand.map((card, index) => (
          <div
            key={card.id}
            className={`card-deal-${player.seat}`}
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            <CardComponent
              card={card}
              isFacingUp={isSelf || isWinner}
              isClickable={isSelf && !player.isFolded}
            />
          </div>
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
