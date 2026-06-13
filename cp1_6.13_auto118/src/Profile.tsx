import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Reward, PointsHistory } from './types';
import { getPointsHistory, getRewards, redeemReward } from './api';

interface ProfileProps {
  user: User | null;
  onPointsChange: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function Profile({ user, onPointsChange, showToast }: ProfileProps) {
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemTarget, setRedeemTarget] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([getPointsHistory(), getRewards()]);
      setHistory(h);
      setRewards(r);
    } catch {
      console.error('Failed to load profile data');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [user?.points]);

  const nextLevelPoints = 200;
  const progressPercent = useMemo(() => {
    if (!user) return 0;
    return Math.min(100, (user.points / nextLevelPoints) * 100);
  }, [user]);

  const handleRedeem = async () => {
    if (!redeemTarget || redeeming) return;

    setRedeeming(true);
    try {
      await redeemReward(redeemTarget.id);
      showToast(`兑换成功！您已获得 ${redeemTarget.name}`);
      onPointsChange();
      setRedeemTarget(null);
    } catch (err) {
      showToast('积分不足或兑换失败', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container">
      <h1 className="page-title font-display">我的积分</h1>

      <div className="profile-points-section">
        <div className="profile-points-label">当前积分</div>
        <div className="profile-points-value font-display" key={animKey}>
          {user?.points ?? 0}
        </div>
        <div className="profile-level">{user?.level ?? '普通会员'}</div>

        <div className="progress-container">
          <div
            className="progress-bar"
            key={animKey}
            style={{ ['--progress' as any]: `${progressPercent}%`, width: `${progressPercent}%` }}
          />
        </div>
        <div className="progress-label">
          <span>当前等级</span>
          <span>下一等级还需 {Math.max(0, nextLevelPoints - (user?.points ?? 0))} 积分</span>
        </div>
      </div>

      <h2 className="section-title font-display">积分历史</h2>
      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-item" style={{ justifyContent: 'center', color: '#8d6e63' }}>
            暂无积分记录
          </div>
        ) : (
          history.map((h) => (
            <div key={h.id} className="history-item">
              <div className="history-info">
                <div className="history-desc">{h.description}</div>
                <div className="history-date">{formatDate(h.createdAt)}</div>
              </div>
              <div className={`history-points ${h.type}`}>
                {h.type === 'earn' ? '+' : '-'}
                {h.points}
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="section-title font-display">可兑换奖励</h2>
      <div className="reward-grid">
        {rewards.map((r) => {
          const canRedeem = (user?.points ?? 0) >= r.points;
          return (
            <div key={r.id} className="reward-card">
              <img
                src={r.image}
                alt={r.name}
                className="reward-image"
                loading="lazy"
              />
              <div className="reward-body">
                <h3 className="reward-name font-display">{r.name}</h3>
                <p className="reward-desc">{r.description}</p>
                <div className="reward-points">{r.points} 积分</div>
                <button
                  className="reward-redeem-btn"
                  onClick={() => setRedeemTarget(r)}
                  disabled={!canRedeem}
                >
                  {canRedeem ? '立即兑换' : '积分不足'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {redeemTarget && (
        <div className="modal-overlay" onClick={() => !redeeming && setRedeemTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title font-display">确认兑换</h3>
            <p className="modal-desc">
              您确定要用 <strong>{redeemTarget.points}</strong> 积分兑换
              <strong> {redeemTarget.name}</strong> 吗？
              <br />
              当前积分：{user?.points ?? 0}
              <br />
              兑换后剩余：{(user?.points ?? 0) - redeemTarget.points}
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setRedeemTarget(null)}
                disabled={redeeming}
              >
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={handleRedeem}
                disabled={redeeming}
              >
                {redeeming ? '兑换中...' : '确认兑换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
