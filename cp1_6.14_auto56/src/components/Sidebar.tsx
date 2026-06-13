import { useState } from 'react';
import { getStylePresets, StylePreset } from '../utils/specGenerator';

interface SidebarProps {
  onGenerate: (projectName: string, description: string, styles: string[]) => void;
}

const Sidebar = ({ onGenerate }: SidebarProps) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const stylePresets = getStylePresets();

  const handleStyleToggle = (styleId: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(styleId)) {
        return prev.filter(s => s !== styleId);
      } else if (prev.length < 2) {
        return [...prev, styleId];
      }
      return prev;
    });
  };

  const handleGenerate = () => {
    const name = projectName.trim() || '未命名项目';
    const desc = description.trim() || '一个设计项目';
    onGenerate(name, desc, selectedStyles);
    setMobileExpanded(false);
  };

  const sidebarClass = `sidebar ${mobileExpanded ? 'sidebar-mobile-expanded' : ''}`;

  return (
    <aside className={sidebarClass}>
      <div style={logoSectionStyle}>
        <div style={logoIconStyle}>DS</div>
        <h1 style={titleStyle}>DesignSpec Gen</h1>
      </div>

      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileExpanded(!mobileExpanded)}
      >
        {mobileExpanded ? '收起' : '菜单'}
      </button>

      <div className="input-section" style={inputSectionStyle}>
        <label style={labelStyle}>项目名称</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="例如：Lumin Coffee"
          className="input-field"
        />
      </div>

      <div className="input-section" style={inputSectionStyle}>
        <label style={labelStyle}>项目描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：一个面向年轻人的咖啡品牌官网"
          className="input-field"
          style={{ resize: 'vertical', minHeight: '80px' }}
          rows={3}
        />
      </div>

      <div className="input-section" style={inputSectionStyle}>
        <label style={labelStyle}>
          风格偏好 <span style={hintStyle}>(最多选择2个)</span>
        </label>
        <div className="tag-container" style={tagContainerStyle}>
          {stylePresets.map((preset: StylePreset) => (
            <button
              key={preset.id}
              onClick={() => handleStyleToggle(preset.id)}
              className={`style-tag ${selectedStyles.includes(preset.id) ? 'active' : ''}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={handleGenerate} 
        className="generate-button"
      >
        生成规范
      </button>
    </aside>
  );
};

const logoSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e9ecef',
};

const logoIconStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  backgroundColor: '#4361ee',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '16px',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#212529',
  margin: 0,
  whiteSpace: 'nowrap',
};

const inputSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#495057',
};

const hintStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 400,
  color: '#868e96',
};

const tagContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

export default Sidebar;
