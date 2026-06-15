import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Member,
  Task,
  Family,
  claimTask as apiClaimTask,
  completeTask as apiCompleteTask,
  getFamilyDetails,
} from './api/taskApi';
import { Reward, redeemReward as apiRedeemReward } from './api/rewardApi';
import CreateFamily from './components/CreateFamily';
import FamilyBoard from './components/FamilyBoard';
import TaskList from './components/TaskList';
import RewardShop from './components/RewardShop';

export type Page = 'create-family' | 'board' | 'shop';
export type ToastType = 'success' | 'error' | 'info';

export interface AppContextType {
  familyId: string | null;
  familyName: string;
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  currentMemberId: string | null;
  setCurrentMemberId: (id: string | null) => void;
  showToast: (message: string, type?: ToastType) => void;
  claimTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  animatedMemberId: string | null;
  setPage: (page: Page) => void;
  setFamilyData: (data: {
    familyId: string;
    familyName: string;
    members: Member[];
    tasks: Task[];
    rewards: Reward[];
  }) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
};

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  leaving?: boolean;
}

const generateId = (): string =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

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

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
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
          <button className="btn btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn ${confirmBtnClass}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
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
  const handleNavClick = (targetPage: Page) => {
    if (!hasFamily && targetPage !== 'create-family') return;
    setPage(targetPage);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div
          className="navbar-title"
          onClick={() => handleNavClick(hasFamily ? 'board' : 'create-family')}
        >
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

const ToastContainer: React.FC<{
  toasts: Toast[];
  removeToast: (id: string) => void;
}> = ({ toasts, removeToast }) => {
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

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('create-family');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedMemberId, setAnimatedMemberId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const initApp = async () => {
      const savedFamilyId = localStorage.getItem('familyId');
      if (savedFamilyId) {
        try {
          const details = await getFamilyDetails(savedFamilyId);
          setFamilyId(details.family.id);
          setFamilyName(details.family.name);
          setMembers(details.members);
          setTasks(details.tasks);
          setRewards(details.rewards as Reward[]);
          setCurrentMemberId(
            details.members.length > 0 ? details.members[0].id : null
          );
          setLoading(false);
          setPage('board');
          return;
        } catch {
          localStorage.removeItem('familyId');
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, message, type }]);
      const leaveTimer = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        const removeTimer = setTimeout(() => removeToast(id), 300);
        toastTimersRef.current.set(id + '-remove', removeTimer);
      }, 3000);
      toastTimersRef.current.set(id, leaveTimer);
    },
    [removeToast]
  );

  const triggerMemberAnimation = useCallback((memberId: string) => {
    setAnimatedMemberId(memberId);
    setTimeout(() => {
      setAnimatedMemberId((prev) => (prev === memberId ? null : prev));
    }, 500);
  }, []);

  const handleClaimTask = useCallback(
    async (taskId: string) => {
      if (!familyId || !currentMemberId) {
        showToast('请先选择成员', 'error');
        return;
      }
      try {
        const updatedTask = await apiClaimTask(taskId, currentMemberId, familyId);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t))
        );
        showToast('任务认领成功！', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '认领失败', 'error');
      }
    },
    [familyId, currentMemberId, showToast]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      if (!familyId) return;
      try {
        const result = await apiCompleteTask(taskId, familyId);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? result.task : t))
        );
        setMembers((prev) =>
          prev.map((m) => (m.id === result.member.id ? result.member : m))
        );
        triggerMemberAnimation(result.member.id);
        showToast(`完成任务！获得 ${result.task.points} 积分`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '操作失败', 'error');
      }
    },
    [familyId, showToast, triggerMemberAnimation]
  );

  const handleRedeemReward = useCallback(
    async (rewardId: string) => {
      if (!familyId || !currentMemberId) {
        showToast('请先选择成员', 'error');
        return;
      }
      try {
        const result = await apiRedeemReward(rewardId, currentMemberId, familyId);
        setMembers((prev) =>
          prev.map((m) => (m.id === result.member.id ? result.member : m))
        );
        triggerMemberAnimation(result.member.id);
        showToast(`兑换成功！扣除 ${result.reward.points_cost} 积分`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '兑换失败', 'error');
      }
    },
    [familyId, currentMemberId, showToast, triggerMemberAnimation]
  );

  const setFamilyData = useCallback(
    (data: {
      familyId: string;
      familyName: string;
      members: Member[];
      tasks: Task[];
      rewards: Reward[];
    }) => {
      setFamilyId(data.familyId);
      setFamilyName(data.familyName);
      setMembers(data.members);
      setTasks(data.tasks);
      setRewards(data.rewards);
      setCurrentMemberId(
        data.members.length > 0 ? data.members[0].id : null
      );
    },
    []
  );

  const contextValue: AppContextType = {
    familyId,
    familyName,
    members,
    tasks,
    rewards,
    currentMemberId,
    setCurrentMemberId,
    showToast,
    claimTask: handleClaimTask,
    completeTask: handleCompleteTask,
    redeemReward: handleRedeemReward,
    animatedMemberId,
    setPage,
    setFamilyData,
  };

  const hasFamily = !!familyId;

  const renderPage = () => {
    if (loading) {
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
      return <CreateFamily />;
    }

    switch (page) {
      case 'board':
        return (
          <div className="content">
            <FamilyBoard />
            <TaskList />
          </div>
        );
      case 'shop':
        return (
          <div className="content">
            <RewardShop />
          </div>
        );
      default:
        return (
          <div className="content">
            <FamilyBoard />
            <TaskList />
          </div>
        );
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
