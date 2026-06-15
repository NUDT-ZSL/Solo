import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  MouseEvent,
} from 'react';
import {
  Member,
  Task,
  Difficulty,
  Family,
  createFamily as apiCreateFamily,
  claimTask as apiClaimTask,
  completeTask as apiCompleteTask,
  getFamilyDetails,
  getFamilyMembers as apiGetFamilyMembers,
} from './api/taskApi';
import { Reward, redeemReward as apiRedeemReward } from './api/rewardApi';

type Page = 'create-family' | 'board' | 'shop';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  leaving?: boolean;
}

interface AppContextType {
  familyId: string | null;
  familyName: string;
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  currentMemberId: string | null;
  setCurrentMemberId: (id: string | null) => void;
  refreshMembers: () => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
  claimTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  animatedMemberId: string | null;
}

const AppContext = createContext<AppContextType | null>(null);

const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
};

const AVATAR_OPTIONS = ['👨', '👩', '👧', '👦', '🧑', '👴', '👵', '🧒', '👱', '👸', '🤴', '🧔'];

const generateId = (): string =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

const createRipple = (event: MouseEvent<HTMLButtonElement>): void => {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type !== 'success' ? toast.type : ''} ${
            toast.leaving ? 'leaving' : ''
          }`}
          onAnimationEnd={() => {
            if (toast.leaving) removeToast(toast.id);
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmBtnClass?: string;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  content,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  confirmBtnClass = 'btn-primary',
  children,
}) => {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-content">{content}</p>
        {children}
        <div className="dialog-actions">
          <button
            className="btn btn-cancel"
            onClick={(e) => {
              createRipple(e);
              onCancel();
            }}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${confirmBtnClass}`}
            onClick={(e) => {
              createRipple(e);
              onConfirm();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface MemberSelectorProps {
  members: Member[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MemberSelector: React.FC<MemberSelectorProps> = ({ members, selectedId, onSelect }) => {
  return (
    <div className="member-selector">
      <div className="member-select-list">
        {members.map((member) => (
          <div
            key={member.id}
            className={`member-select-item ${selectedId === member.id ? 'selected' : ''}`}
            onClick={() => onSelect(member.id)}
          >
            <div className="member-avatar" style={{ width: 40, height: 40, fontSize: '1.5rem' }}>
              {member.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{member.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>积分: {member.points}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CreateFamilyFormState {
  name: string;
  members: { name: string; avatar: string }[];
}

const CreateFamilyPage: React.FC = () => {
  const { showToast } = useAppContext();
  const [formState, setFormState] = useState<CreateFamilyFormState>({
    name: '',
    members: [
      { name: '', avatar: '👨' },
      { name: '', avatar: '👩' },
      { name: '', avatar: '👧' },
    ],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!formState.name.trim()) {
      showToast('请输入家庭名称', 'error');
      return;
    }

    const validMembers = formState.members.filter((m) => m.name.trim() !== '');
    if (validMembers.length < 3) {
      showToast('请至少添加3名成员', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const setCtx = (window as unknown as { __setAppState?: (s: Partial<AppState>) => void })
        .__setAppState;
      const setPage = (window as unknown as { __setPage?: (p: Page) => void }).__setPage;

      const result = await apiCreateFamily(
        formState.name.trim(),
        validMembers.map((m) => ({ name: m.name.trim(), avatar: m.avatar }))
      );

      localStorage.setItem('familyId', result.family.id);

      if (setCtx) {
        setCtx({
          familyId: result.family.id,
          familyName: result.family.name,
          members: result.tasks.length > 0 && result.tasks[0].family_id
            ? []
            : [],
          tasks: result.tasks,
          rewards: result.rewards,
          currentMemberId: null,
        });
      }

      if (setCtx) {
        const details = await getFamilyDetails(result.family.id);
        setCtx({
          familyId: details.family.id,
          familyName: details.family.name,
          members: details.members,
          tasks: details.tasks,
          rewards: details.rewards,
          currentMemberId: details.members.length > 0 ? details.members[0].id : null,
        });
      }

      showToast('家庭创建成功！', 'success');
      if (setPage) setPage('board');
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建失败';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateMember = (
    index: number,
    field: 'name' | 'avatar',
    value: string
  ): void => {
    setFormState((prev) => {
      const newMembers = [...prev.members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return { ...prev, members: newMembers };
    });
  };

  const addMember = (): void => {
    setFormState((prev) => ({
      ...prev,
      members: [...prev.members, { name: '', avatar: '🧑' }],
    }));
  };

  const removeMember = (index: number): void => {
    if (formState.members.length <= 3) {
      showToast('至少需要3名成员', 'error');
      return;
    }
    setFormState((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="content">
      <h1 className="page-title" style={{ textAlign: 'center' }}>
        创建你的家庭
      </h1>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">家庭名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="例如：快乐一家人"
            value={formState.name}
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
            maxLength={30}
          />
        </div>

        <div className="form-group">
          <label className="form-label">家庭成员（至少3人）</label>
          {formState.members.map((member, index) => (
            <div key={index}>
              <div className="member-item">
                <input
                  type="text"
                  className="form-input"
                  placeholder={`成员 ${index + 1} 姓名`}
                  value={member.name}
                  onChange={(e) => updateMember(index, 'name', e.target.value)}
                  maxLength={20}
                />
                <button
                  type="button"
                  className="remove-member-btn"
                  onClick={(e) => {
                    createRipple(e);
                    removeMember(index);
                  }}
                  title="移除成员"
                >
                  ×
                </button>
              </div>
              <div className="avatar-picker" style={{ marginBottom: 12 }}>
                {AVATAR_OPTIONS.map((avatar) => (
                  <div
                    key={avatar}
                    className={`avatar-option ${member.avatar === avatar ? 'selected' : ''}`}
                    onClick={() => updateMember(index, 'avatar', avatar)}
                  >
                    {avatar}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="add-member-btn"
            onClick={(e) => {
              createRipple(e);
              addMember();
            }}
          >
            + 添加成员
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary submit-btn"
          disabled={submitting}
          onClick={createRipple}
        >
          {submitting ? '创建中...' : '创建家庭'}
        </button>
      </form>
    </div>
  );
};

interface MemberCardProps {
  member: Member;
  rank: number;
  selected: boolean;
  animated: boolean;
  onClick: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, rank, selected, animated, onClick }) => {
  const rankClass = rank <= 3 ? `rank-${rank}` : '';

  return (
    <div
      className={`member-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {rankClass && <div className={`rank-badge ${rankClass}`}>{rank}</div>}
      <div className="member-avatar">{member.avatar}</div>
      <div className="member-name">{member.name}</div>
      <div className={`member-points ${animated ? 'animate' : ''}`}>
        🏆 {member.points}
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  onClaim: () => void;
  onComplete: () => void;
  claimerName?: string;
  claimerAvatar?: string;
  canComplete: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClaim,
  onComplete,
  claimerName,
  claimerAvatar,
  canComplete,
}) => {
  const { currentMemberId } = useAppContext();
  const isClaimedByCurrent = task.claimed_by === currentMemberId;

  return (
    <div className={`task-card ${task.difficulty} ${task.completed ? 'completed' : ''}`}>
      <div className="task-info">
        <div className="task-title">
          {task.title}
          {task.completed && <span style={{ marginLeft: 8, color: '#4caf50' }}>✓ 已完成</span>}
        </div>
        <div className="task-desc">{task.description}</div>
      </div>
      <div className="task-meta">
        <span className={`task-difficulty-tag ${task.difficulty}`}>
          {DIFFICULTY_LABELS[task.difficulty]}
        </span>
        <span className="task-points">+{task.points}分</span>
        {task.claimed_by && !task.completed && (
          <div className="task-claimer">
            <div className="task-claimer-avatar">{claimerAvatar ?? '🧑'}</div>
            <span>{claimerName ?? '已认领'}</span>
          </div>
        )}
        {!task.completed && (
          <div className="task-actions">
            {!task.claimed_by && (
              <button
                className="btn btn-claim"
                onClick={(e) => {
                  createRipple(e);
                  onClaim();
                }}
                disabled={!currentMemberId}
              >
                认领
              </button>
            )}
            {task.claimed_by && (
              <button
                className="btn btn-complete"
                onClick={(e) => {
                  createRipple(e);
                  onComplete();
                }}
                disabled={!canComplete || !isClaimedByCurrent}
                title={!isClaimedByCurrent ? '只有认领人可以完成' : ''}
              >
                完成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const BoardPage: React.FC = () => {
  const {
    familyName,
    members,
    tasks,
    currentMemberId,
    setCurrentMemberId,
    claimTask,
    completeTask,
    animatedMemberId,
    showToast,
  } = useAppContext();

  const [claimDialog, setClaimDialog] = useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    taskId: string | null;
    title: string;
    content: string;
  }>({ open: false, taskId: null, title: '', content: '' });

  const [selectedMemberForClaim, setSelectedMemberForClaim] = useState<string | null>(null);

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const handleClaimClick = (taskId: string): void => {
    if (currentMemberId) {
      setConfirmDialog({
        open: true,
        taskId,
        title: '确认认领任务',
        content: `确定要由「${memberMap.get(currentMemberId)?.name ?? '当前成员'}」认领此任务吗？`,
      });
      setSelectedMemberForClaim(currentMemberId);
    } else {
      setClaimDialog({ open: true, taskId });
      setSelectedMemberForClaim(members.length > 0 ? members[0].id : null);
    }
  };

  const handleConfirmClaim = async (): Promise<void> => {
    const memberId = selectedMemberForClaim;
    const taskId = confirmDialog.taskId ?? claimDialog.taskId;
    if (!memberId || !taskId) {
      showToast('请选择成员', 'error');
      return;
    }
    setCurrentMemberId(memberId);
    await claimTask(taskId);
    setClaimDialog({ open: false, taskId: null });
    setConfirmDialog({ open: false, taskId: null, title: '', content: '' });
    setSelectedMemberForClaim(null);
  };

  const handleCompleteClick = (task: Task): void => {
    const claimer = memberMap.get(task.claimed_by ?? '');
    setConfirmDialog({
      open: true,
      taskId: task.id,
      title: '确认完成任务',
      content: `确定「${claimer?.name ?? '成员'}」已完成此任务？将获得 ${task.points} 积分。`,
    });
  };

  const handleConfirmComplete = async (): Promise<void> => {
    const taskId = confirmDialog.taskId;
    if (!taskId) return;
    await completeTask(taskId);
    setConfirmDialog({ open: false, taskId: null, title: '', content: '' });
  };

  const currentMember = members.find((m) => m.id === currentMemberId);

  return (
    <div className="content">
      <div className="family-header">
        <h1 className="family-name">🏠 {familyName}</h1>
        {currentMember && (
          <div className="current-member-info">
            <div className="current-member-avatar">{currentMember.avatar}</div>
            <span style={{ fontWeight: 500 }}>{currentMember.name}</span>
            <span style={{ color: '#f57c00', fontWeight: 600 }}>🏆 {currentMember.points}</span>
          </div>
        )}
      </div>

      <div className="members-section">
        <h2 className="section-title">🏆 成员排行榜</h2>
        {sortedMembers.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
            <div className="empty-state-text">暂无成员数据</div>
          </div>
        ) : (
          <div className="members-grid">
            {sortedMembers.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                rank={index + 1}
                selected={member.id === currentMemberId}
                animated={member.id === animatedMemberId}
                onClick={() => setCurrentMemberId(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="tasks-section">
        <h2 className="section-title">📋 任务列表</h2>
        {tasks.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">暂无任务</div>
          </div>
        ) : (
          <div className="tasks-list">
            {tasks.map((task) => {
              const claimer = task.claimed_by ? memberMap.get(task.claimed_by) : undefined;
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClaim={() => handleClaimClick(task.id)}
                  onComplete={() => handleCompleteClick(task)}
                  claimerName={claimer?.name}
                  claimerAvatar={claimer?.avatar}
                  canComplete={!!task.claimed_by}
                />
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={claimDialog.open}
        title="选择认领成员"
        content="请选择要认领此任务的家庭成员："
        confirmText="确认认领"
        cancelText="取消"
        confirmBtnClass="btn-claim"
        onConfirm={handleConfirmClaim}
        onCancel={() => {
          setClaimDialog({ open: false, taskId: null });
          setSelectedMemberForClaim(null);
        }}
      >
        <MemberSelector
          members={members}
          selectedId={selectedMemberForClaim}
          onSelect={setSelectedMemberForClaim}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDialog.open && !claimDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        confirmText={confirmDialog.title.includes('完成') ? '确认完成' : '确认认领'}
        cancelText="取消"
        confirmBtnClass={confirmDialog.title.includes('完成') ? 'btn-complete' : 'btn-claim'}
        onConfirm={
          confirmDialog.title.includes('完成') ? handleConfirmComplete : handleConfirmClaim
        }
        onCancel={() =>
          setConfirmDialog({ open: false, taskId: null, title: '', content: '' })
        }
      />
    </div>
  );
};

interface RewardCardProps {
  reward: Reward;
  onRedeem: () => void;
  canAfford: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeem, canAfford }) => {
  const fallbackEmojis: Record<string, string> = {
    physical: '🎁',
    virtual: '🎮',
  };

  return (
    <div className="reward-card">
      <div className="reward-image">
        {reward.image_url ? (
          <img src={reward.image_url} alt={reward.title} />
        ) : (
          fallbackEmojis[reward.type] ?? '🎁'
        )}
      </div>
      <div className="reward-title">{reward.title}</div>
      <div className="reward-desc">{reward.description}</div>
      <div className="reward-footer">
        <span className="reward-cost">{reward.points_cost}分</span>
        <span className={`reward-type-tag ${reward.type === 'virtual' ? 'virtual' : ''}`}>
          {reward.type === 'physical' ? '实物' : '虚拟'}
        </span>
      </div>
      <div style={{ width: '100%', marginTop: 12 }}>
        <button
          className="btn btn-redeem"
          style={{ width: '100%' }}
          onClick={(e) => {
            createRipple(e);
            onRedeem();
          }}
          disabled={!canAfford}
          title={!canAfford ? '积分不足' : ''}
        >
          {canAfford ? '立即兑换' : '积分不足'}
        </button>
      </div>
    </div>
  );
};

const ShopPage: React.FC = () => {
  const { rewards, members, currentMemberId, redeemReward, showToast } = useAppContext();

  const [redeemDialog, setRedeemDialog] = useState<{
    open: boolean;
    rewardId: string | null;
    mode: 'select' | 'confirm';
  }>({ open: false, rewardId: null, mode: 'select' });

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(currentMemberId);

  const selectedReward = rewards.find((r) => r.id === redeemDialog.rewardId);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const handleRedeemClick = (reward: Reward): void => {
    const member = memberMap.get(currentMemberId ?? '');
    if (member && member.points >= reward.points_cost) {
      setRedeemDialog({ open: true, rewardId: reward.id, mode: 'confirm' });
      setSelectedMemberId(currentMemberId);
    } else if (currentMemberId) {
      showToast('积分不足，无法兑换', 'error');
    } else {
      setRedeemDialog({ open: true, rewardId: reward.id, mode: 'select' });
      setSelectedMemberId(members.length > 0 ? members[0].id : null);
    }
  };

  const handleConfirmRedeem = async (): Promise<void> => {
    const rewardId = redeemDialog.rewardId;
    const memberId = selectedMemberId;
    if (!rewardId || !memberId) {
      showToast('请选择成员', 'error');
      return;
    }

    const member = memberMap.get(memberId);
    const reward = rewards.find((r) => r.id === rewardId);
    if (!member || !reward) return;

    if (member.points < reward.points_cost) {
      showToast('该成员积分不足', 'error');
      if (redeemDialog.mode === 'confirm') {
        setRedeemDialog((prev) => ({ ...prev, mode: 'select' }));
      }
      return;
    }

    await redeemReward(rewardId);
    setRedeemDialog({ open: false, rewardId: null, mode: 'select' });
  };

  const renderDialog = (): React.ReactNode => {
    if (!redeemDialog.open || !selectedReward) return null;

    if (redeemDialog.mode === 'select') {
      return (
        <ConfirmDialog
          open={true}
          title="选择兑换成员"
          content={`兑换「${selectedReward.title}」需要 ${selectedReward.points_cost} 积分，请选择成员：`}
          confirmText="确认兑换"
          cancelText="取消"
          confirmBtnClass="btn-redeem"
          onConfirm={handleConfirmRedeem}
          onCancel={() => setRedeemDialog({ open: false, rewardId: null, mode: 'select' })}
        >
          <MemberSelector
            members={members}
            selectedId={selectedMemberId}
            onSelect={setSelectedMemberId}
          />
        </ConfirmDialog>
      );
    }

    return (
      <ConfirmDialog
        open={true}
        title="确认兑换奖品"
        content={`确定使用 ${selectedReward.points_cost} 积分，为「${selectedMember?.name ?? '成员'}」兑换「${selectedReward.title}」吗？`}
        confirmText="确认兑换"
        cancelText="取消"
        confirmBtnClass="btn-redeem"
        onConfirm={handleConfirmRedeem}
        onCancel={() => setRedeemDialog({ open: false, rewardId: null, mode: 'select' })}
      />
    );
  };

  return (
    <div className="content">
      <h1 className="page-title">🛍️ 奖品商店</h1>

      {currentMember && (
        <div className="card" style={{ padding: '16px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="current-member-avatar">{currentMember.avatar}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{currentMember.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>当前选中成员</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f57c00' }}>
                🏆 {currentMember.points}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>可用积分</div>
            </div>
          </div>
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🎁</div>
          <div className="empty-state-text">暂无可兑换奖品</div>
        </div>
      ) : (
        <div className="rewards-grid">
          {rewards.map((reward) => {
            const member = currentMemberId ? memberMap.get(currentMemberId) : undefined;
            const canAfford = member ? member.points >= reward.points_cost : false;
            return (
              <RewardCard
                key={reward.id}
                reward={reward}
                onRedeem={() => handleRedeemClick(reward)}
                canAfford={canAfford}
              />
            );
          })}
        </div>
      )}

      {renderDialog()}
    </div>
  );
};

interface NavbarProps {
  page: Page;
  setPage: (page: Page) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  hasFamily: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  page,
  setPage,
  mobileMenuOpen,
  setMobileMenuOpen,
  hasFamily,
}) => {
  const handleNavClick = (targetPage: Page): void => {
    if (!hasFamily && targetPage !== 'create-family') return;
    setPage(targetPage);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-title" onClick={() => handleNavClick(hasFamily ? 'board' : 'create-family')}>
          🏠 家庭任务
        </div>
        {hasFamily && (
          <>
            <div className="navbar-links">
              <span
                className={`navbar-link ${page === 'board' ? 'active' : ''}`}
                onClick={() => handleNavClick('board')}
              >
                家庭看板
              </span>
              <span
                className={`navbar-link ${page === 'shop' ? 'active' : ''}`}
                onClick={() => handleNavClick('shop')}
              >
                奖品商店
              </span>
            </div>
            <div
              className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          </>
        )}
      </nav>
      {hasFamily && (
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <span
            className={`navbar-link ${page === 'board' ? 'active' : ''}`}
            onClick={() => handleNavClick('board')}
          >
            📊 家庭看板
          </span>
          <span
            className={`navbar-link ${page === 'shop' ? 'active' : ''}`}
            onClick={() => handleNavClick('shop')}
          >
            🛍️ 奖品商店
          </span>
        </div>
      )}
    </>
  );
};

interface AppState {
  familyId: string | null;
  familyName: string;
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  currentMemberId: string | null;
  loading: boolean;
  animatedMemberId: string | null;
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('create-family');
  const [appState, setAppState] = useState<AppState>({
    familyId: null,
    familyName: '',
    members: [],
    tasks: [],
    rewards: [],
    currentMemberId: null,
    loading: true,
    animatedMemberId: null,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    (window as unknown as { __setAppState?: (s: Partial<AppState>) => void }).__setAppState = (
      s: Partial<AppState>
    ) => setAppState((prev) => ({ ...prev, ...s }));
    (window as unknown as { __setPage?: (p: Page) => void }).__setPage = setPage;

    return () => {
      delete (window as unknown as { __setAppState?: unknown }).__setAppState;
      delete (window as unknown as { __setPage?: unknown }).__setPage;
    };
  }, []);

  useEffect(() => {
    const initApp = async (): Promise<void> => {
      const savedFamilyId = localStorage.getItem('familyId');
      if (savedFamilyId) {
        try {
          const details = await getFamilyDetails(savedFamilyId);
          setAppState({
            familyId: details.family.id,
            familyName: details.family.name,
            members: details.members,
            tasks: details.tasks,
            rewards: details.rewards,
            currentMemberId: details.members.length > 0 ? details.members[0].id : null,
            loading: false,
            animatedMemberId: null,
          });
          setPage('board');
          return;
        } catch {
          localStorage.removeItem('familyId');
        }
      }
      setAppState((prev) => ({ ...prev, loading: false }));
    };

    initApp();
  }, []);

  const removeToast = useCallback((id: string): void => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success'): void => {
      const id = generateId();
      const newToast: Toast = { id, message, type };
      setToasts((prev) => [...prev, newToast]);

      const leaveTimer = setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        const removeTimer = setTimeout(() => {
          removeToast(id);
        }, 300);
        toastTimersRef.current.set(id + '-remove', removeTimer);
      }, 3000);
      toastTimersRef.current.set(id, leaveTimer);
    },
    [removeToast]
  );

  const refreshMembers = useCallback(async (): Promise<void> => {
    if (!appState.familyId) return;
    try {
      const updatedMembers = await apiGetFamilyMembers(appState.familyId);
      setAppState((prev) => ({ ...prev, members: updatedMembers }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新成员失败';
      showToast(message, 'error');
    }
  }, [appState.familyId, showToast]);

  const triggerMemberAnimation = useCallback((memberId: string): void => {
    setAppState((prev) => ({ ...prev, animatedMemberId: memberId }));
    setTimeout(() => {
      setAppState((prev) =>
        prev.animatedMemberId === memberId ? { ...prev, animatedMemberId: null } : prev
      );
    }, 500);
  }, []);

  const claimTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!appState.familyId || !appState.currentMemberId) {
        showToast('请先选择成员', 'error');
        return;
      }
      try {
        const updatedTask = await apiClaimTask(
          taskId,
          appState.currentMemberId,
          appState.familyId
        );
        setAppState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
        }));
        showToast('任务认领成功！', 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : '认领失败';
        showToast(message, 'error');
      }
    },
    [appState.familyId, appState.currentMemberId, showToast]
  );

  const completeTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!appState.familyId) return;
      try {
        const result = await apiCompleteTask(taskId, appState.familyId);
        setAppState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? result.task : t)),
          members: prev.members.map((m) => (m.id === result.member.id ? result.member : m)),
        }));
        triggerMemberAnimation(result.member.id);
        showToast(`完成任务！获得 ${result.task.points} 积分`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : '操作失败';
        showToast(message, 'error');
      }
    },
    [appState.familyId, showToast, triggerMemberAnimation]
  );

  const redeemReward = useCallback(
    async (rewardId: string): Promise<void> => {
      if (!appState.familyId || !appState.currentMemberId) {
        showToast('请先选择成员', 'error');
        return;
      }
      try {
        const result = await apiRedeemReward(
          rewardId,
          appState.currentMemberId,
          appState.familyId
        );
        setAppState((prev) => ({
          ...prev,
          members: prev.members.map((m) => (m.id === result.member.id ? result.member : m)),
        }));
        triggerMemberAnimation(result.member.id);
        showToast(`兑换成功！扣除 ${result.reward.points_cost} 积分`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : '兑换失败';
        showToast(message, 'error');
      }
    },
    [appState.familyId, appState.currentMemberId, showToast, triggerMemberAnimation]
  );

  const contextValue: AppContextType = {
    familyId: appState.familyId,
    familyName: appState.familyName,
    members: appState.members,
    tasks: appState.tasks,
    rewards: appState.rewards,
    currentMemberId: appState.currentMemberId,
    setCurrentMemberId: (id): void =>
      setAppState((prev) => ({ ...prev, currentMemberId: id })),
    refreshMembers,
    showToast,
    claimTask,
    completeTask,
    redeemReward,
    animatedMemberId: appState.animatedMemberId,
  };

  const hasFamily = !!appState.familyId;

  const renderPage = (): React.ReactNode => {
    if (appState.loading) {
      return (
        <div className="content">
          <div className="loading card">
            <div className="spinner" style={{ marginRight: 12 }}></div>
            <span>加载中...</span>
          </div>
        </div>
      );
    }

    if (!hasFamily || page === 'create-family') {
      return <CreateFamilyPage />;
    }

    switch (page) {
      case 'board':
        return <BoardPage />;
      case 'shop':
        return <ShopPage />;
      default:
        return <BoardPage />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Navbar
        page={page}
        setPage={setPage}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        hasFamily={hasFamily}
      />
      {renderPage()}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </AppContext.Provider>
  );
};

export default App;
