import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  sessionApi,
  gameNames,
  type GameSession,
  type PlayerInSession,
  type StrategyNote
} from '../../services/api';

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

export default function SessionManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [gameName, setGameName] = useState(gameNames[0]);
  const [playerCount, setPlayerCount] = useState(3);
  const [players, setPlayers] = useState<PlayerInSession[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endScores, setEndScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const defaultPlayers: PlayerInSession[] = [];
    for (let i = 0; i < playerCount; i++) {
      defaultPlayers.push({
        id: uuidv4(),
        name: `玩家${i + 1}`,
        role: ''
      });
    }
    setPlayers(defaultPlayers);
  }, [playerCount]);

  useEffect(() => {
    if (id) {
      loadSession(id);
    }
  }, [id]);

  useEffect(() => {
    if (session && session.players.length > 0) {
      setSelectedPlayer(session.players[0].id);
      const scores: Record<string, number> = {};
      session.players.forEach(p => {
        scores[p.id] = 0;
      });
      setEndScores(scores);
    }
  }, [session]);

  async function loadSession(sessionId: string) {
    setLoading(true);
    setError(null);
    const result = await sessionApi.getSession(sessionId);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setSession(result.data);
    }
    setLoading(false);
  }

  function updatePlayer(playerId: string, field: 'name' | 'role', value: string) {
    setPlayers(players.map(p => (p.id === playerId ? { ...p, [field]: value } : p)));
  }

  async function startGame(e: React.MouseEvent<HTMLButtonElement>) {
    createRipple(e);
    setLoading(true);
    setError(null);
    const createResult = await sessionApi.createSession({
      gameName,
      playerCount,
      players
    });
    if (createResult.error) {
      setError(createResult.error);
      setLoading(false);
      return;
    }
    if (!createResult.data) {
      setLoading(false);
      return;
    }
    const updateResult = await sessionApi.updateSession(createResult.data.id, {
      status: 'playing'
    });
    if (updateResult.error) {
      setError(updateResult.error);
    } else if (updateResult.data) {
      setSession(updateResult.data);
      navigate(`/session/${updateResult.data.id}`);
    }
    setLoading(false);
  }

  async function submitNote(e: React.MouseEvent<HTMLButtonElement>) {
    createRipple(e);
    if (!session || !noteContent.trim() || !selectedPlayer) return;
    if (noteContent.length > 150) {
      setError('笔记内容不能超过150字');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const player = session.players.find(p => p.id === selectedPlayer);
    if (!player) return;

    const result = await sessionApi.addNote(session.id, {
      playerId: selectedPlayer,
      playerName: player.name,
      playerAvatar: player.avatar,
      round: currentRound,
      content: noteContent.trim()
    });
    if (result.error) {
      setError(result.error);
      setTimeout(() => setError(null), 3000);
    } else if (result.data) {
      setSession({
        ...session,
        notes: [...session.notes, result.data]
      });
      setNoteContent('');
    }
  }

  async function toggleLike(note: StrategyNote) {
    if (!session) return;
    const currentPlayerId = selectedPlayer || session.players[0]?.id;
    if (!currentPlayerId) return;

    const result = await sessionApi.likeNote(session.id, note.id, currentPlayerId);
    if (result.error) {
      setError(result.error);
      setTimeout(() => setError(null), 3000);
    } else if (result.data) {
      setSession({
        ...session,
        notes: session.notes.map(n => (n.id === note.id ? result.data! : n))
      });
    }
  }

  async function endGame(e: React.MouseEvent<HTMLButtonElement>) {
    createRipple(e);
    if (!session) return;

    const results = session.players
      .map(player => ({
        playerId: player.id,
        playerName: player.name,
        score: endScores[player.id] || 0,
        rank: 0,
        weightedScore: 0
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    setLoading(true);
    setError(null);
    const result = await sessionApi.updateSession(session.id, {
      status: 'finished',
      rounds: currentRound,
      results
    });
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setSession(result.data);
    }
    setLoading(false);
  }

  const sortedNotes = [...(session?.notes || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const topNotes = [...(session?.notes || [])]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  if (loading && !session && id) {
    return (
      <div className="session-page">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="session-page">
        <div className="session-main">
          <div className="card">
            <h1 className="page-title">创建游戏桌</h1>

            {error && (
              <div
                className="card"
                style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  background: '#ffebee',
                  color: '#c62828',
                  borderLeft: '4px solid #f44336'
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">选择桌游</label>
              <select
                className="form-select"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
              >
                {gameNames.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">玩家人数</label>
              <select
                className="form-select"
                value={playerCount}
                onChange={e => setPlayerCount(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    {n}人
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">玩家信息</label>
              {players.map((player, index) => (
                <div key={player.id} className="player-input-row">
                  <span style={{ width: 24, color: '#888' }}>{index + 1}.</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="玩家名称"
                    value={player.name}
                    onChange={e => updatePlayer(player.id, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="角色（可选）"
                    value={player.role || ''}
                    onChange={e => updatePlayer(player.id, 'role', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={startGame}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? '创建中...' : '开始游戏'}
            </button>
          </div>
        </div>

        <div className="session-sidebar">
          <div className="card">
            <h3 className="section-title">游戏说明</h3>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.8 }}>
              选择桌游和玩家后开始游戏。游戏过程中可以随时记录策略笔记，
              所有玩家可以互相点赞表示赞同。游戏结束后自动生成战报和评分。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'finished') {
    return (
      <div className="card">
        {error && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: '#ffebee',
              color: '#c62828',
              borderLeft: '4px solid #f44336'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <h1 className="page-title">📋 对局战报 - {session.gameName}</h1>

        <div className="war-report">
          <div className="war-report-main">
            <h3 className="section-title">⏱ 比赛时间线</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-round">游戏开始</div>
                <div className="timeline-event">
                  {dayjs(session.startTime).format('HH:mm')} 游戏正式开始
                </div>
              </div>
              {session.notes.map(note => (
                <div key={note.id} className="timeline-item">
                  <div className="timeline-round">
                    第{note.round}回合 · {note.playerName}
                  </div>
                  <div className="timeline-event">{note.content}</div>
                </div>
              ))}
              <div className="timeline-item">
                <div className="timeline-round">游戏结束</div>
                <div className="timeline-event">
                  {dayjs(session.endTime).format('HH:mm')} 游戏结束，共{session.rounds}回合，
                  历时{session.durationMinutes}分钟
                </div>
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: 32 }}>
              🏆 最终排名
            </h3>
            <div className="result-list">
              {session.results?.map(result => (
                <div key={result.playerId} className="result-item">
                  <div className={`result-rank rank-${result.rank}`}>{result.rank}</div>
                  <div className="result-name">
                    {result.playerName}
                    {session.players.find(p => p.id === result.playerId)?.role && (
                      <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                        （{session.players.find(p => p.id === result.playerId)?.role}）
                      </span>
                    )}
                  </div>
                  <div className="result-score">
                    <div className="result-weighted">{result.weightedScore.toFixed(1)}分</div>
                    <div className="result-raw">原始得分: {result.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="war-report-sidebar">
            <h3 className="section-title">🌟 精华笔记</h3>
            <div className="top-notes">
              {topNotes.length === 0 ? (
                <p style={{ color: '#999', fontSize: 13 }}>暂无笔记</p>
              ) : (
                topNotes.map((note, index) => (
                  <div key={note.id} className="top-note-card">
                    <span className="top-note-rank">
                      {index === 0 ? '🥇 TOP1' : index === 1 ? '🥈 TOP2' : '🥉 TOP3'}
                    </span>
                    <div className="note-header">
                      <div className="note-avatar">{note.playerName[0]}</div>
                      <span>{note.playerName}</span>
                      <span className="note-round">第{note.round}回合</span>
                    </div>
                    <div className="note-content">{note.content}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      ❤️ {note.likes} 人赞同
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8
              }}
            >
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>评分规则</div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                胜利: +10分
                <br />
                第二名: +6分
                <br />
                第三名: +3分
                <br />
                其余: +1分
                <br />
                每分钟游戏时长: +0.5分
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          style={{ marginTop: 24 }}
          onClick={() => navigate('/session')}
        >
          开始新一局
        </button>
      </div>
    );
  }

  return (
    <div className="session-page">
      <div className="session-main">
        <div className="card">
          {error && (
            <div
              className="card"
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: '#ffebee',
                color: '#c62828',
                borderLeft: '4px solid #f44336',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>⚠️ {error}</span>
              <span onClick={() => setError(null)} style={{ cursor: 'pointer' }}>
                ✕
              </span>
            </div>
          )}

          <h1 className="page-title">🎮 {session.gameName}</h1>

          <div style={{ marginBottom: 20 }}>
            <span style={{ color: '#888', marginRight: 16 }}>
              玩家人数: {session.playerCount}人
            </span>
            <span style={{ color: '#888' }}>
              开始时间: {dayjs(session.startTime).format('HH:mm')}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">当前回合</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px' }}
                onClick={e => {
                  createRipple(e);
                  if (currentRound > 1) setCurrentRound(currentRound - 1);
                }}
              >
                -
              </button>
              <span style={{ fontSize: 20, fontWeight: 'bold', minWidth: 60, textAlign: 'center' }}>
                第 {currentRound} 回合
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px' }}
                onClick={e => {
                  createRipple(e);
                  setCurrentRound(currentRound + 1);
                }}
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">玩家得分</label>
            {session.players.map(player => (
              <div key={player.id} className="player-input-row">
                <div className="note-avatar">{player.name[0]}</div>
                <span style={{ flex: 1 }}>{player.name}</span>
                {player.role && (
                  <span style={{ color: '#888', fontSize: 12 }}>{player.role}</span>
                )}
                <input
                  type="number"
                  className="form-input"
                  style={{ width: 80 }}
                  value={endScores[player.id] || 0}
                  onChange={e =>
                    setEndScores({
                      ...endScores,
                      [player.id]: Number(e.target.value)
                    })
                  }
                />
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={endGame}
            disabled={loading}
          >
            {loading ? '生成中...' : '结束对局，生成战报'}
          </button>
        </div>
      </div>

      <div className="session-sidebar">
        <div className="card">
          <h3 className="section-title">📝 策略笔记</h3>

          <div className="note-input-section">
            <select
              className="form-select"
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              style={{ marginBottom: 8 }}
            >
              {session.players.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <textarea
              className="note-textarea"
              placeholder="记录当前回合的感想和策略...（限150字）"
              value={noteContent}
              onChange={e => setNoteContent(e.target.value.slice(0, 150))}
              maxLength={150}
            />
            <div className="note-submit-row">
              <span style={{ fontSize: 12, color: '#999', lineHeight: '36px' }}>
                {noteContent.length}/150
              </span>
              <button
                className="btn btn-primary"
                style={{ marginLeft: 'auto' }}
                onClick={submitNote}
                disabled={!noteContent.trim() || loading}
              >
                发布
              </button>
            </div>
          </div>

          <div className="notes-panel">
            <div className="notes-masonry">
              {sortedNotes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💭</div>
                  <p>还没有笔记，快来记录第一条吧！</p>
                </div>
              ) : (
                sortedNotes.map(note => (
                  <div key={note.id} className="note-card">
                    <div className="note-header">
                      <div className="note-avatar">{note.playerName[0]}</div>
                      <span>{note.playerName}</span>
                      <span className="note-round">第{note.round}回</span>
                    </div>
                    <div className="note-content">{note.content}</div>
                    <div className="note-footer">
                      <button
                        className={`like-btn ${
                          note.likedBy.includes(selectedPlayer) ? 'active' : ''
                        }`}
                        onClick={() => toggleLike(note)}
                      >
                        ❤️ {note.likes}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
