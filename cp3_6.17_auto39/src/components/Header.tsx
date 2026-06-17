import React from 'react';

interface HeaderProps {
  courseTitle: string;
  filterTag: string | null;
  allTags: string[];
  onTagChange: (tag: string | null) => void;
  currentUser: { name: string; role: string } | null;
  onUserChange: () => void;
}

const Header: React.FC<HeaderProps> = ({
  courseTitle,
  filterTag,
  allTags,
  onTagChange,
  currentUser,
  onUserChange
}) => {
  return (
    <header
      style={{
        height: 56,
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <div
          style={{
            width: 32,
            height: 32,
            backgroundColor: '#1a237e',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            marginRight: 12
          }}
        >
          知
        </div>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#212121', margin: 0 }}>
          {courseTitle}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#757575' }}>标签过滤:</span>
          <select
            value={filterTag || ''}
            onChange={e => onTagChange(e.target.value || null)}
            style={{
              padding: '6px 10px',
              border: '1px solid #e0e0e0',
              borderRadius: 4,
              fontSize: 13,
              backgroundColor: '#fff',
              color: '#212121',
              cursor: 'pointer'
            }}
          >
            <option value="">全部标签</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onUserChange}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: 4,
            backgroundColor: '#fff',
            fontSize: 13,
            color: '#212121',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#00bcd4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600
            }}
          >
            {currentUser?.name?.charAt(0) || '?'}
          </div>
          <span>{currentUser?.name || '访客'}</span>
          <span style={{ fontSize: 11, color: '#9e9e9e' }}>
            ({currentUser?.role === 'teacher' ? '教师' : '学生'})
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
