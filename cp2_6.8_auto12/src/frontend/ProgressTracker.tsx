import type { UserProgress } from '../shared/types';

interface User {
  id: string;
  name: string;
}

interface ProgressTrackerProps {
  users: User[];
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  userProgress: UserProgress | null;
  totalParagraphs: number;
  currentParagraph: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
}

function ProgressTracker({
  users,
  selectedUserId,
  onUserChange,
  userProgress,
  totalParagraphs,
  currentParagraph,
}: ProgressTrackerProps) {
  const readParagraphs = userProgress?.paragraphs ?? [];
  const totalReadCount = readParagraphs.length;
  const totalReadingTime = readParagraphs.reduce(
    (sum, p) => sum + p.totalReadingTime,
    0
  );
  const avgTimePerParagraph =
    totalReadCount > 0 ? Math.floor(totalReadingTime / totalReadCount) : 0;

  return (
    <>
      <div className="tracker-header">
        <h3 className="tracker-title">阅读统计</h3>
        <select
          className="user-select"
          value={selectedUserId}
          onChange={(e) => onUserChange(e.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">已读段落</div>
          <div className="stat-value">
            {totalReadCount} / {totalParagraphs}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总阅读时长</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {formatDuration(totalReadingTime)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均每段用时</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {formatDuration(avgTimePerParagraph)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">完成进度</div>
          <div className="stat-value">
            {totalParagraphs > 0
              ? Math.round((totalReadCount / totalParagraphs) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      <div className="paragraph-list">
        <div className="paragraph-list-title">段落阅读状态</div>
        {Array.from({ length: totalParagraphs }, (_, i) => {
          const progress = readParagraphs.find((p) => p.paragraphIndex === i);
          const isRead = !!progress;
          const isCurrent = i === currentParagraph;

          return (
            <div key={i} className="paragraph-item">
              <span className="paragraph-index">第 {i + 1} 段</span>
              <div className="paragraph-status">
                {progress && (
                  <span className="reading-time">
                    {formatDuration(progress.totalReadingTime)}
                  </span>
                )}
                <span
                  className={`status-badge ${
                    isCurrent
                      ? 'current-reading'
                      : isRead
                      ? 'status-read'
                      : 'status-unread'
                  }`}
                >
                  {isCurrent ? '阅读中' : isRead ? '已读' : '未读'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ProgressTracker;
