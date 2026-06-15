import React, { useState, useEffect } from 'react';
import { Student, Course } from './App';

interface ReportEditorProps {
  student: Student;
  onUpdate: (
    id: string,
    data: { comment?: string; courses?: Course[] }
  ) => Promise<boolean>;
  onBack: () => void;
}

const ReportEditor: React.FC<ReportEditorProps> = ({
  student,
  onUpdate,
  onBack,
}) => {
  const [comment, setComment] = useState(student.comment || '');
  const [courses, setCourses] = useState<Course[]>(student.courses || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setComment(student.comment || '');
    setCourses(student.courses || []);
    setSaveSuccess(false);
  }, [student._id]);

  const handleGradeChange = (index: number, grade: string) => {
    setCourses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], grade };
      return next;
    });
  };

  const handleScoreChange = (index: number, scoreStr: string) => {
    const score = parseFloat(scoreStr);
    if (isNaN(score)) return;
    setCourses((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        score,
        grade: getGrade(score),
      };
      return next;
    });
  };

  const getGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeStyle = (grade: string): React.CSSProperties => {
    switch (grade) {
      case 'A':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'B':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'C':
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case 'D':
        return { backgroundColor: '#fed7aa', color: '#9a3412' };
      case 'F':
        return { backgroundColor: '#fecaca', color: '#991b1b' };
      default:
        return { backgroundColor: '#e5e7eb', color: '#374151' };
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const success = await onUpdate(student._id, { comment, courses });
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const totalScore = courses.reduce((sum, c) => sum + c.score, 0);
  const averageScore =
    courses.length > 0
      ? Math.round((totalScore / courses.length) * 100) / 100
      : 0;

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button style={styles.backBtn} className="btn-back" onClick={onBack}>
          <i className="fas fa-arrow-left" style={{ marginRight: 6 }} />
          返回列表
        </button>
        <div style={styles.toolbarRight}>
          {saveSuccess && (
            <span style={styles.saveSuccess}>
              <i
                className="fas fa-check-circle"
                style={{ marginRight: 4 }}
              />
              已保存
            </span>
          )}
          <button
            style={{
              ...styles.saveBtn,
              ...(isSaving ? styles.saveBtnLoading : {}),
            }}
            className="btn-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span style={styles.spinner} />
                保存中...
              </>
            ) : (
              <>
                <i className="fas fa-save" style={{ marginRight: 6 }} />
                保存修改
              </>
            )}
          </button>
        </div>
      </div>

      <div style={styles.scrollArea}>
        <div style={styles.reportCard}>
          <div style={styles.reportHeader}>
            <h1 style={styles.reportTitle}>学员成绩单</h1>
            <div style={styles.reportSubtitle}>
              ReportForge · Academic Report
            </div>
          </div>

          <div style={styles.studentInfo}>
            <div style={styles.avatarLarge}>
              {student.name.charAt(0)}
            </div>
            <div style={styles.studentMeta}>
              <div style={styles.studentName}>{student.name}</div>
              <div style={styles.studentId}>学号：{student.studentId}</div>
            </div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>
                {Math.round(totalScore * 100) / 100}
              </div>
              <div style={styles.statLabel}>总分</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{averageScore}</div>
              <div style={styles.statLabel}>平均分</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{courses.length}</div>
              <div style={styles.statLabel}>科目数</div>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <i
                className="fas fa-book-open"
                style={{ marginRight: 8, color: '#6366f1' }}
              />
              各科成绩
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.coursesTable}>
                <thead>
                  <tr style={styles.coursesTableHead}>
                    <th style={styles.courseTh}>科目</th>
                    <th style={{ ...styles.courseTh, textAlign: 'center', width: 140 }}>
                      分数
                    </th>
                    <th style={{ ...styles.courseTh, textAlign: 'center', width: 140 }}>
                      等级
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, i) => (
                    <tr
                      key={i}
                      style={{
                        ...styles.courseTr,
                        ...(i % 2 === 1 ? styles.courseTrAlt : {}),
                      }}
                    >
                      <td style={styles.courseTd}>{course.name}</td>
                      <td style={{ ...styles.courseTd, textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={course.score}
                          onChange={(e) =>
                            handleScoreChange(i, e.target.value)
                          }
                          style={styles.scoreInput}
                          className="score-input"
                        />
                      </td>
                      <td style={{ ...styles.courseTd, textAlign: 'center' }}>
                        <select
                          value={course.grade}
                          onChange={(e) =>
                            handleGradeChange(i, e.target.value)
                          }
                          style={{
                            ...styles.gradeSelect,
                            ...getGradeStyle(course.grade),
                          }}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="F">F</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...styles.section, paddingBottom: 32 }}>
            <div style={styles.sectionTitle}>
              <i
                className="fas fa-pen-nib"
                style={{ marginRight: 8, color: '#6366f1' }}
              />
              教师评语
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入对该学员的评语..."
              rows={6}
              style={styles.commentTextarea}
              className="comment-textarea"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #f3f4f6',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 14px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  saveSuccess: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 500,
    animation: 'flyIn 0.3s ease',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 24px',
    backgroundColor: '#6366f1',
    color: 'white',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
  },
  saveBtnLoading: {
    opacity: 0.8,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: 8,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 4px 8px 4px',
  },
  reportCard: {
    width: 750,
    maxWidth: '100%',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '2px 4px 12px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  reportHeader: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    padding: '28px 36px',
    color: 'white',
  },
  reportTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },
  reportSubtitle: {
    fontSize: 13,
    opacity: 0.85,
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    padding: '24px 36px',
    gap: 20,
    borderBottom: '1px solid #e5e7eb',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    color: '#6366f1',
  },
  studentMeta: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsRow: {
    display: 'flex',
    padding: '20px 36px',
    gap: 24,
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  statItem: {
    flex: 1,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    padding: '24px 36px 16px 36px',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
  },
  tableWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  coursesTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  coursesTableHead: {
    backgroundColor: '#6366f1',
    color: 'white',
  },
  courseTh: {
    padding: '11px 14px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
  },
  courseTd: {
    padding: '10px 14px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  courseTr: {
    backgroundColor: '#ffffff',
    transition: 'background-color 0.15s ease',
  },
  courseTrAlt: {
    backgroundColor: '#f9fafb',
  },
  scoreInput: {
    width: 80,
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  gradeSelect: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  commentTextarea: {
    width: '100%',
    padding: 16,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.7,
    resize: 'vertical',
    color: '#374151',
    fontFamily: "inherit",
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
  },
};

export default ReportEditor;
