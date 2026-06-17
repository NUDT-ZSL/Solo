import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={codeStyle}>404</h1>
        <h2 style={titleStyle}>页面不存在</h2>
        <p style={descriptionStyle}>
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <Link to="/" className="btn btn-primary" style={buttonStyle}>
          返回首页
        </Link>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(100vh - 48px)',
  padding: '24px 16px',
};

const contentStyle: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: 400,
};

const codeStyle: React.CSSProperties = {
  fontSize: 120,
  fontWeight: 700,
  color: 'var(--primary-color)',
  marginBottom: 8,
  lineHeight: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 12,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
  marginBottom: 24,
  lineHeight: 1.6,
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
};

export default NotFound;
