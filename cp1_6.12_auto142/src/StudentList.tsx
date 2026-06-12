import React, { useState, useMemo } from 'react';
import { Student } from './App';

interface StudentListProps {
  students: Student[];
  onSelect: (id: string) => void;
  onDownload: (ids: string[]) => void;
  isDownloading: boolean;
  downloadProgress: number;
  currentStudentId: string | null;
  onGoUpload: () => void;
}

type SortKey = 'name' | 'studentId' | 'totalScore';
type SortOrder = 'asc' | 'desc';

const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelect,
  onDownload,
  isDownloading,
  downloadProgress,
  currentStudentId,
  onGoUpload,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('studentId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const allSelected =
    students.length > 0 && selectedIds.size === students.length;

  const sortedStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'studentId':
          comparison = a.studentId.localeCompare(b.studentId);
          break;
        case 'totalScore':
          comparison = a.totalScore - b.totalScore;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [students, sortKey, sortOrder]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s._id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon: React.FC<{ active: boolean; order: SortOrder }> = ({
    active,
    order,
  }) => (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.5 }}>
      {active && order === 'asc' ? (
        <i className="fas fa-chevron-up" />
      ) : active && order === 'desc' ? (
        <i className="fas fa-chevron-down" />
      ) : (
        <i className="fas fa-sort" />
      )}
    </span>
  );

  const handleDownloadClick = () => {
    onDownload(Array.from(selectedIds));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>
            <i
              className="fas fa-users"
              style={{ marginRight: 8, color: '#6366f1' }}
            />
            学员列表
          </h3>
          <span style={styles.countBadge}>
            共 {students.length} 名学员
          </span>
        </div>
        <div style={styles.headerRight}>
          <button
            style={{
              ...styles.btn,
              ...styles.btnSecondary,
            }}
            className="btn-secondary"
            onClick={onGoUpload}
          >
            <i className="fas fa-upload" style={{ marginRight: 6 }} />
            重新上传
          </button>
          <button
            style={{
              ...styles.btn,
              ...styles.btnDownload,
              ...(selectedIds.size === 0 || isDownloading
                ? styles.btnDisabled
                : {}),
            }}
            className="btn-download"
            onClick={handleDownloadClick}
            disabled={selectedIds.size === 0 || isDownloading}
          >
            {isDownloading ? (
              <>
                <span style={styles.spinner} />
                下载中 {Math.round(downloadProgress)}%
              </>
            ) : (
              <>
                <i
                  className="fas fa-download"
                  style={{ marginRight: 6 }}
                />
                下载选中 ({selectedIds.size})
              </>
            )}
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <div style={styles.emptyState}>
          <i
            className="fas fa-inbox"
            style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }}
          />
          <p style={{ color: '#6b7280', fontSize: 14 }}>暂无学员数据</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table} className="student-table">
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.thCheckbox}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th
                  style={{ ...styles.th, cursor: 'pointer' }}
                  onClick={() => handleSort('name')}
                >
                  姓名
                  <SortIcon
                    active={sortKey === 'name'}
                    order={sortOrder}
                  />
                </th>
                <th
                  style={{ ...styles.th, cursor: 'pointer' }}
                  onClick={() => handleSort('studentId')}
                >
                  学号
                  <SortIcon
                    active={sortKey === 'studentId'}
                    order={sortOrder}
                  />
                </th>
                <th
                  style={{ ...styles.th, cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => handleSort('totalScore')}
                >
                  总成绩
                  <SortIcon
                    active={sortKey === 'totalScore'}
                    order={sortOrder}
                  />
                </th>
                <th style={{ ...styles.th, textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, index) => (
                <tr
                  key={student._id}
                  style={{
                    ...styles.tr,
                    ...(index % 2 === 1 ? styles.trAlt : {}),
                    ...(currentStudentId === student._id
                      ? styles.trActive
                      : {}),
                  }}
                >
                  <td style={styles.tdCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student._id)}
                      onChange={() => toggleSelect(student._id)}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.studentNameCell}>
                      <div style={styles.nameAvatar}>
                        {student.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: '#6b7280' }}>
                    {student.studentId}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span
                      style={{
                        ...styles.scoreBadge,
                        ...(student.averageScore >= 90
                          ? styles.scoreA
                          : student.averageScore >= 80
                          ? styles.scoreB
                          : student.averageScore >= 70
                          ? styles.scoreC
                          : student.averageScore >= 60
                          ? styles.scoreD
                          : styles.scoreF),
                      }}
                    >
                      {student.totalScore}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button
                      style={{
                        ...styles.btn,
                        ...styles.btnEdit,
                        ...(currentStudentId === student._id
                          ? styles.btnEditActive
                          : {}),
                      }}
                      className={`btn-edit${
                        currentStudentId === student._id
                          ? ' btn-edit-active'
                          : ''
                      }`}
                      onClick={() => onSelect(student._id)}
                    >
                      <i
                        className="fas fa-pen"
                        style={{ marginRight: 4, fontSize: 12 }}
                      />
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  countBadge: {
    fontSize: 12,
    padding: '2px 10px',
    backgroundColor: '#eef2ff',
    color: '#6366f1',
    borderRadius: 12,
    fontWeight: 500,
  },
  headerRight: {
    display: 'flex',
    gap: 10,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  btnSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  btnDownload: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  btnEdit: {
    padding: '6px 12px',
    backgroundColor: '#eef2ff',
    color: '#6366f1',
    fontSize: 12,
  },
  btnEditActive: {
    backgroundColor: '#6366f1',
    color: 'white',
  },
  btnDisabled: {
    opacity: 0.5,
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
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  tableHead: {
    backgroundColor: '#6366f1',
    color: 'white',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
    userSelect: 'none',
  },
  thCheckbox: {
    padding: '12px 12px',
    width: 40,
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  tdCheckbox: {
    padding: '12px 12px',
  },
  tr: {
    transition: 'background-color 0.15s ease',
  },
  trAlt: {
    backgroundColor: '#fafafa',
  },
  trActive: {
    backgroundColor: '#eef2ff !important',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: '#6366f1',
  },
  studentNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  nameAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)',
    color: '#4338ca',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 13,
    minWidth: 56,
    textAlign: 'center',
  },
  scoreA: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  scoreB: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  scoreC: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  scoreD: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  scoreF: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
  },
};

export default StudentList;
