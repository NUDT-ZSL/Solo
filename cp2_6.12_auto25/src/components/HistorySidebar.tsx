import { CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import type { SubmissionRecord } from '@/shared/types';

interface HistorySidebarProps {
  history: SubmissionRecord[];
  onViewItem: (submissionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function getScoreColor(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'text-base-green';
  if (pct >= 50) return 'text-base-yellow';
  return 'text-base-red';
}

function getStatusIcon(record: SubmissionRecord) {
  const allPassed = record.results.every(r => r.status === 'passed');
  const hasFailed = record.results.some(r => r.status === 'failed');
  const hasTimeout = record.results.some(r => r.status === 'timeout');

  if (allPassed) return <CheckCircle className="w-3.5 h-3.5 text-base-green" />;
  if (hasTimeout) return <Clock className="w-3.5 h-3.5 text-base-yellow" />;
  if (hasFailed) return <XCircle className="w-3.5 h-3.5 text-base-red" />;
  return <XCircle className="w-3.5 h-3.5 text-base-peach" />;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function HistorySidebar({ history, onViewItem, isOpen, onToggle }: HistorySidebarProps) {
  return (
    <div
      className={`h-full flex flex-col transition-all duration-300 bg-[#181825] border-r border-[#313244] ${
        isOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
        <h3 className="text-sm font-semibold text-base-text whitespace-nowrap">Submission History</h3>
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-base-surface transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-base-subtext" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-base-subtext">
            No submissions yet
          </div>
        ) : (
          <div className="py-2">
            {history.map((record, index) => (
              <button
                key={record.submissionId}
                onClick={() => onViewItem(record.submissionId)}
                className="w-full text-left px-4 py-3 hover:bg-base-surface/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1">
                    {getStatusIcon(record)}
                    {index < history.length - 1 && (
                      <div className="w-px h-6 bg-base-overlay mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-base-text truncate">
                      {record.assignmentTitle}
                    </div>
                    <div className="text-[11px] text-base-subtext mt-0.5">
                      {record.language} &middot; {formatTime(record.timestamp)}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${getScoreColor(record.score, record.maxScore)}`}>
                      {record.score}/{record.maxScore}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
