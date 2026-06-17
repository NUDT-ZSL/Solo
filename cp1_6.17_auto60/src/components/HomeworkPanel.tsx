import { useState } from 'react';
import type { FC } from 'react';
import type { Course, Homework } from '../data';
import { getCourseHomeworks, getSubmittedCount, getUnsubmittedCount, markReminded, createHomework } from '../logic/courseManager';

interface HomeworkPanelProps {
  course: Course;
  homeworks: Homework[];
  onHomeworksChange: (updatedHomeworks: Homework[]) => void;
}

const HomeworkPanel: FC<HomeworkPanelProps> = ({ course, homeworks, onHomeworksChange }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const courseHomeworks = getCourseHomeworks(homeworks, course.id);

  const handleCreateHomework = () => {
    if (!newTitle.trim() || !newDeadline) return;
    const newHomework = createHomework(course.id, newTitle.trim(), newDeadline);
    onHomeworksChange([...homeworks, newHomework]);
    setNewTitle('');
    setNewDeadline('');
    setShowCreateForm(false);
  };

  const handleRemind = (homeworkId: string) => {
    if (remindingId) return;
    setRemindingId(homeworkId);

    const updated = homeworks.map(h =>
      h.id === homeworkId ? markReminded(h) : h
    );
    onHomeworksChange(updated);

    setTimeout(() => setRemindingId(null), 2000);
  };

  return (
    <div className="homework-panel">
      <div className="panel-header">
        <h4>作业管理</h4>
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '取消' : '＋ 发布作业'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-homework-form fade-in">
          <div className="form-row">
            <label>作业标题</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="请输入作业标题"
            />
          </div>
          <div className="form-row">
            <label>截止日期</label>
            <input
              type="date"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleCreateHomework}>
            发布
          </button>
        </div>
      )}

      <div className="homework-list">
        {courseHomeworks.length === 0 ? (
          <div className="empty-state">暂无作业</div>
        ) : (
          courseHomeworks.map(homework => {
            const submitted = getSubmittedCount(homework);
            const unsubmitted = getUnsubmittedCount(homework, course);
            const total = course.enrolledStudentIds.length;
            const isReminding = remindingId === homework.id;

            return (
              <div key={homework.id} className="homework-item">
                <div className="homework-info">
                  <div className="homework-title">{homework.title}</div>
                  <div className="homework-meta">
                    <span>📅 截止：{homework.deadline}</span>
                    <span className="homework-stats">
                      ✅ {submitted}/{total} 已提交
                      {unsubmitted > 0 && (
                        <span className="unsubmitted-count">（{unsubmitted} 人未交）</span>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  className={`btn-remind ${isReminding ? 'disabled' : ''} ${isReminding ? 'scaling' : ''}`}
                  onClick={() => handleRemind(homework.id)}
                  disabled={isReminding}
                >
                  {isReminding ? '已催交' : '催交'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HomeworkPanel;
