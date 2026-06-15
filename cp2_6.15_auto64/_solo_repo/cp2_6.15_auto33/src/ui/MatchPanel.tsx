import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { LeaderboardEntry } from '../shared/types';

const API_BASE = 'http://localhost:3001';

export default function MatchPanel() {
  const {
    playerName,
    setPlayerName,
    matchStatus,
    setMatchStatus,
    setQueueId,
    setGameId,
    setPlayerId,
    leaderboard,
    setLeaderboard,
    queueId,
  } = useGameStore();

  const [inputName, setInputName] = useState(playerName);
  const [waitTime, setWaitTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchStatus === 'waiting' && queueId) {
      interval = setInterval(() => {
        setWaitTime((t) => t + 1);
        checkMatchStatus();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [matchStatus, queueId]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard?limit=10`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  };

  const checkMatchStatus = useCallback(async () => {
    if (!queueId) return;
    try {
      const res = await fetch(`${API_BASE}/api/match/status/${queueId}`);
      const data = await res.json();
      if (data.status === 'matched' && data.gameId) {
        setGameId(data.gameId);
        setPlayerId(data.playerId);
        setMatchStatus('matched');
      } else if (data.status === 'failed') {
        setMatchStatus('failed');
      }
    } catch (e) {
      console.error('Failed to check match status:', e);
    }
  }, [queueId, setGameId, setPlayerId, setMatchStatus]);

  const handleJoinMatch = async () => {
    const name = inputName.trim();
    if (!name) {
      alert('请输入玩家名称');
      return;
    }
    if (name.length > 20) {
      alert('玩家名称不能超过20个字符');
      return;
    }

    setIsLoading(true);
    setPlayerName(name);

    try {
      const res = await fetch(`${API_BASE}/api/match/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name }),
      });
      const data = await res.json();

      if (data.status === 'matched') {
        setQueueId(data.queueId);
        setGameId(data.gameId);
        setPlayerId(data.playerId);
        setMatchStatus('matched');
      } else if (data.status === 'waiting') {
        setQueueId(data.queueId);
        setMatchStatus('waiting');
        setWaitTime(0);
      } else {
        alert('匹配失败，请重试');
      }
    } catch (e) {
      console.error('Failed to join match:', e);
      alert('连接服务器失败，请确保服务器已启动');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelMatch = async () => {
    if (!queueId) return;
    try {
      await fetch(`${API_BASE}/api/match/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId }),
      });
    } catch (e) {
      console.error('Failed to cancel match:', e);
    }
    setQueueId(null);
    setMatchStatus('idle');
    setWaitTime(0);
  };

  const handleStartGame = () => {
    setMatchStatus('playing');
  };

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
              虚空领域争夺战
            </h1>
            <p className="text-gray-400 mb-8">20x20六边形网格 · 双人实时对战 · 水晶争夺</p>

            {matchStatus === 'idle' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    玩家名称
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="请输入你的名称..."
                    maxLength={20}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinMatch()}
                  />
                </div>

                <button
                  onClick={handleJoinMatch}
                  disabled={isLoading || !inputName.trim()}
                  className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      匹配中...
                    </span>
                  ) : (
                    '开始匹配'
                  )}
                </button>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/30">
                    <div className="text-cyan-400 text-sm font-medium mb-1">游戏规则</div>
                    <ul className="text-gray-400 text-xs space-y-1">
                      <li>· 点击己方基地建造单位</li>
                      <li>· 占领中央水晶获得积分</li>
                      <li>· 摧毁敌方基地获胜</li>
                      <li>· 15分钟倒计时</li>
                    </ul>
                  </div>
                  <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/30">
                    <div className="text-purple-400 text-sm font-medium mb-1">单位介绍</div>
                    <ul className="text-gray-400 text-xs space-y-1">
                      <li>· 攻击塔: 远程高伤害</li>
                      <li>· 冰塔: 减速敌人</li>
                      <li>· 快速兵: 移动迅速</li>
                      <li>· 重型兵: 高血量高攻击</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {matchStatus === 'waiting' && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-cyan-400">{formatWaitTime(waitTime)}</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">正在寻找对手...</h2>
                <p className="text-gray-400 mb-8">玩家: {playerName}</p>
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-8">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  已连接到匹配服务器
                </div>
                <button
                  onClick={handleCancelMatch}
                  className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all"
                >
                  取消匹配
                </button>
              </div>
            )}

            {matchStatus === 'matched' && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">匹配成功!</h2>
                <p className="text-gray-400 mb-2">对局ID: {gameId}</p>
                <p className="text-lg font-medium mb-8">
                  你是 <span className={playerId === 'red' ? 'text-red-400' : 'text-blue-400'}>
                    {playerId === 'red' ? '红方' : '蓝方'}
                  </span>
                </p>
                <button
                  onClick={handleStartGame}
                  className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/20"
                >
                  进入游戏
                </button>
              </div>
            )}

            {matchStatus === 'failed' && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">匹配超时</h2>
                <p className="text-gray-400 mb-8">等待时间过长，请重新匹配</p>
                <button
                  onClick={() => setMatchStatus('idle')}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all"
                >
                  重新匹配
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">🏆</span>
              排行榜
            </h2>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="text-gray-500 text-center py-8">暂无数据</div>
              ) : (
                leaderboard.map((entry: LeaderboardEntry, index: number) => (
                  <div
                    key={entry.playerName}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      entry.playerName === playerName
                        ? 'bg-cyan-500/10 border border-cyan-500/30'
                        : 'bg-gray-900/30'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? 'bg-yellow-500 text-yellow-900'
                          : index === 1
                          ? 'bg-gray-400 text-gray-800'
                          : index === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {entry.playerName}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {entry.wins}胜 {entry.losses}负 · {Math.round(entry.winRate * 100)}%胜率
                      </div>
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
