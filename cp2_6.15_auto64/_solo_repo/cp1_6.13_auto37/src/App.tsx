import { useState, useCallback } from 'react';
import { GameState, MatchFoundMessage } from './types';
import { GameNetwork } from './network';
import LobbyPage from './components/LobbyPage';
import GamePage from './components/GamePage';
import ResultPage from './components/ResultPage';

type Page = 'lobby' | 'game' | 'result';

export default function App() {
  const [page, setPage] = useState<Page>('lobby');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<1 | 2>(1);
  const [roomId, setRoomId] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [network, setNetwork] = useState<GameNetwork | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  const handleMatchFound = useCallback((data: MatchFoundMessage) => {
    setRoomId(data.roomId);
    setPlayerId(data.playerId);
    setOpponentName(data.opponentName);
    setIsMatching(false);
    setPage('game');
  }, []);

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState(state);
    if (state.phase === 'ended' && state.winner !== null) {
      setTimeout(() => {
        setPage('result');
      }, 1000);
    }
  }, []);

  const handleStartMatch = useCallback((name: string) => {
    setPlayerName(name);
    setIsMatching(true);
    
    const net = new GameNetwork({
      onMatchFound: handleMatchFound,
      onStateUpdate: handleStateUpdate,
      onError: (error) => {
        console.error('Network error:', error);
        setIsMatching(false);
      },
    });
    
    setNetwork(net);
    net.connect(name);
  }, [handleMatchFound, handleStateUpdate]);

  const handlePlayAgain = useCallback(() => {
    if (network) {
      network.disconnect();
    }
    setGameState(null);
    setRoomId('');
    setOpponentName('');
    setNetwork(null);
    setPage('lobby');
  }, [network]);

  const handleBackToLobby = useCallback(() => {
    if (network) {
      network.disconnect();
    }
    setGameState(null);
    setRoomId('');
    setOpponentName('');
    setPlayerName('');
    setNetwork(null);
    setPage('lobby');
  }, [network]);

  return (
    <div className="app-container">
      {page === 'lobby' && (
        <LobbyPage
          onStartMatch={handleStartMatch}
          isMatching={isMatching}
        />
      )}
      {page === 'game' && gameState && network && (
        <GamePage
          gameState={gameState}
          playerId={playerId}
          roomId={roomId}
          playerName={playerName}
          opponentName={opponentName}
          network={network}
        />
      )}
      {page === 'result' && gameState && (
        <ResultPage
          gameState={gameState}
          playerId={playerId}
          playerName={playerName}
          opponentName={opponentName}
          onPlayAgain={handlePlayAgain}
          onBackToLobby={handleBackToLobby}
        />
      )}
    </div>
  );
}
