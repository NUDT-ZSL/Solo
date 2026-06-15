interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = '搜索食谱、食材...' }: SearchBarProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#999"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '42px',
          padding: '0 40px 0 42px',
          border: '1px solid #E0E0E0',
          borderRadius: 'var(--radius)',
          fontSize: '14px',
          backgroundColor: '#FAFAFA',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 140, 0, 0.1)';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E0E0E0';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.backgroundColor = '#FAFAFA';
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: '#E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#CCC')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
