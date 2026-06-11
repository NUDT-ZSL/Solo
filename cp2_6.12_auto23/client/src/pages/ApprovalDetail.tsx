import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Receipt,
  Briefcase,
  User,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
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

const nodeDotColors: Record<NodeStatus, string> = {
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  pending: 'bg-gray-300',
  skipped: 'bg-gray-300',
};

const nodePathColors: Record<NodeStatus, string> = {
  approved: 'bg-green-500 text-white border-green-500',
  rejected: 'bg-red-500 text-white border-red-500',
  pending: 'bg-white text-gray-500 border-gray-300',
  skipped: 'bg-gray-100 text-gray-400 border-gray-200',
};

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex gap-3 py-2">
      <span className="text-sm text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{value}</span>
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
  const handledAt = (node as any).handledAt || (node as any).approvedAt;
  const handlerName = (node as any).handlerName || node.approverName || '待定';

  return (
    <div className="relative pl-8 pb-6">
      {!isLast && (
        <div
          className={cn(
            'absolute left-[11px] top-6 w-0.5 h-full',
            node.status === 'approved' ? 'bg-green-300' : node.status === 'rejected' ? 'bg-red-300' : 'bg-gray-200'
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
          {node.status === 'pending' && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg border p-4 transition-colors',
          isCurrent
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{node.name}</span>
            {isCurrent && node.status === 'pending' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
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
            <button
              type="button"
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>处理人：{handlerName}</span>
          {handledAt && <span>· {formatDateTime(handledAt)}</span>}
        </div>

        {hasComment && expanded && (
          <div
            className="mt-3 pt-3 border-t border-gray-100"
            style={{
              maxHeight: expanded ? 200 : 0,
              opacity: expanded ? 1 : 0,
              transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out',
              overflow: 'hidden',
            }}
          >
            <p className="text-sm text-gray-700 bg-gray-50 rounded-md p-3">{node.comment}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PathNodeProps {
  node: FlowNode;
  index: number;
  isLast: boolean;
}

function PathNode({ node, index, isLast }: PathNodeProps) {
  const handledAt = (node as any).handledAt || (node as any).approvedAt;
  const handlerName = (node as any).handlerName || node.approverName || '待定';
  const isDone = node.status === 'approved' || node.status === 'rejected';

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium text-sm transition-colors',
            nodePathColors[node.status]
          )}
        >
          {node.status === 'approved' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : node.status === 'rejected' ? (
            <XCircle className="w-5 h-5" />
          ) : (
            index + 1
          )}
        </div>
        <div className="mt-2 text-center w-20">
          <p className