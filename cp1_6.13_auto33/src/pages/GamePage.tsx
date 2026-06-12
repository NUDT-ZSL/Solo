import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Room, Player, Card, GameAction, ChipHistoryEntry } from '../types';
import PlayerSeat from '../components/PlayerSeat';
import CardComponent from '../components/CardComponent';
import ChipBar from '../components/ChipBar';
import ChartModal from '../components/ChartModal';

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { ws, sendMessage, playerName } = useWebSocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [winners, setWinners] = useState<Player[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [chipHistory, setChipHistory] = useState<ChipHistoryEntry[]>([]);
  const [isDealing, setIsDealing] = useState(false);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  useEffect(() => {
    if (!ws || !roomId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'room_state':
            setRoom(message.room);
            if (message.playerId) {
              setPlayerId(message.playerId);
            }
            if (message.room?.currentPlayerIndex !== undefined && message.room?.players) {
              const currentPlayer = message.room.players[message.room.currentPlayerIndex];
              setCurrentPlayerId(currentPlayer?.id || null);
            }
            if (message.room?.chipHistory) {
              setChipHistory(message.room.chipHistory);
            }
            break;

          case 'deal_cards':
            setIsDealing(true);
            setTimeout(() => setIsDealing(false), 800);
            break;

          case 'player_joined':
            break;

          case 'player_left':
            break;

          case 'game_started':
            setWinners([]);
            break;

          case 'new_hand':
            setWinners([]);
            break;

          case 'turn_changed':
            setCurrentPlayerId(message.playerId);
            break;

          case 'action_taken':
            break;

          case 'community_cards':
            if (room) {
              setRoom((prev) =>
                prev ? { ...prev, communityCards: message.cards } : prev
              );
            }
            break;

          case 'round_ended':
            setWinners(message.winners || []);
            if (message.communityCards && room) {
              setRoom((prev) =>
                prev ? { ...prev, communityCards: message.communityCards } : prev
              );
            }
            break;

          case 'game_ended':
            if (message.chipHistory) {
              setChipHistory(message.chipHistory);
            }
            setTimeout(() => setShowChart(true), 1000);
            break;

          case 'error':
            alert(message.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    messageHandlerRef.current = handleMessage;
    ws.addEventListener('message', handleMessage);

    return () => {
      if (messageHandlerRef.current) {
        ws.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, [ws, roomId, room]);

  const handleBack = useCallback(() => {
    if (roomId) {
      sendMessage({ type: 'leave_room', roomId });
    }
    navigate('/');
  }, [roomId, sendMessage, navigate]);

  const handleStartGame = useCallback(() => {
    if (roomId) {
      sendMessage({ type: 'start_game', roomId });
    }
  }, [roomId, sendMessage]);

  const handleNextHand = useCallback(() => {
    if (roomId) {
      setWinners([]);
      sendMessage({ type: 'next_hand', roomId });
    }
  }, [roomId, sendMessage]);

  const handleAction = useCallback(
    (action: GameAction, amount?: number) => {
      if (roomId) {
        sendMessage({
          type: 'player_action',
          roomId,
          action,
          amount,
        });
      }
    },
    [roomId, sendMessage]
  );

  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const isCurrentTurn = playerId === currentPlayerId && room?.status === 'playing' && room?.round !== 'showdown';
  const showStartButton = room?.status === 'waiting' && room.players.length >= 2;
  const showNextHandButton = room?.round === 'showdown' && room.status === 'playing';
  const isHost = room?.players[0]?.id === playerId;

  const getWinnerIds = () => winners.map((w) => w.id);

  const getWinnerNames = () => {
    if (winners.length === 0) return '';
    if (winners.length === 1) return `${winners[0].name} Wins!`;
    return `${winners.map((w) => w.name).join(' & ')} Win!`;
  };

  const sortedPlayers = room
    ? [...room.players].sort((a, b) => a.seat - b.seat)
    : [];

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-left">
          <button className="back-btn" onClick={handleBack}>
            ← 返回
          </button>
          <span className="room-id-display">房间: {roomId?.slice(0, 8)}</span>
        </div>
        <button
          className="history-btn"
          onClick={() => setShowChart(true)}
          disabled={chipHistory.length === 0}
        >
          📊 历史
        </button>
      </header>

      <main className="game-table-container">
        <div className="game-table">
          <div className="pot-display">
            <div className="pot-label">底池</div>
            <div className="pot-amount">💰 {room?.pot || 0}</div>
          </div>

          <div className="community-cards">
            {room?.communityCards.map((card: Card) => (
              <CardComponent key={card.id} card={card} isFacingUp={true} />
            ))}
            {Array.from({ length: 5 - (room?.communityCards.length || 0) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  style={{
                    width: '50px',
                    height: '70px',
                    borderRadius: '6px',
                    border: '2px dashed rgba(255,255,255,0.2)',
                  }}
                />
              )
            )}
          </div>

          {winners.length > 0 && (
            <div className="victory-message">{getWinnerNames()}</div>
          )}

          {showStartButton && isHost && (
            <button className="start-game-btn" onClick={handleStartGame}>
              开始游戏
            </button>
          )}

          {showNextHandButton && isHost && (
            <button className="next-hand-btn" onClick={handleNextHand}>
              下一局 →
            </button>
          )}

          {sortedPlayers.map((player: Player) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === currentPlayerId}
              isSelf={player.id === playerId}
              isWinner={getWinnerIds().includes(player.id)}
            />
          ))}

          {currentPlayer && (
            <ChipBar
              isVisible={isCurrentTurn || false}
              isDisabled={!isCurrentTurn || isDealing}
              currentBet={room?.currentBet || 0}
              playerChips={currentPlayer.chips}
              playerCurrentBet={currentPlayer.currentBet}
              pot={room?.pot || 0}
              onAction={handleAction}
            />
          )}
        </div>
      </main>

      <ChartModal
        isOpen={showChart}
        onClose={() => setShowChart(false)}
        chipHistory={chipHistory}
        players={room?.players || []}
      />
    </div>
  );
};

export default GamePage;
