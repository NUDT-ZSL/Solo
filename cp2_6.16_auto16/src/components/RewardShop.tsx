import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Reward, redeemReward } from '../api/rewardApi';
import { Member } from '../api/taskApi';

interface RewardShopProps {
  rewards: Reward[];
  members: Member[];
  currentMemberId: string | null;
  familyId: string;
  onRedeemSuccess: () => Promise<void>;
  showToast: (message: string) => void;
}

const RewardShop: React.FC<RewardShopProps> = ({
  rewards,
  members,
  currentMemberId,
  familyId,
  onRedeemSuccess,
  showToast,
}) => {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [displayPoints, setDisplayPoints] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentMember = useMemo(
    () => members.find((m) => m.id === currentMemberId) || null,
    [members, currentMemberId]
  );

  useEffect(() => {
    const newDisplayPoints: Record<string, number> = {};
    members.forEach((m) => {
      newDisplayPoints[m.id] = m.points;
    });
    setDisplayPoints((prev) => {
      const result = { ...prev };
      members.forEach((m) => {
        if (prev[m.id] !== undefined && prev[m.id] !== m.points) {
          animatePoints(m.id, prev[m.id], m.points);
        } else {
          result[m.id] = m.points;
        }
      });
      return { ...prev, ...newDisplayPoints };
    });
  }, [members]);

  const animatePoints = (memberId: string, from: number, to: number) => {
    const duration = 500;
    const startTime = performance.now();
    const diff = to - from;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * easeProgress);
      setDisplayPoints((prev) => ({ ...prev, [memberId]: current }));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  const getRewardEmoji = (reward: Reward): string => {
    if (reward.image_url) {
      return reward.image_url;
    }
    const virtualEmojis = ['🎫', '🎟️', '⭐', '✨', '💫', '🎉', '🥇', '🏆'];
    const physicalEmojis = ['🎁', '🎮', '📚', '🧸', '🍫', '🎨', '⌚', '🎧'];
    const pool = reward.type === 'virtual' ? virtualEmojis : physicalEmojis;
    let hash = 0;
    for (let i = 0; i < reward.id.length; i++) {
      hash = reward.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return pool[Math.abs(hash) % pool.length];
  };

  const handleRedeemClick = (reward: Reward) => {
    if (!currentMember || isRedeeming) return;
    if (currentMember.points < reward.points_cost) return;
    setSelectedReward(reward);
    setShowConfirmDialog(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !currentMember) return;

    setIsRedeeming(true);
    try {
      await redeemReward(selectedReward.id, currentMember.id, familyId);
      setShowConfirmDialog(false);
      setSelectedReward(null);
      showToast(`🎉 兑换成功！已获得"${selectedReward.title}"`);
      await onRedeemSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : '兑换失败，请重试';
      showToast(`❌ ${message}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCancelRedeem = () => {
    if (isRedeeming) return;
    setShowConfirmDialog(false);
    setSelectedReward(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🏪 积分兑换商店</h2>
        {currentMember ? (
          <div style={styles.memberInfo}>
            <div style={styles.memberAvatar}>{currentMember.avatar}</div>
            <div style={styles.memberDetails}>
              <span style={styles.memberName}>{currentMember.name}</span>
              <span style={styles.memberPoints}>
                <span style={styles.pointsLabel}>积分：</span>
                <span style={styles.pointsValue}>
                  {displayPoints[currentMember.id] ?? currentMember.points}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div style={styles.noMemberHint}>👆 请先选择一位家庭成员</div>
        )}
      </div>

      <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
        {rewards.map((reward) => {
          const canRedeem = currentMember && currentMember.points >= reward.points_cost;
          return (
            <div key={reward.id} style={styles.card}>
              <div style={styles.rewardIcon}>{getRewardEmoji(reward)}</div>
              <h3 style={styles.rewardTitle}>{reward.title}</h3>
              <p style={styles.rewardDesc}>{reward.description}</p>
              <div style={styles.rewardTags}>
                <span
                  style={{
                    ...styles.typeTag,
                    ...(reward.type === 'virtual' ? styles.typeVirtual : styles.typePhysical),
                  }}
                >
                  {reward.type === 'virtual' ? '虚拟' : '实物'}
                </span>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.costLabel}>
                  <span style={styles.costValue}>{reward.points_cost}</span>
                  <span style={styles.costUnit}> 积分</span>
                </span>
                <button
                  style={{
                    ...styles.redeemBtn,
                    ...(!canRedeem || !currentMember ? styles.redeemBtnDisabled : {}),
                    ...(isRedeeming && selectedReward?.id === reward.id ? styles.redeemBtnLoading : {}),
                  }}
                  onClick={() => handleRedeemClick(reward)}
                  disabled={!canRedeem || !currentMember || isRedeeming}
                >
                  {isRedeeming && selectedReward?.id === reward.id ? '兑换中...' : '兑换'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showConfirmDialog && selectedReward && currentMember && (
        <div style={styles.dialogOverlay} onClick={handleCancelRedeem}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogHeader}>
              <div style={styles.dialogRewardIcon}>{getRewardEmoji(selectedReward)}</div>
              <h3 style={styles.dialogTitle}>确认兑换</h3>
            </div>
            <div style={styles.dialogBody}>
              <p style={styles.dialogRewardName}>{selectedReward.title}</p>
              <p style={styles.dialogRewardDesc}>{selectedReward.description}</p>
              <div style={styles.dialogCostInfo}>
                <span>将消耗：</span>
                <span style={styles.dialogCostPoints}>{selectedReward.points_cost} 积分</span>
              </div>
              <div style={styles.dialogMemberInfo}>
                <span>当前积分：</span>
                <span style={styles.dialogMemberPoints}>{currentMember.points} 积分</span>
              </div>
              <div style={styles.dialogRemainingInfo}>
                <span>兑换后剩余：</span>
                <span style={styles.dialogRemainingPoints}>
                  {currentMember.points - selectedReward.points_cost} 积分
                </span>
              </div>
            </div>
            <div style={styles.dialogActions}>
              <button
                style={styles.cancelBtn}
                onClick={handleCancelRedeem}
                disabled={isRedeeming}
              >
                取消
              </button>
              <button
                style={{
                  ...styles.confirmBtn,
                  ...(isRedeeming ? styles.confirmBtnLoading : {}),
                }}
                onClick={handleConfirmRedeem}
                disabled={isRedeeming}
              >
                {isRedeeming ? '处理中...' : '确认兑换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)',
    borderRadius: '12px',
    border: '1px solid #ffe082',
  },
  memberAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  memberDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  memberName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  memberPoints: {
    fontSize: '14px',
    color: '#666',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  pointsLabel: {
    color: '#888',
  },
  pointsValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ff8f00',
    transition: 'transform 0.5s ease',
    display: 'inline-block',
  },
  noMemberHint: {
    padding: '12px 20px',
    background: '#f5f5f5',
    borderRadius: '12px',
    color: '#888',
    fontSize: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 200px)',
    gap: '24px',
    justifyContent: 'center',
  },
  gridMobile: {
    gridTemplateColumns: 'repeat(2, 200px)',
    gap: '16px',
  },
  card: {
    width: '200px',
    height: '240px',
    borderRadius: '12px',
    background: '#ffffff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
  },
  rewardIcon: {
    fontSize: '48px',
    marginBottom: '8px',
    lineHeight: 1,
  },
  rewardTitle: {
    margin: '4px 0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  rewardDesc: {
    margin: '4px 0 8px',
    fontSize: '12px',
    color: '#888',
    textAlign: 'center',
    lineHeight: 1.4,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  rewardTags: {
    marginBottom: '12px',
    display: 'flex',
    gap: '6px',
  },
  typeTag: {
    padding: '2px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
  },
  typeVirtual: {
    background: '#e3f2fd',
    color: '#1976d2',
  },
  typePhysical: {
    background: '#fce4ec',
    color: '#c2185b',
  },
  cardFooter: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  costLabel: {
    display: 'flex',
    alignItems: 'baseline',
  },
  costValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ff8f00',
  },
  costUnit: {
    fontSize: '12px',
    color: '#999',
  },
  redeemBtn: {
    padding: '6px 16px',
    background: '#ff8f00',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.1s ease',
  },
  redeemBtnDisabled: {
    background: '#cccccc',
    cursor: 'not-allowed',
  },
  redeemBtnLoading: {
    background: '#ffb74d',
    cursor: 'progress',
  },
  dialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  dialog: {
    width: '100%',
    maxWidth: '360px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    animation: 'dialogFadeIn 0.2s ease',
  },
  dialogHeader: {
    padding: '24px 24px 16px',
    background: 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)',
    textAlign: 'center',
  },
  dialogRewardIcon: {
    fontSize: '56px',
    marginBottom: '8px',
  },
  dialogTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  dialogBody: {
    padding: '20px 24px',
  },
  dialogRewardName: {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  dialogRewardDesc: {
    margin: '0 0 16px',
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
  },
  dialogCostInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#fff3e0',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '14px',
  },
  dialogCostPoints: {
    fontWeight: 700,
    color: '#e65100',
  },
  dialogMemberInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '14px',
  },
  dialogMemberPoints: {
    fontWeight: 600,
    color: '#333',
  },
  dialogRemainingInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#e8f5e9',
    borderRadius: '8px',
    fontSize: '14px',
  },
  dialogRemainingPoints: {
    fontWeight: 700,
    color: '#2e7d32',
  },
  dialogActions: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px 24px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 16px',
    background: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  confirmBtn: {
    flex: 1,
    padding: '10px 16px',
    background: '#ff8f00',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  confirmBtnLoading: {
    background: '#ffb74d',
    cursor: 'progress',
  },
};

export default RewardShop;
