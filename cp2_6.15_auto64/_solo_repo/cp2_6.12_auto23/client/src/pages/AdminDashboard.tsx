import { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent, useTransformComponent } from 'react-zoom-pan-pinch';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import type { FlowInstance, FlowStatus, NodeStatus } from '../types';

const STATUS_LABELS: Record<FlowStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

const GROUP_HEADER_BG: Record<FlowStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const GROUP_HEADER_BAR: Record<FlowStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const CARD_BG: Record<FlowStatus, string> = {
  pending: 'bg-yellow-50/70 hover:bg-yellow-50',
  approved: 'bg-green-50/70 hover:bg-green-50',
  rejected: 'bg-red-50/70 hover:bg-red-50',
};

const CARD_BORDER: Record<FlowStatus, string> = {
  pending: 'border-yellow-200',
  approved: 'border-green-200',
  rejected: 'border-red-200',
};

const TYPE_LABELS: Record<string, string> = {
  leave: '请假申请',
  expense: '报销申请',
  business: '出差申请',
};

interface ServerFlowInstance {
  id: string;
  type: string;
  title: string;
  formData: any;
  creatorId: string;
  creatorName: string;
  status: FlowStatus;
  currentNodeIndex: number;
  createdAt: string;
  updatedAt: string;
  nodes: ServerFlowNode[];
}

interface ServerFlowNode {
  id: string;
  flowId: string;
  name: string;
  handlerId: string;
  handlerName: string;
  status: NodeStatus;
  comment?: string;
  handledAt?: string;
  orderIndex: number;
}

function normalizeFlow(serverFlow: ServerFlowInstance): FlowInstance {
  return {
    id: serverFlow.id,
    type: serverFlow.type as any,
    title: serverFlow.title,
    applicantId: serverFlow.creatorId,
    applicantName: serverFlow.creatorName,
    status: serverFlow.status,
    formData: serverFlow.formData,
    nodes: serverFlow.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      role: '',
      status: n.status,
      approverId: n.handlerId,
      approverName: n.handlerName,
      approvedAt: n.handledAt,
      comment: n.comment,
    })),
    currentNodeIndex: serverFlow.currentNodeIndex,
    createdAt: serverFlow.createdAt,
    updatedAt: serverFlow.updatedAt,
  };
}

export default function AdminDashboard() {
  const [flows, setFlows] = useState<FlowInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<FlowStatus, boolean>>({
    pending: true,
    approved: true,
    rejected: true,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flows');
      const json = await res.json();
      if (json.success || json.code === 0) {
        const data = (json.data || []) as ServerFlowInstance[];
        const normalized = data.map(normalizeFlow);
        setFlows(normalized);
        if (normalized.length > 0 && !selectedId) {
          setSelectedId(normalized[0].id);
        }
      }
    } catch (error) {
      console.error('加载流程失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedFlow = flows.find((f) => f.id === selectedId) || null;

  const groupedFlows = {
    pending: flows.filter((f) => f.status === 'pending'),
    approved: flows.filter((f) => f.status === 'approved'),
    rejected: flows.filter((f) => f.status === 'rejected'),
  };

  const toggleGroup = (status: FlowStatus) => {
    setExpandedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-800">流程列表</h2>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-[30%] border-r border-gray-200 overflow-y-auto bg-gray-50`}
      >
        <div className="p-3 space-y-4">
          {(Object.keys(groupedFlows) as FlowStatus[]).map((status) => (
            <div key={status} className="overflow-hidden">
              <button
                onClick={() => toggleGroup(status)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 ${GROUP_HEADER_BG[status]} hover:brightness-95 transition-all`}
              >
                <div className={`w-1 h-5 rounded-full ${GROUP_HEADER_BAR[status]}`} />
                <div className="flex items-center gap-2 flex-1">
                  {status === 'pending' && <Clock className="w-4 h-4" />}
                  {status === 'approved' && <CheckCircle className="w-4 h-4" />}
                  {status === 'rejected' && <XCircle className="w-4 h-4" />}
                  <span className="font-semibold text-sm">{STATUS_LABELS[status]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/60">
                    {groupedFlows[status].length}
                  </span>
                </div>
                {expandedGroups[status] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedGroups[status] && (
                <div className="pt-2 space-y-2">
                  {groupedFlows[status].length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>
                  ) : (
                    groupedFlows[status].map((flow) => (
                      <div
                        key={flow.id}
                        onClick={() => {
                          setSelectedId(flow.id);
                          setSidebarOpen(false);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all text-left border ${CARD_BG[status]} ${CARD_BORDER[status]} ${
                          selectedId === flow.id
                            ? 'ring-2 ring-blue-400 shadow-md'
                            : 'shadow-sm hover:shadow'
                        }`}
                      >
                        <p className="font-medium text-sm text-gray-900 truncate">{flow.title}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-500">
                            {TYPE_LABELS[flow.type] || flow.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(flow.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">申请人: {flow.applicantName}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : selectedFlow ? (
          <FlowDetail flow={selectedFlow} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">请选择一个流程实例</div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowDetail({ flow }: { flow: FlowInstance }) {
  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{flow.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {TYPE_LABELS[flow.type] || flow.type}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  flow.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : flow.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {STATUS_LABELS[flow.status]}
              </span>
              <span className="text-sm text-gray-500">申请人: {flow.applicantName}</span>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>创建: {new Date(flow.createdAt).toLocaleString('zh-CN')}</p>
            <p>更新: {new Date(flow.updatedAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">申请信息</h2>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <FormDataDisplay type={flow.type} data={flow.formData} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">流转路径</h2>
        <FlowPathDiagram nodes={flow.nodes} />
      </div>
    </div>
  );
}

function FormDataDisplay({ type, data }: { type: string; data: any }) {
  if (type === 'leave') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <InfoItem label="请假类型" value={data.type} />
        <InfoItem label="请假天数" value={`${data.days} 天`} />
        <InfoItem label="开始日期" value={data.startDate} />
        <InfoItem label="结束日期" value={data.endDate} />
        <InfoItem label="请假事由" value={data.reason} full />
      </div>
    );
  }
  if (type === 'expense') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <InfoItem label="报销金额" value={`¥ ${data.amount?.toLocaleString()}`} />
        <InfoItem label="费用类别" value={data.category} />
        <InfoItem label="日期" value={data.date} />
        <InfoItem label="说明" value={data.description} full />
      </div>
    );
  }
  if (type === 'business') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <InfoItem label="出差标题" value={data.title || data.purpose} />
        <InfoItem label="目的地" value={data.destination || data.location} />
        <InfoItem label="开始日期" value={data.startDate} />
        <InfoItem label="结束日期" value={data.endDate} />
        <InfoItem label="预算" value={data.budget ? `¥ ${data.budget.toLocaleString()}` : undefined} />
        <InfoItem label="天数" value={data.days ? `${data.days} 天` : undefined} />
      </div>
    );
  }
  return (
    <pre className="text-sm text-gray-600 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function InfoItem({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-900 font-medium">{value || '-'}</span>
    </div>
  );
}

function AdminDiagramToolbar() {
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

function FlowPathDiagram({ nodes }: { nodes: FlowInstance['nodes'] }) {
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
        <AdminDiagramToolbar />
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
                  id="arrowhead-admin"
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
                      markerEnd="url(#arrowhead-admin)"
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
                const isPending = node.status === 'pending';
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
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={textColor}
                      fontSize="13"
                      fontWeight="600"
                    >
                      {node.name.length > 4 ? node.name.slice(0, 4) : node.name}
                    </text>

                    {processed && node.approverName && (
                      <>
                        <text
                          x={cx}
                          y={cy + nodeRadius + 22}
                          textAnchor="middle"
                          fill="#374151"
                          fontSize="12"
                          fontWeight="500"
                        >
                          {node.approverName}
                        </text>
                        {node.approvedAt && (
                          <text
                            x={cx}
                            y={cy + nodeRadius + 40}
                            textAnchor="middle"
                            fill="#9ca3af"
                            fontSize="10"
                          >
                            {new Date(node.approvedAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </text>
                        )}
                      </>
                    )}

                    {isPending && (
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
