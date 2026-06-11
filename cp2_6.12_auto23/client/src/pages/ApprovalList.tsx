import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Receipt, Briefcase, ChevronRight, Loader2, Inbox } from 'lucide-react';
import { cn, formatDateTime, FLOW_TYPE_LABELS, FLOW_STATUS_LABELS } from '../lib/utils';
import { getTodos, getMyFlows } from '../api';
import { useStore } from '../store/useStore';
import type { FlowType, FlowStatus, FlowInstance } from '../types';

type TabType = 'todo' | 'done' | 'mine';

interface ApprovalListProps {
  defaultTab?: TabType;
}

const typeIcons: Record<FlowType, typeof Calendar> = {
  leave: Calendar,
  expense: Receipt,
  business: Briefcase,
};

const statusBorderColors: Record<FlowStatus, string> = {
  pending: 'border-yellow-400',
  approved: 'border-green-500',
  rejected: 'border-red-500',
};

const statusBgColors: Record<FlowStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const typeColors: Record<FlowType, string> = {
  leave: 'bg-blue-50 text-blue-700',
  expense: 'bg-purple-50 text-purple-700',
  business: 'bg-orange-50 text-orange-700',
};

function normalizeFlow(data: any): FlowInstance {
  return {
    id: data.id,
    type: data.type,
    title: data.title,
    applicantId: data.applicantId || data.creatorId,
    applicantName: data.applicantName || data.creatorName,
    status: data.status,
    formData: data.formData,
    nodes: data.nodes || [],
    currentNodeIndex: data.currentNodeIndex ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

interface FlowCardProps {
  flow: FlowInstance;
  onClick: () => void;
}

function FlowCard({ flow, onClick }: FlowCardProps) {
  const TypeIcon = typeIcons[flow.type];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border-l-4 p-5 shadow-sm cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
        statusBorderColors[flow.status]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{flow.title}</h3>
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                typeColors[flow.type]
              )}
            >
              <TypeIcon className="w-3 h-3" />
              {FLOW_TYPE_LABELS[flow.type]}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
                statusBgColors[flow.status]
              )}
            >
              {FLOW_STATUS_LABELS[flow.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>申请人：{flow.applicantName}</span>
            <span>提交时间：{formatDateTime(flow.createdAt)}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}

function TabButton({ active, label, count, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {typeof count === 'number' && count > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-medium',
              active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            )}
          >
            {count}
          </span>
        )}
      </span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
      )}
    </button>
  );
}

export default function ApprovalList({ defaultTab = 'todo' }: ApprovalListProps) {
  const navigate = useNavigate();
  const { user, setTodoCount } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [flows, setFlows] = useState<FlowInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ todo: 0, done: 0, mine: 0 });

  const loadFlows = useCallback(async (tab: TabType) => {
    setLoading(true);
    try {
      if (tab === 'todo') {
        const res: any = await getTodos(user.userId);
        const rawList = res.data || [];
        const list = rawList.map(normalizeFlow);
        setFlows(list);
        setCounts((prev) => ({ ...prev, todo: list.length }));
        setTodoCount(list.length);
      } else if (tab === 'mine') {
        const res: any = await getMyFlows(user.userId);
        const rawList = res.data || [];
        const list = rawList.map(normalizeFlow);
        setFlows(list);
        setCounts((prev) => ({ ...prev, mine: list.length }));
        const doneCount = list.filter((f: FlowInstance) => f.status !== 'pending').length;
        setCounts((prev) => ({ ...prev, done: doneCount }));
      } else {
        const res: any = await getMyFlows(user.userId);
        const rawList = res.data || [];
        const list = rawList
          .map(normalizeFlow)
          .filter((f: FlowInstance) => f.status !== 'pending');
        setFlows(list);
      }
    } catch (error) {
      console.error('加载列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user.userId, setTodoCount]);

  useEffect(() => {
    loadFlows(activeTab);
  }, [activeTab, loadFlows]);

  const handleCardClick = (flowId: string) => {
    navigate(`/flows/${flowId}`);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'todo', label: '待办审批' },
    { key: 'done', label: '已办审批' },
    { key: 'mine', label: '我发起的' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">审批列表</h1>
        <p className="mt-1 text-sm text-gray-500">查看和处理所有审批申请</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-2">
          <div className="flex">
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                active={activeTab === tab.key}
                label={tab.label}
                count={counts[tab.key]}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">暂无数据</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === 'todo' ? '当前没有待处理的审批' : '当前没有相关审批记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flows.map((flow) => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onClick={() => handleCardClick(flow.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
