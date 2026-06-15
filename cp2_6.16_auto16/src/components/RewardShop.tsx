import React, { useState, useMemo } from 'react';
import { useAppContext, ConfirmDialog } from '../App';

const RewardShop: React.FC = () => {
  const {
    rewards,
    members,
    currentMemberId,
    redeemReward,
    showToast,
  } = useAppContext();

  const [redeemDialog, setRedeemDialog] = useState<{
    open: boolean;
    rewardId: string | null;
  }>({ open: false, rewardId: null });
  const [isRedeeming, setIsRedeeming] = useState(false);

  const currentMember = useMemo(
    () => members.find(m => m.id === currentMemberId) || null,
    [members, currentMemberId]
  );

  const selectedReward = rewards.find(r => r.id === redeemDialog.rewardId);

  const handleRedeemClick = (reward: typeof rewards[0]) => {
    if (!currentMember) {
      showToast('请先在家庭看板选择一名成员', 'error');
      return;
    }
    if (currentMember.points < reward.points_cost) {
      showToast('积分不足，无法兑换', 'error');
      return;
    }
    setRedeemDialog({ open: true, rewardId: reward.id });
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;
    setIsRedeeming(true);
    try {
      await redeemReward(selectedReward.id);
      setRedeemDialog({ open: false, rewardId: null });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '兑换失败', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  const getRewardEmoji = (reward: typeof rewards[0]): string => {
    if (reward.image_url) return reward.image_url;
    const virtualEmojis = ['🎫', '🎟️', '⭐', '✨', '💫', '🎉', '🥇', '🏆'];
    const physicalEmojis = ['🎁', '🎮', '📚', '🧸', '🍫', '🎨', '⌚', '🎧'];
    const pool = reward.type === 'virtual' ? virtualEmojis : physicalEmojis;
    let hash = 0;
    for (let i = 0; i < reward.id.length; i++) {
      hash = reward.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return pool[Math.abs(hash) % pool.length];
  };

  return (
    <>
      <h1 className="page-title">🛍️ 奖品商店</h1>

      {currentMember && (
        <div className="reward-member-info card">
          <div className="reward-member-left">
            <div className="current-member-avatar">{currentMember.avatar}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{currentMember.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>当前选中成员</div>
            </div>
          </div>
          <div className="reward-member-right">
            <div className="reward-member-points">🏆 {currentMember.points}</div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>可用积分</div>
          </div>
        </div>
      )}

      {!currentMember && (
        <div className="reward-member-hint card">
          👆 请先在家庭看板选择一位成员
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🎁</div>
          <div className="empty-state-text">暂无可兑换奖品</div>
        </div>
      ) : (
        <div className="rewards-grid">
          {rewards.map(reward => {
            const canAfford = currentMember
              ? currentMember.points >= reward.points_cost
              : false;
            return (
              <div key={reward.id} className="reward-card">
                <div className="reward-image">{getRewardEmoji(reward)}</div>
                <div className="reward-title">{reward.title}</div>
                <div className="reward-desc">{reward.description}</div>
                <div className="reward-footer">
                  <span className="reward-cost">{reward.points_cost}分</span>
                  <span
                    className={`reward-type-tag ${reward.type === 'virtual' ? 'virtual' : ''}`}
                  >
                    {reward.type === 'physical' ? '实物' : '虚拟'}
                  </span>
                </div>
                <div style={{ width: '100%', marginTop: 12 }}>
                  <button
                    className="btn btn-redeem"
                    style={{ width: '100%' }}
                    onClick={() => handleRedeemClick(reward)}
                    disabled={!canAfford || !currentMember || isRedeeming}
                    title={!canAfford ? '积分不足' : ''}
                  >
                    {isRedeeming && selectedReward?.id === reward.id
                      ? '兑换中...'
                      : canAfford
                      ? '立即兑换'
                      : '积分不足'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={redeemDialog.open}
        title="确认兑换奖品"
        content={
          selectedReward
            ? `确定使用 ${selectedReward.points_cost} 积分为「${currentMember?.name ?? '成员'}」兑换「${selectedReward.title}」吗？`
            : ''
        }
        confirmText="确认兑换"
        cancelText="取消"
        confirmBtnClass="btn-redeem"
        onConfirm={handleConfirmRedeem}
        onCancel={() => setRedeemDialog({ open: false, rewardId: null })}
      />
    </>
  );
};

export default RewardShop;
