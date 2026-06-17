import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, Clock, AlertCircle, Loader2, Flag } from 'lucide-react';
import { useExam } from '../hooks/useExam';

export function ExamPanel() {
  const { subject, subjectName } = useParams<{
    subject: string;
    subjectName?: string;
  }>();
  const navigate = useNavigate();

  const decodedSubjectName = useMemo(() => {
    if (subjectName) return decodeURIComponent(subjectName);
    const map: Record<string, string> = {
      'java-basic': 'Java基础',
      'project-management': '项目管理',
      'network-security': '网络安全',
    };
    return map[subject ?? ''] ?? subject ?? '';
  }, [subject, subjectName]);

  const exam = useExam(subject ?? '', decodedSubjectName);
  const {
    loading,
    error,
    currentIndex,
    totalQuestions,
    questions,
    selectedAnswer,
    formattedTime,
    markedCount,
    currentIsMarked,
    answeredCount,
    goToPrev,
    goToNext,
    selectAnswer,
    toggleMark,
    canSubmit,
    submitting,
    submitExam,
  } = exam;

  const currentQ = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const answeredPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7fafc' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin" style={{ color: '#3182ce', width: 40, height: 40 }} />
          <p style={{ color: '#4a5568', fontSize: 16 }}>正在加载题目...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7fafc' }}>
        <div
          className="flex flex-col items-center gap-4 p-8"
          style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <AlertCircle style={{ color: '#e53e3e', width: 48, height: 48 }} />
          <p style={{ color: '#e53e3e', fontSize: 16, fontWeight: 500 }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 24px',
              background: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: '#f7fafc' }}
    >
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 p-5"
          style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#2d3748',
                marginBottom: 4,
              }}
            >
              {decodedSubjectName} 模拟考试
            </div>
            <div style={{ fontSize: 13, color: '#718096' }}>
              已答 <span style={{ color: '#3182ce', fontWeight: 600 }}>{answeredCount}</span> /
              {totalQuestions} 题
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{
              background: '#fff5f5',
              borderRadius: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Clock style={{ color: '#e53e3e', width: 18, height: 18 }} />
            <span
              style={{
                fontFamily: 'monospace',
                color: '#e53e3e',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {formattedTime}
            </span>
          </div>
        </div>

        <div
          className="h-1.5 mb-6 overflow-hidden"
          style={{ background: '#e2e8f0', borderRadius: 100 }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background:
                'linear-gradient(90deg, #3182ce, #00b5d8)',
              borderRadius: 100,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div
          className="p-6 sm:p-8 mb-6"
          style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="mb-6"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                color: '#718096',
              }}
            >
              <span
                style={{
                  padding: '4px 12px',
                  background: '#e6fffa',
                  color: '#00b5d8',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {currentQ.category}
              </span>
              <span>
                第{' '}
                <span style={{ color: '#3182ce', fontWeight: 700 }}>
                  {currentIndex + 1}
                </span>{' '}
                / {totalQuestions} 题
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginLeft: 8,
                  paddingLeft: 12,
                  borderLeft: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontSize: 13, color: '#718096' }}>
                  答题进度
                </span>
                <div
                  style={{
                    width: 100,
                    height: 6,
                    background: '#e2e8f0',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${answeredPercent}%`,
                      background: '#3182ce',
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: '#3182ce',
                    fontWeight: 600,
                    minWidth: 32,
                  }}
                >
                  {answeredCount}题
                </span>
              </div>
            </div>
            {currentIsMarked && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  background: '#fff5f5',
                  borderRadius: 6,
                  color: '#e53e3e',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Flag style={{ width: 14, height: 14 }} />
                已标记
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 17,
              color: '#2d3748',
              lineHeight: 1.8,
              marginBottom: 28,
              fontWeight: 500,
              whiteSpace: 'pre-line',
            }}
          >
            {currentIndex + 1}. {currentQ.text}
          </div>

          <div className="flex flex-col gap-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      'scale(0.992)';
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                  }}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 8,
                    border: 'none',
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    background: isSelected ? '#3182ce' : 'white',
                    color: isSelected ? 'white' : '#2d3748',
                    boxShadow: isSelected
                      ? '0 0 0 2px #bee3f8, 0 4px 12px rgba(49,130,206,0.2)'
                      : '0 1px 3px rgba(0,0,0,0.06)',
                    fontSize: 15,
                    textAlign: 'left',
                    transition:
                      'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.1s',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      background: isSelected ? 'rgba(255,255,255,0.2)' : '#edf2f7',
                      color: isSelected ? 'white' : '#4a5568',
                      flexShrink: 0,
                    }}
                  >
                    {optionLabels[idx]}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
          style={{
            background: 'white',
            padding: '16px 20px',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              onMouseDown={(e) => {
                if (currentIndex !== 0)
                  (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              style={{
                padding: '12px 22px',
                borderRadius: 8,
                border: currentIndex === 0 ? '1px solid #e2e8f0' : '1px solid #cbd5e0',
                background: 'white',
                color: currentIndex === 0 ? '#a0aec0' : '#4a5568',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                transition: 'transform 0.1s, opacity 0.2s',
                opacity: currentIndex === 0 ? 0.6 : 1,
              }}
            >
              <ChevronLeft style={{ width: 18, height: 18 }} />
              上一题
            </button>
            <button
              onClick={toggleMark}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                border: currentIsMarked ? '1px solid #fc8181' : '1px solid #e2e8f0',
                background: currentIsMarked ? '#fff5f5' : 'white',
                color: currentIsMarked ? '#e53e3e' : '#4a5568',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                transition: 'transform 0.1s, background 0.2s, color 0.2s, border-color 0.2s',
              }}
            >
              <Flag
                style={{
                  width: 16,
                  height: 16,
                  fill: currentIsMarked ? '#e53e3e' : 'none',
                }}
              />
              {currentIsMarked ? '取消标记' : '标记本题'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {currentIndex === totalQuestions - 1 && canSubmit && markedCount > 0 && (
              <span
                style={{
                  fontSize: 14,
                  color: '#e53e3e',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Flag style={{ width: 14, height: 14, fill: '#e53e3e' }} />
                还有 {markedCount} 道标记题目待复查
              </span>
            )}
            {currentIndex === totalQuestions - 1 ? (
              <button
                onClick={submitExam}
                disabled={!canSubmit || submitting}
                onMouseDown={(e) => {
                  if (canSubmit && !submitting)
                    (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
                style={{
                  padding: '12px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: canSubmit && !submitting ? '#3182ce' : '#cbd5e0',
                  color: 'white',
                  cursor:
                    canSubmit && !submitting ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  transition: 'background 0.2s, transform 0.1s',
                }}
              >
                {submitting ? (
                  <Loader2
                    className="animate-spin"
                    style={{ width: 18, height: 18 }}
                  />
                ) : (
                  <Send style={{ width: 18, height: 18 }} />
                )}
                {submitting ? '提交中...' : canSubmit ? '提交试卷' : '请答完所有题目'}
              </button>
            ) : (
              <button
                onClick={goToNext}
                disabled={currentIndex === totalQuestions - 1}
                onMouseDown={(e) => {
                  if (currentIndex !== totalQuestions - 1)
                    (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
                style={{
                  padding: '12px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: currentIndex === totalQuestions - 1 ? '#cbd5e0' : '#3182ce',
                  color: 'white',
                  cursor:
                    currentIndex === totalQuestions - 1
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'transform 0.1s, background 0.2s',
                  opacity: currentIndex === totalQuestions - 1 ? 0.6 : 1,
                }}
              >
                下一题
                <ChevronRight style={{ width: 18, height: 18 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
