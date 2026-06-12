import React, { useState, useEffect, useRef, useCallback } from 'react';
import StudentList from './StudentList';
import ReportEditor from './ReportEditor';

export interface Course {
  name: string;
  score: number;
  grade: string;
}

export interface Student {
  _id: string;
  name: string;
  studentId: string;
  courses: Course[];
  totalScore: number;
  averageScore: number;
  comment: string;
  createdAt: number;
}

type ViewMode = 'upload' | 'list' | 'edit';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data: Student[] = await res.json();
        setStudents(data);
        if (data.length > 0 && viewMode === 'upload') {
          setViewMode('list');
        }
      }
    } catch (err) {
      console.error('Fetch students failed:', err);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (currentStudentId) {
      fetchCurrentStudent(currentStudentId);
    }
  }, [currentStudentId]);

  const fetchCurrentStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`);
      if (res.ok) {
        const data: Student = await res.json();
        setCurrentStudent(data);
      }
    } catch (err) {
      console.error('Fetch student failed:', err);
    }
  };

  const clearProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    clearProgressInterval();
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          return prev;
        }
        const increment = Math.random() * 15 + 5;
        return Math.min(prev + increment, 90);
      });
    }, 100);
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('请上传CSV格式的文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('文件大小不能超过5MB');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    simulateProgress();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearProgressInterval();
      setUploadProgress(100);

      if (res.ok) {
        const result = await res.json();
        setStudents(result.students);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setViewMode('list');
        }, 300);
      } else {
        const err = await res.json();
        setUploadError(err.error || '上传失败');
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (err) {
      clearProgressInterval();
      setUploadError('网络错误，请稍后重试');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditStudent = (id: string) => {
    setCurrentStudentId(id);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setCurrentStudentId(null);
    setCurrentStudent(null);
    setViewMode('list');
  };

  const handleUpdateStudent = async (
    id: string,
    data: { comment?: string; courses?: Course[] }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/students/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.student) {
          setCurrentStudent(result.student);
          setStudents((prev) =>
            prev.map((s) => (s._id === id ? result.student : s))
          );
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Update failed:', err);
      return false;
    }
  };

  const handleDownload = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 100);

      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        const blob = await res.blob();
        setDownloadProgress(100);

        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = `成绩单_${Date.now()}.zip`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        clearInterval(progressInterval);
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 500);
      } else {
        clearInterval(progressInterval);
        setIsDownloading(false);
        setDownloadProgress(0);
        alert('下载失败');
      }
    } catch (err) {
      console.error('Download error:', err);
      setIsDownloading(false);
      setDownloadProgress(0);
      alert('下载失败');
    }
  };

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <i
            className="fas fa-file-alt"
            style={{ fontSize: 20, color: '#6366f1', marginRight: 12 }}
          />
          <span style={styles.appName}>ReportForge</span>
        </div>
        <div style={styles.navRight}>
          <div style={styles.avatarPlaceholder}>T</div>
        </div>
      </nav>

      <main style={styles.main}>
        {viewMode === 'upload' && (
          <div style={styles.uploadSection}>
            <div
              style={{
                ...styles.uploadArea,
                ...(isDragging ? styles.uploadAreaDragging : {}),
              }}
              className="upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <i
                className="fas fa-cloud-upload-alt"
                style={{
                  fontSize: 48,
                  color: '#6366f1',
                  marginBottom: 16,
                  animation: isDragging ? 'pulse 0.6s ease infinite' : 'none',
                }}
              />
              <p style={styles.uploadTitle}>
                点击或拖拽CSV文件到此处上传
              </p>
              <p style={styles.uploadHint}>
                支持 .csv 格式，文件大小不超过 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            {isUploading && (
              <div style={styles.progressWrapper}>
                <div style={styles.progressBarContainer}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
                <p style={styles.progressText}>
                  解析中... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            {uploadError && (
              <div style={styles.errorBox}>
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: 8 }}
                />
                {uploadError}
              </div>
            )}
          </div>
        )}

        {(viewMode === 'list' || viewMode === 'edit') && (
          <div style={styles.contentArea}>
            <div style={styles.contentRow}>
              <div
                style={{
                  ...styles.panel,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <StudentList
                  students={students}
                  onSelect={handleEditStudent}
                  onDownload={handleDownload}
                  isDownloading={isDownloading}
                  downloadProgress={downloadProgress}
                  currentStudentId={currentStudentId}
                  onGoUpload={() => {
                    setViewMode('upload');
                    setCurrentStudentId(null);
                    setCurrentStudent(null);
                  }}
                />
              </div>

              <div
                style={{
                  ...styles.panel,
                  flex: 1,
                  minWidth: 0,
                  display: viewMode === 'edit' && currentStudent ? 'block' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {viewMode === 'edit' && currentStudent ? (
                  <ReportEditor
                    student={currentStudent}
                    onUpdate={handleUpdateStudent}
                    onBack={handleBackToList}
                  />
                ) : (
                  <div style={styles.emptyHint}>
                    <i
                      className="fas fa-edit"
                      style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }}
                    />
                    <p style={{ color: '#6b7280', fontSize: 14 }}>
                      选择左侧学生的"编辑"按钮查看和修改成绩单
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  navbar: {
    height: 56,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 600,
    color: '#6366f1',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 14,
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px 20px 24px',
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 60,
  },
  uploadArea: {
    width: 600,
    height: 200,
    border: '2px dashed #6366f1',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  uploadAreaDragging: {
    transform: 'scale(1.02)',
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 6,
  },
  uploadHint: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressWrapper: {
    width: 600,
    marginTop: 24,
    animation: 'flyIn 0.4s ease',
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #10b981)',
    borderRadius: 5,
    transition: 'width 0.2s ease',
    backgroundSize: '200% 100%',
    animation: 'progressShine 1.5s linear infinite',
  },
  progressText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorBox: {
    width: 600,
    marginTop: 20,
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 8,
    fontSize: 14,
    border: '1px solid #fecaca',
    display: 'flex',
    alignItems: 'center',
    animation: 'flyIn 0.3s ease',
  },
  contentArea: {
    animation: 'flyIn 0.35s ease',
  },
  contentRow: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    minHeight: 500,
  },
  emptyHint: {
    textAlign: 'center',
    padding: 40,
  },
};

export default App;
