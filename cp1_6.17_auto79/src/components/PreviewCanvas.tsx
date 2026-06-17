import React from 'react';
import type { DesignToken } from '../types/token';

interface PreviewCanvasProps {
  baseToken: DesignToken;
  userToken: DesignToken;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ baseToken, userToken }) => {
  return (
    <div style={styles.canvas}>
      <div style={styles.column}>
        <div style={styles.columnHeader}>
          <span style={styles.columnTitle}>基准样式</span>
          <span style={styles.columnSubtitle}>灰色主题</span>
        </div>
        <div style={styles.componentsContainer}>
          <ButtonComponent token={baseToken} isBase />
          <CardComponent token={baseToken} isBase />
          <InputComponent token={baseToken} isBase />
          <SwitchComponent token={baseToken} isBase />
        </div>
      </div>
      
      <div style={styles.divider} />
      
      <div style={styles.column}>
        <div style={styles.columnHeader}>
          <span style={styles.columnTitle}>自定义样式</span>
          <span style={styles.columnSubtitle}>用户调整</span>
        </div>
        <div style={styles.componentsContainer}>
          <ButtonComponent token={userToken} />
          <CardComponent token={userToken} />
          <InputComponent token={userToken} />
          <SwitchComponent token={userToken} />
        </div>
      </div>
    </div>
  );
};

interface ComponentProps {
  token: DesignToken;
  isBase?: boolean;
}

const ButtonComponent: React.FC<ComponentProps> = ({ token, isBase }) => {
  const buttonStyle: React.CSSProperties = {
    padding: '12px 32px',
    border: 'none',
    borderRadius: `${token.borderRadius}px`,
    backgroundColor: isBase ? '#E0E0E0' : token.backgroundColor,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: `${token.shadowOffsetX}px ${token.shadowOffsetY}px 8px rgba(0,0,0,0.15)`,
    transition: `all ${token.animationDuration}s ease-out`,
  };

  return (
    <div style={styles.componentWrapper}>
      <button style={buttonStyle}>
        按钮
      </button>
    </div>
  );
};

const CardComponent: React.FC<ComponentProps> = ({ token, isBase }) => {
  const cardStyle: React.CSSProperties = {
    width: '200px',
    height: '120px',
    borderRadius: `${token.borderRadius}px`,
    backgroundColor: isBase ? '#E0E0E0' : '#fff',
    boxShadow: `${token.shadowOffsetX}px ${token.shadowOffsetY}px 12px rgba(0,0,0,0.1)`,
    transition: `all ${token.animationDuration}s ease-out`,
    border: isBase ? 'none' : `2px solid ${token.backgroundColor}`,
  };

  return (
    <div style={styles.componentWrapper}>
      <div style={cardStyle}>
        <div style={{
          padding: '16px',
          fontSize: '14px',
          fontWeight: 600,
          color: isBase ? '#757575' : token.backgroundColor,
        }}>
          卡片标题
        </div>
        <div style={{
          padding: '0 16px',
          fontSize: '12px',
          color: '#9E9E9E',
        }}>
          这是一张示例卡片内容
        </div>
      </div>
    </div>
  );
};

const InputComponent: React.FC<ComponentProps> = ({ token, isBase }) => {
  const inputStyle: React.CSSProperties = {
    width: '200px',
    padding: '10px 16px',
    border: `2px solid ${isBase ? '#BDBDBD' : token.backgroundColor}`,
    borderRadius: `${token.borderRadius}px`,
    fontSize: '14px',
    outline: 'none',
    boxShadow: `${token.shadowOffsetX}px ${token.shadowOffsetY}px 6px rgba(0,0,0,0.08)`,
    transition: `all ${token.animationDuration}s ease-out`,
    backgroundColor: '#fff',
  };

  return (
    <div style={styles.componentWrapper}>
      <input
        type="text"
        placeholder="请输入内容..."
        style={inputStyle}
        readOnly
      />
    </div>
  );
};

const SwitchComponent: React.FC<ComponentProps> = ({ token, isBase }) => {
  const switchBgColor = isBase ? '#E0E0E0' : token.backgroundColor;

  const trackStyle: React.CSSProperties = {
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    backgroundColor: switchBgColor,
    position: 'relative',
    cursor: 'pointer',
    boxShadow: `${token.shadowOffsetX}px ${token.shadowOffsetY}px 6px rgba(0,0,0,0.15)`,
    transition: `all ${token.animationDuration}s ease-out`,
  };

  const thumbStyle: React.CSSProperties = {
    width: '22px',
    height: '22px',
    borderRadius: `${token.borderRadius}px`,
    backgroundColor: '#fff',
    position: 'absolute',
    top: '3px',
    left: '27px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: `all ${token.animationDuration}s ease-out`,
  };

  return (
    <div style={styles.componentWrapper}>
      <div style={trackStyle}>
        <div style={thumbStyle} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  canvas: {
    display: 'flex',
    height: '100%',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
  },
  columnHeader: {
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  columnTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#424242',
  },
  columnSubtitle: {
    fontSize: '12px',
    color: '#9E9E9E',
  },
  divider: {
    width: '1px',
    backgroundColor: '#BDBDBD',
    height: '100%',
  },
  componentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    flex: 1,
    justifyContent: 'center',
  },
  componentWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default PreviewCanvas;
