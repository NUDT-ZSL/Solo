import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent, useTransformComponent } from 'react-zoom-pan-pinch';
import {
  Calendar,
  Receipt,
  Briefcase,
  User,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import {
  cn,
  formatDateTime,
  formatDate,
  FLOW_TYPE_LABELS,
  FLOW_STATUS_LABELS,
  NODE_STATUS_LABELS,
} from '../lib/utils';
import { getFlow, approveFlow, rejectFlow } from '../api';
import { useStore } from '../store/useStore';
import type {
  FlowInstance,
  FlowType,
  FlowStatus,
  FlowNode,
  LeaveForm,
  ExpenseForm,
  BusinessForm,
  NodeStatus,
} from '../types';

const typeIcons: Record<FlowType, typeof Calendar> = {
  leave: Calendar,
  expense: Receipt,
  business: Briefcase,
};

const statusColors: Record<FlowStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const typeColors: Record<FlowType, string> = {
  leave: 'bg-blue-50 text-blue-700 border-blue-200',
  expense: 'bg-purple-50 text-purple-700 border-purple-200',
  business: 'bg-orange-50 text-orange-700 border-orange-200',
};

const nodeDotColors: Record<NodeStatus, string> = {
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  pending: 'bg-gray-300',
  skipped: 'bg-gray-300',
};

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}

function InfoItem({ label, value, full }: InfoItemProps) {
  return (
    <div className={cn('flex gap-3 py-2', full && 'sm:col-span-2')}>
      <span className="text-sm text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{value || '-'}</span>
    </div>
  );
}

interface TimelineItemProps {
  node: FlowNode;
  isCurrent: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function TimelineItem({ node, isCurrent, isLast, expanded, onToggle }: TimelineItemProps) {
  const hasComment = !!node.comment;
  const handledAt = (node as any).handledAt || node.approvedAt;
  const handlerName = (node as any).handlerName || node.approverName || '待定';

  return (
    <div className="relative pl-8 pb-6">
      {!isLast && (
        <div
          className={cn(
            'absolute left-[11px] top-6 w-0.5 h-full',
            node.status === 'approved'
              ? 'bg-green-300'
              : node.status === 'rejected'
              ? 'bg-red-300'
              : 'bg-gray-200'
          )}
        />
      )}
      <div className="absolute left-0 top-1">
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white',
            nodeDotColors[node.status]
          )}
        >
          {node.status === 'approved' && <Check className="w-3.5 h-3.5 text-white" />}
          {node.status === 'rejected' && <X className="w-3.5 h-3.5 text-white" />}
          {(node.status === 'pending' || node.status === 'skipped') && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg border p-4 transition-all cursor-pointer',
          isCurrent && node.status === 'pending'
            ? 'border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-100'
            : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
        )}
        onClick={hasComment ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{node.name}</span>
            {isCurrent && node.status === 'pending' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-600 text-white">
                <Clock className="w-3 h-3" />
                当前节点
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
                node.status === 'approved' && 'bg-green-50 text-green-700',
                node.status === 'rejected' && 'bg-red-50 text-red-700',
                node.status === 'pending' && 'bg-gray-100 text-gray-600',
                node.status === 'skipped' && 'bg-gray-100 text-gray-400'
              )}
            >
              {NODE_STATUS_LABELS[node.status]}
            </span>
          </div>
          {hasComment && (
            <div className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {handlerName}
          </span>
          {handledAt && <span>· {formatDateTime(handledAt)}</span>}
        </div>

        {hasComment && (
          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: expanded ? 200 : 0,
              opacity: expanded ? 1 : 0,
            }}
          >
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-700 bg-gray-50 rounded-md p-3 leading-relaxed">
                {node.comment}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagramToolbar() {
  const { zoomIn, zoomOut, resetTransform } = useTransformComponent((ctx) => ({
    zoomIn: ctx.instance.zoomIn,
    zoomOut: ctx.instance.zoomOut,
    resetTransform: ctx.instance.resetTransform,
  }));
  const scale = useTransformComponent((ctx) => ctx.state.scale);

  return (
    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
      <span>滚轮缩放 | 拖拽平移</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomIn()}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => zoomOut()}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => resetTransform()}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="重置"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="font-medium text-gray-700 w-12 text-right">
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}

function FlowPathDiagram({ nodes }: { nodes: FlowNode[] }) {
  const nodeSpacing = 180;
  const nodeRadius = 38;
  const startX = 80;
  const centerY = 90;
  const totalWidth = startX * 2 + Math.max(nodes.length - 1, 0) * nodeSpacing + nodeRadius * 2;
  const totalHeight = 240;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={3}
        limitToBounds={false}
        centerOnInit={true}
        smooth={true}
        wheel={{ step: 20 }}
        panning={{ disabled: false, velocityDisabled: true }}
      >
        <DiagramToolbar />
        <div
          className="cursor-grab active:cursor-grabbing select-none"
          style={{ height: '240px' }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%' }}
          >
            <svg
              width={totalWidth}
              height={totalHeight}
              className="overflow-visible"
              style={{ display: 'block' }}
            >
              <defs>
                <marker
                  id="arrowhead-approval"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>

              {nodes.map((node, i) => {
                const cx = startX + i * nodeSpacing + nodeRadius;
                const cy = centerY;
                const isApproved = node.status === 'approved';
                const isRejected = node.status === 'rejected';
                const isSkipped = node.status === 'skipped';
                const processed = isApproved || isRejected;

                let stroke = '#cbd5e1';
                if (isApproved) stroke = '#16a34a';
                else if (isRejected) stroke = '#dc2626';

                if (i < nodes.length - 1) {
                  return (
                    <line
                      key={node.id + '-line'}
                      x1={cx + nodeRadius}
                      y1={cy}
                      x2={cx + nodeSpacing - nodeRadius}
                      y2={cy}
                      stroke={isSkipped ? '#cbd5e1' : processed ? stroke : '#e2e8f0'}
                      strokeWidth={2}
                      strokeDasharray={isSkipped ? '6 4' : 'none'}
                      markerEnd="url(#arrowhead-approval)"
                    />
                  );
                }
                return null;
              })}

              {nodes.map((node, i) => {
                const cx = startX + i * nodeSpacing + nodeRadius;
                const cy = centerY;
                const isApproved = node.status === 'approved';
                const isRejected = node.status === 'rejected';
                const isSkipped = node.status === 'skipped';
                const processed = isApproved || isRejected;

                let fill = '#ffffff';
                let stroke = '#cbd5e1';
                let textColor = '#64748b';
                if (isApproved) {
                  fill = '#22c55e';
                  stroke = '#16a34a';
                  textColor = '#ffffff';
                } else if (isRejected) {
                  fill = '#ef4444';
                  stroke = '#dc2626';
                  textColor = '#ffffff';
                } else if (isSkipped) {
                  fill = '#f1f5f9';
                  stroke = '#94a3b8';
                  textColor = '#94a3b8';
                }

                const handledAt = (node as any).handledAt || node.approvedAt;
                const handlerName = (node as any).handlerName || node.approverName;

                return (
                  <g key={node.id + '-node'}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={nodeRadius}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={2.5}
                    />
                    {isApproved ? (
                      <CheckCircle2
                        x={cx - 12}
                        y={cy - 12}
                        width={24}
                        height={24}
                        fill={textColor}
                        color={textColor}
                      />
                    ) : isRejected ? (
                      <XCircle
                        x={cx - 12}
                        y={cy - 12}
                        width={24}
                        height={24}
                        fill={textColor}
                        color={textColor}
                      />
                    ) : (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor}
                        fontSize="15"
                        fontWeight="600"
                      >
                        {node.name.length > 4 ? node.name.slice(0, 4) : node.name}
                      </text>
                    )}

                    {processed && handlerName && (
                      <>
                        <text
                          x={cx}
                          y={cy + nodeRadius + 22}
                          textAnchor="middle"
                          fill="#374151"
                          fontSize="12"
                          fontWeight="500"
                        >
                          {handlerName}
                        </text>
                        {handledAt && (
                          <text
                            x={cx}
                            y={cy + nodeRadius + 40}
                            textAnchor="middle"
                            fill="#9ca3af"
                            fontSize="10"
                          >
                            {new Date(handledAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </text>
                        )}
                      </>
                    )}

                    {node.status === 'pending' && (
                      <text
                        x={cx}
                        y={cy + nodeRadius + 22}
                        textAnchor="middle"
                        fill="#d97706"
                        fontSize="11"
                        fontWeight="500"
                      >
                        待处理
                      </text>
                    )}

                    {isSkipped && (
                      <text
                        x={cx}
                        y={cy + nodeRadius + 22}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="11"
                      >
                        已跳过
                      </text>
                    )}

                    {i === 0 && (
                      <text
                        x={cx}
                        y={cy - nodeRadius - 12}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize="11"
                        fontWeight="500"
                      >
                        发起
                      </text>
                    )}
                    {i === nodes.length - 1 && (
                      <text
                        x={cx}
                        y={cy - nodeRadius - 12}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize="11"
                        fontWeight="500"
                      >
                        结束
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </TransformComponent>
        </div>
      </TransformWrapper>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  type: 'approve' | 'reject';
  loading: boolean;
  comment: string;
  onCommentChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmModal({
  open,
  type,
  loading,
  comment,
  onCommentChange,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null;

  const isApprove = type === 'approve';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!loading ? onClose : undefined}
        style={{ backdropFilter: 'blur(2px)' }}
      />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{
          animation: 'scaleIn 0.25s ease-out',
        }}
      >
        <div
          className={cn(
            'px-5 py-4 border-b',
            isApprove ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                isApprove ? 'bg-green-100' : 'bg-red-100'
              )}
            >
              {isApprove ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                确认{isApprove ? '通过' : '驳回'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isApprove ? '此操作将通过该审批节点' : '此操作将驳回该审批申请'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            审批意见{isApprove ? '（选填）' : '（必填）'}
          </label>
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={isApprove ? '请输入审批意见...' : '请输入驳回原因...'}
            rows={4}
            className={cn(
              'w-full px-3 py-2.5 border rounded-lg text-sm resize-none',
              'focus:outline-none focus:ring-2 transition-colors',
              isApprove
                ? 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                : 'border-gray-200 focus:ring-red-200 focus:border-red-400'
            )}
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || (!isApprove && !comment.trim())}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              'inline-flex items-center gap-2',
              isApprove
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isApprove ? '确认通过' : '确认驳回'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function FormDataDisplay({ type, data }: { type: FlowType; data: LeaveForm | ExpenseForm | BusinessForm }) {
  if (type === 'leave') {
    const form = data as LeaveForm;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoItem label="请假类型" value={form.type} />
        <InfoItem label="请假天数" value={`${form.days} 天`} />
        <InfoItem label="开始日期" value={formatDate(form.startDate)} />
        <InfoItem label="结束日期" value={formatDate(form.endDate)} />
        <InfoItem label="请假事由" value={form.reason} full />
      </div>
    );
  }
  if (type === 'expense') {
    const form = data as ExpenseForm;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoItem label="报销金额" value={`¥ ${form.amount?.toLocaleString()}`} />
        <InfoItem label="费用类别" value={form.category} />
        <InfoItem label="发生日期" value={formatDate(form.date)} />
        <InfoItem label="说明" value={form.description} full />
      </div>
    );
  }
  if (type === 'business') {
    const form = data as BusinessForm;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoItem label="出差标题" value={form.title} />
        <InfoItem label="目的地" value={form.destination} />
        <InfoItem label="开始日期" value={formatDate(form.startDate)} />
        <InfoItem label="结束日期" value={formatDate(form.endDate)} />
        <InfoItem label="出差目的" value={form.purpose} />
        <InfoItem label="预算" value={form.budget ? `¥ ${form.budget.toLocaleString()}` : undefined} />
      </div>
    );
  }
  return (
    <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ApprovalDetail() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { user, refreshTodos } = useStore();
  const [flow, setFlow] = useState<FlowInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    comment: string;
  }>({
    open: false,
    type: 'approve',
    comment: '',
  });

  const loadFlow = useCallback(async () => {
    if (!flowId) return;
    setLoading(true);
    try {
      const res: any = await getFlow(flowId);
      if (res.code === 0 || res.success) {
        setFlow(res.data);
      }
    } catch (error) {
      console.error('加载审批详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const openModal = (type: 'approve' | 'reject') => {
    setModal({ open: true, type, comment: '' });
  };

  const closeModal = () => {
    if (actionLoading) return;
    setModal({ open: false, type: 'approve', comment: '' });
  };

  const handleConfirm = async () => {
    if (!flow) return;
    const currentNode = flow.nodes[flow.currentNodeIndex];
    if (!currentNode) return;

    setActionLoading(true);
    try {
      const api = modal.type === 'approve' ? approveFlow : rejectFlow;
      const res: any = await api(flow.id, currentNode.id, modal.comment.trim() || undefined);
      if (res.code === 0 || res.success) {
        await refreshTodos();
        if (modal.type === 'approve' && res.data?.status === 'approved') {
          navigate(-1);
        } else {
          await loadFlow();
        }
        closeModal();
      }
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const currentNode = flow?.nodes[flow.currentNodeIndex];
  const canOperate =
    !!flow &&
    flow.status === 'pending' &&
    !!currentNode &&
    currentNode.status === 'pending' &&
    (currentNode.approverId === user.userId ||
      (currentNode as any).handlerId === user.userId ||
      user.role === 'admin');

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="mt-4 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">未找到审批记录</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[flow.type];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg -ml-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-gray-900">{flow.title}</h1>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                    statusColors[flow.status]
                  )}
                >
                  {FLOW_STATUS_LABELS[flow.status]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    typeColors[flow.type]
                  )}
                >
                  <TypeIcon className="w-3.5 h-3.5" />
                  {FLOW_TYPE_LABELS[flow.type]}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  {flow.applicantName || (flow as any).creatorName}
                </span>
                <span className="text-sm text-gray-500">·</span>
                <span className="text-sm text-gray-500">
                  {formatDateTime(flow.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-600 rounded-full" />
            申请信息
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <FormDataDisplay type={flow.type} data={flow.formData} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-600 rounded-full" />
            流转路径图
          </h2>
          <FlowPathDiagram nodes={flow.nodes} />
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-600 rounded-full" />
            审批时间线
          </h2>
          <div className="mt-2">
            {flow.nodes.map((node, index) => (
              <TimelineItem
                key={node.id}
                node={node}
                isCurrent={index === flow.currentNodeIndex}
                isLast={index === flow.nodes.length - 1}
                expanded={!!expandedNodes[node.id]}
                onToggle={() => toggleNode(node.id)}
              />
            ))}
          </div>
        </section>

        {canOperate && (
          <section className="sticky bottom-4 z-40">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-500">当前节点：</span>
                  <span className="font-medium text-gray-900">{currentNode?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openModal('reject')}
                    className="px-6 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    驳回
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal('approve')}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    通过
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <ConfirmModal
        open={modal.open}
        type={modal.type}
        loading={actionLoading}
        comment={modal.comment}
        onCommentChange={(val) => setModal((prev) => ({ ...prev, comment: val }))}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
