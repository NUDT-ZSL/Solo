import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import CurveCanvas, { type CurveCanvasHandle } from '../components/CurveCanvas';
import ShareCard from '../components/ShareCard';
import { useApi } from '../hooks/useApi';
import type { ControlPoint, FlavorTag } from '../types';

const CURRENT_USER_ID = 'user-001';

const defaultFlavorTags: FlavorTag[] = [
  { id: '1', name: '花香味', selected: false },
  { id: '2', name: '水果味', selected: false },
  { id: '3', name: '巧克力味', selected: false },
  { id: '4', name: '坚果味', selected: false },
  { id: '5', name: '焦糖味', selected: false },
  { id: '6', name: '茶感', selected: false },
  { id: '7', name: '柑橘', selected: false },
  { id: '8', name: '莓果', selected: false },
];

const defaultControlPoints: ControlPoint[] = [
  { time: 0, temperature: 150 },
  { time: 3, temperature: 175 },
  { time: 6, temperature: 195 },
  { time: 9, temperature: 210 },
  { time: 12, temperature: 220 },
  { time: 15, temperature: 225 },
];

const processOptions = ['水洗', '日晒', '蜜处理', '厌氧'];
const roastLevelOptions = ['极浅烘', '浅烘', '中烘', '中深烘', '深烘'];

const pageWrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--color-bg)',
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  backgroundColor: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const headerContainerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '0 16px',
};

const headerInnerStyle: React.CSSProperties = {
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const headerLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const backButtonStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  transition: 'background-color 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-display)',
};

const saveButtonBaseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: 500,
  color: 'white',
  transition: 'all 0.2s ease',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  background: 'linear-gradient(to right, var(--color-primary), var(--color-primary-dark))',
};

const saveButtonDisabledStyle: React.CSSProperties = {
  ...saveButtonBaseStyle,
  opacity: 0.6,
  cursor: 'not-allowed',
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px 16px',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '24px',
};

const desktopGridStyle: React.CSSProperties = {
  ...mainContentStyle,
  gridTemplateColumns: '1fr 360px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-display)',
  marginBottom: '4px',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '14px',
  color: 'var(--color-text)',
  backgroundColor: 'var(--color-surface)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '100px',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.6,
};

const optionsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const optionButtonStyle = (selected: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '8px',
  border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
  backgroundColor: selected ? 'var(--color-primary-light)' : 'transparent',
  color: selected ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
  fontSize: '13px',
  fontWeight: selected ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
});

const flavorTagsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const flavorTagStyle = (selected: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '999px',
  border: `1px solid ${selected ? '#ff8f00' : 'var(--color-border)'}`,
  backgroundColor: selected ? '#fff3e0' : 'transparent',
  color: selected ? '#e65100' : 'var(--color-text-secondary)',
  fontSize: '13px',
  fontWeight: selected ? 500 : 400,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
});

const curveSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const curveCanvasWrapStyle: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
  display: 'flex',
  justifyContent: 'center',
  padding: '16px 0',
  backgroundColor: '#fafafa',
  borderRadius: '8px',
};

const curveTipStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
};

const shareCardPreviewStyle: React.CSSProperties = {
  position: 'sticky',
  top: '88px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const shareCardContainerStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: '#f5f0e8',
  borderRadius: '12px',
  padding: '20px',
  boxSizing: 'border-box',
};

const CreateRecordPage: React.FC = () => {
  const navigate = useNavigate();
  const { request } = useApi();
  const canvasRef = useRef<CurveCanvasHandle>(null);

  const [beanOrigin, setBeanOrigin] = useState('');
  const [processMethod, setProcessMethod] = useState('水洗');
  const [roastLevel, setRoastLevel] = useState('中烘');
  const [flavorTags, setFlavorTags] = useState<FlavorTag[]>(defaultFlavorTags);
  const [notes, setNotes] = useState('');
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>(defaultControlPoints);
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleFlavorTagToggle = (tagId: string) => {
    setFlavorTags((prev) =>
      prev.map((tag) =>
        tag.id === tagId ? { ...tag, selected: !tag.selected } : tag
      )
    );
  };

  const handleControlPointsChange = (points: ControlPoint[]) => {
    setControlPoints(points);
  };

  const handleSave = async () => {
    if (!beanOrigin.trim()) {
      alert('请输入咖啡豆产地');
      return;
    }

    if (!canvasRef.current) {
      alert('曲线画布未初始化');
      return;
    }

    setSaving(true);

    try {
      const curveImage = canvasRef.current.getCurveImage();

      const selectedTags = flavorTags.filter((tag) => tag.selected);

      const recordData = {
        userId: CURRENT_USER_ID,
        beanOrigin: beanOrigin.trim(),
        processMethod,
        roastLevel,
        flavorTags: selectedTags,
        notes: notes.trim(),
        controlPoints,
        curveImage,
      };

      const result = await request('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData),
      });

      if (result) {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to save record:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const getShareCardRoastLevel = (level: string): 'light' | 'medium' | 'dark' => {
    const map: Record<string, 'light' | 'medium' | 'dark'> = {
      '极浅烘': 'light',
      '浅烘': 'light',
      '中烘': 'medium',
      '中深烘': 'medium',
      '深烘': 'dark',
      light: 'light',
      medium: 'medium',
      dark: 'dark',
    };
    return map[level] || 'medium';
  };

  return (
    <div style={pageWrapStyle}>
      <header style={headerStyle}>
        <div style={headerContainerStyle}>
          <div style={headerInnerStyle}>
            <div style={headerLeftStyle}>
              <button
                style={backButtonStyle}
                onClick={handleBack}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'var(--color-bg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'transparent';
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h1 style={headerTitleStyle}>创建烘焙记录</h1>
            </div>
            <button
              style={saving ? saveButtonDisabledStyle : saveButtonBaseStyle}
              onClick={handleSave}
              disabled={saving}
              onMouseEnter={(e) => {
                if (!saving) {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    'translateY(-1px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 4px 12px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </header>

      <main style={mainContentStyle} className="create-record-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>基本信息</h2>

            <div style={formGroupStyle}>
              <label style={labelStyle}>咖啡豆产地</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="例如：埃塞俄比亚 耶加雪菲"
                value={beanOrigin}
                onChange={(e) => setBeanOrigin(e.target.value)}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    'var(--color-primary)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    'var(--color-border)';
                }}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>处理法</label>
              <div style={optionsRowStyle}>
                {processOptions.map((option) => (
                  <button
                    key={option}
                    style={optionButtonStyle(processMethod === option)}
                    onClick={() => setProcessMethod(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>烘焙度</label>
              <div style={optionsRowStyle}>
                {roastLevelOptions.map((option) => (
                  <button
                    key={option}
                    style={optionButtonStyle(roastLevel === option)}
                    onClick={() => setRoastLevel(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>风味标签</label>
              <div style={flavorTagsContainerStyle}>
                {flavorTags.map((tag) => (
                  <button
                    key={tag.id}
                    style={flavorTagStyle(tag.selected)}
                    onClick={() => handleFlavorTagToggle(tag.id)}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>烘焙笔记</label>
              <textarea
                style={textareaStyle}
                placeholder="记录这次烘焙的心得体会..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor =
                    'var(--color-primary)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor =
                    'var(--color-border)';
                }}
              />
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>烘焙曲线</h2>
            <div style={curveSectionStyle}>
              <div style={curveCanvasWrapStyle}>
                <CurveCanvas
                  ref={canvasRef}
                  controlPoints={controlPoints}
                  onChange={handleControlPointsChange}
                />
              </div>
              <p style={curveTipStyle}>拖拽控制点调整烘焙曲线</p>
            </div>
          </div>
        </div>

        <div style={shareCardPreviewStyle}>
          <h2 style={cardTitleStyle}>分享卡片预览</h2>
          <div style={shareCardContainerStyle}>
            <div
              style={{
                width: '100%',
                maxWidth: '280px',
                transform: 'scale(1)',
                transformOrigin: 'top center',
              }}
            >
              <ShareCard
                beanOrigin={beanOrigin || '未填写产地'}
                processMethod={processMethod}
                roastLevel={getShareCardRoastLevel(roastLevel)}
                flavorTags={flavorTags}
                notes={notes}
                controlPoints={controlPoints}
                userName="烘焙师"
              />
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          .create-record-main {
            grid-template-columns: 1fr 360px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateRecordPage;
