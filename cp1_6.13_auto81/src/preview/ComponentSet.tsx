import React, { memo } from 'react';

const componentStyles: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  userSelect: 'none',
};

export const Button = memo(({
  variant = 'primary',
  children,
  disabled = false,
}: {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const baseStyles: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.3s ease, transform 0.3s ease, filter 0.3s ease',
    opacity: disabled ? 0.6 : 1,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--primary, #3b82f6)',
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: 'var(--secondary, #6b7280)',
      color: '#ffffff',
    },
    danger: {
      backgroundColor: 'var(--accent, #ef4444)',
      color: '#ffffff',
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...componentStyles,
  };

  return (
    <button
      style={combinedStyles}
      disabled={disabled}
      className="colorplay-btn"
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'brightness(1.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'brightness(1)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(0.98)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export const Card = memo(({
  variant = 'solid',
  title,
  children,
}: {
  variant?: 'solid' | 'gradient';
  title?: string;
  children: React.ReactNode;
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px var(--shadow-color, rgba(0,0,0,0.08))',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    solid: {
      backgroundColor: 'var(--background, #ffffff)',
    },
    gradient: {
      background: `linear-gradient(135deg, var(--primary, #3b82f6), var(--secondary, #6b7280))`,
    },
  };

  const textColor = variant === 'gradient' ? '#ffffff' : 'var(--text, #1f2937)';

  return (
    <div
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...componentStyles,
      }}
      className="colorplay-card"
    >
      {title && (
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: textColor,
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ color: textColor, fontSize: '14px', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export const Input = memo(({
  placeholder = '请输入内容...',
  type = 'text',
}: {
  placeholder?: string;
  type?: string;
}) => {
  const styles: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid var(--secondary, #e5e7eb)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backgroundColor: '#ffffff',
    ...componentStyles,
  };

  return (
    <input
      type={type}
      placeholder={placeholder}
      style={styles}
      className="colorplay-input"
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary, #3b82f6)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--secondary, #e5e7eb)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
});

Input.displayName = 'Input';

export const TextArea = memo(({
  placeholder = '请输入详细内容...',
}: {
  placeholder?: string;
}) => {
  const styles: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid var(--secondary, #e5e7eb)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '100px',
    resize: 'vertical',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backgroundColor: '#ffffff',
    fontFamily: "'Inter', system-ui, sans-serif",
    ...componentStyles,
  };

  return (
    <textarea
      placeholder={placeholder}
      style={styles}
      className="colorplay-textarea"
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary, #3b82f6)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--secondary, #e5e7eb)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
});

TextArea.displayName = 'TextArea';

export const NavBar = memo(({
  schemeName = 'ColorPlay',
}: {
  schemeName?: string;
}) => {
  const styles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: 'var(--primary, #1f2937)',
    borderRadius: '12px',
    ...componentStyles,
  };

  const navItemStyles: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'background-color 0.3s ease',
  };

  const NavItem = memo(({ label }: { label: string }) => (
    <span
      style={navItemStyles}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {label}
    </span>
  ));
  NavItem.displayName = 'NavItem';

  return (
    <nav style={styles} className="colorplay-navbar">
      <div
        style={{
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {schemeName}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <NavItem label="首页" />
        <NavItem label="产品" />
        <NavItem label="关于" />
      </div>
    </nav>
  );
});

NavBar.displayName = 'NavBar';

const ButtonGroup = memo(() => (
  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
    <Button variant="primary">主要按钮</Button>
    <Button variant="secondary">次要按钮</Button>
    <Button variant="danger">危险按钮</Button>
    <Button variant="primary" disabled>禁用按钮</Button>
  </div>
));
ButtonGroup.displayName = 'ButtonGroup';

const CardSection = memo(() => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
    <Card title="纯色卡片" variant="solid">
      这是一张使用背景色的纯色卡片。卡片内容区域展示使用文本色显示的文字内容。
    </Card>
    <Card title="渐变卡片" variant="gradient">
      这是一张使用主色和辅色渐变背景的卡片。渐变从135度角开始，营造现代感。
    </Card>
  </div>
));
CardSection.displayName = 'CardSection';

const InputSection = memo(() => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <Input placeholder="请输入用户名..." type="text" />
    <Input placeholder="请输入密码..." type="password" />
    <TextArea placeholder="请输入详细描述..." />
  </div>
));
InputSection.displayName = 'InputSection';

const FormSection = memo(() => (
  <Card title="表单示例" variant="solid">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text, #374151)' }}>
            姓名
          </label>
          <Input placeholder="张三" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px',