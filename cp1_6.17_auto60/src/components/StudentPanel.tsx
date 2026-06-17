import { useState } from 'react';
import type { FC } from 'react';
import type { Course, Homework, Student } from '../data';
import { getStudentHomeworkStatus, submitHomework } from '../logic/courseManager';

interface StudentPanelProps {
  student: Student | null;
  courses: Course[];
  homeworks: Homework[];
  students: Student[];
  onHomeworksChange: (updatedHomeworks: Homework[]) => void;
  onStudentChange: (student: Student) => void;
}

const StudentPanel: FC<StudentPanelProps> = ({
  student,
  courses,
  homeworks,
  students,
  onHomeworksChange,
  onStudentChange,
}) => {
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  if (!student) {
    return (
      <div className="student-panel">
        <h2>个人面板</h2>
        <div className="panel-section">
          <h3>选择身份</h3>
          <div className="student-selector">
            {students.slice(0, 6).map(s => (
              <button
                key={s.id}
                className="student-select-btn"
                onClick={() => onStudentChange(s)}
              >
                <div
                  className="student-avatar-large"
                  style={{ backgroundColor: s.avatarColor }}
                >
                  {s.name.charAt(0)}
                </div>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const homeworkStatus = getStudentHomeworkStatus(homeworks, courses, student.id);

  const handleSubmit = (homeworkId: string) => {
    if (submittingId) return;
    setSubmittingId(homeworkId);

    const updated = homeworks.map(h =>
      h.id === homeworkId ? submitHomework(h, student.id) : h
    );
    onHomeworksChange(updated);

    setTimeout(() => setSubmittingId(null), 200);
  };

  const coursesGrouped = homeworkStatus.reduce((acc, item) => {
    if (!acc[item.course.id]) {
      acc[item.course.id] = { course: item.course, items: [] };
    }
    acc[item.course.id].items.push(item);
    return acc;
  }, {} as Record<string, { course: Course; items: typeof homeworkStatus }>);

  return (
    <div className="student-panel">
      <div className="panel-header">
        <div className="current-student">
          <div
            className="student-avatar-large"
            style={{ backgroundColor: student.avatarColor }}
          >
            {student.name.charAt(0)}
          </div>
          <div>
            <h2>{student.name}</h2>
            <p className="student-subtitle">个人学习面板</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => onStudentChange(students[0])}>
          切换学生
        </button>
      </div>

      <div className="panel-section">
        <h3>我的课程与作业</h3>
        {Object.keys(coursesGrouped).length === 0 ? (
          <div className="empty-state">还没有报名任何课程，请在课程列表中报名</div>
        ) : (
          <div className="my-courses-list">
            {Object.values(coursesGrouped).map(({ course, items }) => (
              <div
                key={course.id}
                className="my-course-card"
                style={{ borderLeftColor: course.coverColor }}
              >
                <div className="my-course-header">
                  <h4 style={{ color: course.coverColor }}>{course.name}</h4>
                  <span>⏰ {course.schedule}</span>
                </div>
                <div className="my-homework-list">
                  {items.map(({ homework, submitted }) => {
                    const isSubmitting = submittingId === homework.id;
                    return (
                      <div
                        key={homework.id}
                        className={`my-homework-item ${submitted ? 'submitted' : ''}`}
                      >
                        <div className="my-homework-info">
                          <span className="my-homework-title">{homework.title}</span>
                          <span className="my-homework-deadline">
                            📅 截止：{homework.deadline}
                          </span>
                        </div>
                        {submitted ? (
                          <span className="submitted-badge fade-in">
                            ✓ 已提交
                          </span>
                        ) : (
                          <button
                            className={`btn-primary btn-small ${isSubmitting ? 'scaling' : ''}`}
                            onClick={() => handleSubmit(homework.id)}
                            disabled={isSubmitting}
                          >
                            提交
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPanel;
