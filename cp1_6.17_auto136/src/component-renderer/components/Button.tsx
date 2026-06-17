import React, { memo } from 'react';
import { ButtonProps } from '../../types';

/**
 * Spinner 加载图标 - 使用 CSS 旋转动画实现
 * 动画定义在 index.css 中的 .animate-spin 类
 */
const SpinnerIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="31.4 31.4"
      opacity="0.25"
    />
    <path
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const getColorByStatus = (status: string, themeColor: string) => {
  switch (status) {
    case 'success':
      return { bg: '#10B981', hoverBg: '#059669', ring: 'rgba(16, 185, 129, 0.3)' };
    case 'error':
      return { bg: '#EF4444', hoverBg: '#DC2626', ring: 'rgba(239, 68, 68, 0.3)' };
    case 'disabled':
      return { bg: '#9CA3AF', hoverBg: '#9CA3AF', ring: 'transparent' };
    default:
      return { bg: themeColor, hoverBg: darkenColor(themeColor, 10), ring: `${themeColor}4D` };
  }
};

const darkenColor = (color: string, percent: number) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

/**
 * 按钮组件 - Button
 *
 * 数据流向：
 * - 从 ComponentRenderer 接收 props（通过展开运算符传递）
 * - 支持 7 种状态：默认、悬停、聚焦、禁用、加载、成功、错误
 * - 状态优先级：禁用/加载 > 成功/错误 > 默认/悬停/聚焦
 *
 * 性能优化：
 * - 使用 React.memo 包裹，避免不必要的重渲染
 * - 状态计算函数在组件外定义，避免每次渲染重新创建
 */
const Button: React.FC<ButtonProps> = memo((props) => {
  const {
    text,
    size,
    themeColor,
    disabled,
    loading,
    status,
    icon,
  } = props;

  // 计算是否禁用：disabled 属性为 true，或 status 为 disabled/loading，或 loading 属性为 true
  const isDisabled = disabled || status === 'disabled' || loading || status === 'loading';
  const currentStatus = status === 'disabled' || status === 'loading' ? status : (isDisabled ? 'disabled' : status);
  const colors = getColorByStatus(currentStatus, themeColor);

  // 尺寸样式映射
  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { padding: '6px 14px', fontSize: '12px', gap: '6px' },
    medium: { padding: '10px 20px', fontSize: '14px', gap: '8px' },
    large: { padding: '14px 28px', fontSize: '16px', gap: '10px' },
  };

  // 基础按钮样式
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeStyles[size],
    border: 'none',
    borderRadius: '8px',
    backgroundColor: colors.bg,
    color: '#FFFFFF',
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none',
    opacity: isDisabled ? 0.7 : 1,
    boxShadow: currentStatus === 'focus' ? `0 0 0 3px ${colors.ring}` : 'none',
    position: 'relative',
    overflow: 'hidden',
  };

  // 悬停状态样式（仅在非禁用时生效）
  const hoverStyle: React.CSSProperties = currentStatus === 'hover' && !isDisabled
    ? { backgroundColor: colors.hoverBg, transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }
    : {};

  // 图标尺寸
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 16 : 18;

  // 渲染按钮左侧图标区域
  const renderLeftIcon = () => {
    if (status === 'loading' || loading) {
      // 加载状态：显示旋转 spinner 动画，禁用点击
      return <SpinnerIcon size={iconSize} />;
    }
    if (status === 'success') {
      return <CheckIcon size={iconSize} />;
    }
    if (status === 'error') {
      return <XIcon size={iconSize} />;
    }
    if (icon) {
      return <span style={{ display: 'inline-flex', fontSize: `${iconSize}px`, lineHeight: 1 }}>{icon}</span>;
    }
    return null;
  };

  return (
    <button
      style={{ ...baseStyle, ...hoverStyle }}
      disabled={isDisabled}
      onMouseEnter={() => {}}
      onFocus={() => {}}
    >
      {renderLeftIcon()}
      <span>{text}</span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
