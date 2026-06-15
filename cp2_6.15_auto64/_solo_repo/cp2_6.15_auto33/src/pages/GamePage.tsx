import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import GameBoard from '../ui/GameBoard';
import { gameSocket } from '../network/GameSocket';
import type { UnitType, PlayerId, GameState } from '../shared/types';

const WS_URL = 'ws://localhost:3001';

export default function GamePage() {
  const {
    gameId,
    playerId,
    playerName,
    gameState,
    setGameState,
    setMatchStatus,
    setWinner,
    winner,
    setConnectionStatus,
    connectionStatus,
    resetGame,
  } = useGameStore();

  const [showGameOver, setShowGameOver] = useState(false);

  useEffect(() => {
    if (!gameId || !playerId || !playerName) {
      setMatchStatus('idle');
      return;
    }

    setConnectionStatus('connecting');

    gameSocket.connect(WS_URL)
      .then(() => {
        setConnectionStatus('connected');
        gameSocket.joinGame(gameId, playerName, playerId);
      })
      .catch((err) => {
        console.error('Failed to connect:', err);
        setConnectionStatus('disconnected');
      });

    const unsubState = gameSocket.onStateChange((state: GameState) => {
      setGameState(state);
      if (state.status === 'ended' && state.winner) {
        setWinner(state.winner);
        setShowGameOver(true);
        setMatchStatus('ended');
      }
    });

    const unsubGameOver = gameSocket.onGameOver((gameWinner) => {
      setWinner(gameWinner);
      setShowGameOver(true);
      setMatchStatus('ended');
    });

    return () => {
      unsubState();
      unsubGameOver();
      gameSocket.disconnect();
    };
  }, [gameId, playerId, playerName, setGameState, setMatchStatus, setWinner, setConnectionStatus]);

  const handleBuild = (unitType: UnitType) => {
    if (playerId) {
      gameSocket.buildUnit(playerId, unitType);
    }
  };

  const handleSurrender = () => {
    if (confirm('确定要投降吗？')) {
      if (playerId) {
        gameSocket.surrender(playerId);
      }
    }
  };

  const handleBackToLobby = () => {
    resetGame();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] overflow-hidden">
      <GameBoard
        gameState={gameState}
        playerId={playerId}
        playerName={playerName}
        onBuild={handleBuild}
      />

      <div className="absolute top-4 right-4 flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
          connectionStatus === 'connected'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {connectionStatus === 'connected' ? '已连接' : 
           connectionStatus === 'connecting' ? '连接中...' :
           connectionStatus === 'reconnecting' ? '重连中...' : '已断开'}
        </div>
        <button
          onClick={handleSurrender}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-all"
        >
          投降
        </button>
      </div>

      {showGameOver && winner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-10 text-center max-w-md w-full mx-4 border border-gray-700">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              winner === 'draw'
                ? 'bg-gray-600'
                : winner === playerId
                ? 'bg-gradient-to-br from-yellow-500 to-amber-600'
                : 'bg-gradient-to-br from-red-600 to-rose-700'
            }`}>
              {winner === 'draw' ? (
                <span className="text-4xl">🤝</span>
              ) : winner === playerId ? (
                <span className="text-4xl">🏆</span>
              ) : (
                <span className="text-4xl">💔</span>
              )}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {winner === 'draw'
                ? '平局!'
                : winner === playerId
                ? '胜利!'
                : '失败...'}
            </h2>
            
            <p className="text-gray-400 mb-6">
              {winner === 'draw'
                ? '双方势均力敌'
                : winner === playerId
                ? '恭喜你赢得了这场战斗!'
                : '再接再厉，下次一定能赢!'}
            </p>

            {gameState && (
              <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-red-400 font-bold text-xl">{gameState.scores.red}</div>
                    <div className="text-gray-500 text-xs">红方积分</div>
                  </div>
                  <div>
                    <div className="text-gray-300 font-bold text-xl">
                      {formatTime(900 - gameState.timeRemaining)}
                    </div>
                    <div className="text-gray-500 text-xs">用时</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold text-xl">{gameState.scores.blue}</div>
                    <div className="text-gray-500 text-xs">蓝方积分</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleBackToLobby}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
