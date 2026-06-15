import { CharScore } from '../App';

interface SidebarProps {
  totalChars: number;
  completedCount: number;
  averageScore: number;
  scores: CharScore[];
  chars: string[];
  onGenerateReport: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  totalChars,
  completedCount,
  averageScore,
  scores,
  chars,
  onGenerateReport
}) => {
  const getScoreColor = (score: number) => {
    if (score > 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const getProgressGradient = (score: number) => {
    if (score > 80) return 'linear-gradient(90deg, #2ecc71, #27ae60)';
    if (score >= 60) return 'linear-gradient(90deg, #f1c40f, #f39c12)';
    return 'linear-gradient(90deg, #e74c3c, #c0392b)';
  };

  const sortedScores = [...scores].sort((a, b) => a.index - b.index);

  return (
    <div style={{
      width: '260px',
      background: '#2c3e50',
      color: '#ecf0f1',
      borderRadius: '12px',
      padding: '20px',
      height: 'fit-content'
    }}>
      <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #34495e', paddingBottom: '10px' }}>
        学习进度
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>已完成 / {totalChars}字</div>
          </div>
          <div style={{ width: '1px', height: '40px', background: '#34495e' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: getScoreColor(averageScore)
            }}>
              {averageScore || '--'}
            </div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>平均分</div>
          </div>
        </div>

        <div style={{
          height: '8px',
          background: '#34495e',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(completedCount / totalChars) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3498db, #2980b9)',
            transition: 'width 0.3s ease',
            borderRadius: '4px'
          }} />
        </div>
        <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '6px', textAlign: 'right' }}>
          {Math.round((completedCount / totalChars) * 100)}% 完成
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#bdc3c7' }}>各字得分</h4>
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {chars.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
              请选择古诗
            </div>
          ) : sortedScores.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
              开始临摹后这里显示得分
            </div>
          ) : (
            sortedScores.map((item) => (
              <div key={item.index} style={{
                marginBottom: '10px',
                padding: '8px 10px',
                background: 'rgba(52, 73, 94, 0.5)',
                borderRadius: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.char}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: getScoreColor(item.score)
                  }}>
                    {item.score}分
                  </span>
                </div>
                <div style={{
                  height: '12px',
                  background: '#34495e',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${item.score}%`,
                    height: '100%',
                    background: getProgressGradient(item.score),
                    borderRadius: '6px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={onGenerateReport}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#8e44ad',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background 0.2s, transform 0.1s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#9b59b6';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#8e44ad';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        📄 生成临摹报告
      </button>

      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: #34495e;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb {
          background: #7f8c8d;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #95a5a6;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
