import { GameState, PlayerId } from '../types';
import { calculateTerritoryPercentages, countTowersByType } from '../gameEngine';

interface ResultPageProps {
  gameState: GameState;
  playerId: PlayerId;
  playerName: string;
  opponentName: string;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function ResultPage({
  gameState,
  playerId,
  playerName,
  opponentName,
  onPlayAgain,
  onBackToLobby,
}: ResultPageProps) {
  const { winner } = gameState;
  const isWinner = winner === playerId;
  const isDraw = winner === 'draw';

  const percentages = calculateTerritoryPercentages(gameState);
  const player1Towers = countTowersByType(gameState, 1);
  const player2Towers = countTowersByType(gameState, 2);

  const myTowers = playerId === 1 ? player1Towers : player2Towers;
  const opponentTowers = playerId === 1 ? player2Towers : player1Towers;

  const myPercentage = playerId === 1 ? percentages.p1 : percentages.p2;
  const opponentPercentage = playerId === 1 ? percentages.p2 : percentages.p1;

  const totalTowers = {
    fire: myTowers.fire + opponentTowers.fire,
    ice: myTowers.ice + opponentTowers.ice,
    electric: myTowers.electric + opponentTowers.electric,
  };

  const maxTowers = Math.max(totalTowers.fire, totalTowers.ice, totalTowers.electric, 1);

  const getResultText = () => {
    if (isDraw) return '平局！';
    return isWinner ? '胜利！' : '失败...';
  };

  const getResultColor = () => {
    if (isDraw) return '#d69e2e';
    return isWinner ? '#68d391' : '#fc8181';
  };

  return (
    <div className="result-page">
      <div className="result-content">
        <h1 className="result-title" style={{ color: getResultColor() }}>
          {getResultText()}
        </h1>

        <div className="result-winner">
          {!isDraw && (
            <p>
              {winner === 1 ? (playerId === 1 ? playerName : opponentName) : (playerId === 2 ? playerName : opponentName)}
              {' '}获胜！
            </p>
          )}
        </div>

        <div className="territory-section">
          <h3>领地占比</h3>
          <div className="territory-bars">
            <div className="territory-bar-wrapper">
              <div className="territory-label">
                <span className="player-dot" style={{ backgroundColor: playerId === 1 ? '#63b3ed' : '#fc8181' }}></span>
                {playerName}
              </div>
              <div className="territory-bar-container">
                <div
                  className="territory-bar player-bar"
                  style={{
                    width: `${myPercentage}%`,
                    backgroundColor: playerId === 1 ? '#63b3ed' : '#fc8181',
                  }}
                ></div>
              </div>
              <span className="territory-percentage">{myPercentage}%</span>
            </div>

            <div className="territory-bar-wrapper">
              <div className="territory-label">
                <span className="player-dot" style={{ backgroundColor: playerId === 2 ? '#63b3ed' : '#fc8181' }}></span>
                {opponentName}
              </div>
              <div className="territory-bar-container">
                <div
                  className="territory-bar opponent-bar"
                  style={{
                    width: `${opponentPercentage}%`,
                    backgroundColor: playerId === 2 ? '#63b3ed' : '#fc8181',
                  }}
                ></div>
              </div>
              <span className="territory-percentage">{opponentPercentage}%</span>
            </div>
          </div>
        </div>

        <div className="towers-section">
          <h3>能量塔统计</h3>
          <div className="towers-chart">
            <div className="tower-chart-item">
              <span className="tower-icon">🔥</span>
              <div className="tower-bars-container">
                <div className="tower-bar-row">
                  <span className="tower-bar-label">{playerName}</span>
                  <div className="tower-bar-bg">
                    <div
                      className="tower-bar my-tower"
                      style={{
                        width: `${(myTowers.fire / maxTowers) * 100}%`,
                        backgroundColor: '#c53030',
                      }}
                    ></div>
                  </div>
                  <span className="tower-count">{myTowers.fire}</span>
                </div>
                <div className="tower-bar-row">
                  <span className="tower-bar-label">{opponentName}</span>
                  <div className="tower-bar-bg">
                    <div
                      className="tower-bar opponent-tower"
                      style={{
                        width: `${(opponentTowers.fire / maxTowers) * 100}%`,
                        backgroundColor: '#c53030',
                        opacity: 0.6,
                      }}
                    ></div>
                  </div>
                  <span className="tower-count">{opponentTowers.fire}</span>
                </div>
              </div>
            </div>

            <div className="tower-chart-item">
              <span className="tower-icon">❄️</span>
              <div className="tower-bars-container">
                <div className="tower-bar-row">
                  <span className="tower-bar-label">{playerName}</span>
                  <div className="tower-bar-bg">
                    <div
                      className="tower-bar my-tower"
                      style={{
                        width: `${(myTowers.ice / maxTowers) * 100}%`,
                        backgroundColor: '#2c7a7b',
                      }}
                    ></div>
                  </div>
                  <span className="tower-count">{myTowers.ice}</span>
                </div>
                <div className="tower-bar-row">
                  <span className="tower-bar-label">{opponentName}</span>
                  <div className="tower-bar-bg">
                    <div
                      className="tower-bar opponent-tower"
                      style={{
                        width: `${(opponentTowers.ice / maxTowers) * 100}%`,
                        backgroundColor: '#2c7a7b',
                        opacity: 0.6,
                      }}
                    ></div>
                  </div>
                  <span className="tower-count">{opponentTowers.ice}</span>
                </div>
              </div>
            </div>

            <div className="tower-chart-item">
              <span className="tower-icon">⚡</span>
              <div className="tower-bars-container">
                <div className="tower-bar-row">
                  <span className="tower-bar-label">{playerName}</span>
                  <div className="tower-bar-bg">
                    <div
                      className="tower-bar my-tower"
                      style={{
                        width: `${(myTowers.electric / maxTowers) * 100}%`,
                        backgroundColor: '#d69e2e',
                      }}
                    ></div>
                  </div>
                  <span className="tower-count">{myTowers.electric}</span>
                </div>
                <div className="tower-bar-row">
                  <span className="tower-bar-label">{opponentName}</span>
                  <div className="tower-bar-bg">
                    <div
                      className="tower-bar opponent-tower"
                      style={{
                        width: `${(opponentTowers.electric / maxTowers) * 100}%`,
                        backgroundColor: '#d69e2e',
                        opacity: 0.6,
                      }}
                    ></div>
                  </div>
                  <span className="tower-count">{opponentTowers.electric}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button className="result-btn primary" onClick={onPlayAgain}>
            再来一局
          </button>
          <button className="result-btn secondary" onClick={onBackToLobby}>
            返回大厅
          </button>
        </div>
      </div>
    </div>
  );
}
