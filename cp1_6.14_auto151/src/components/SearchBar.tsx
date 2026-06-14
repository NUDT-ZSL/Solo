interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = '搜索艺术品...' }: SearchBarProps) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 44, padding: '0 16px 0 44px',
          background: '#1e293b', border: '2px solid transparent',
          borderRadius: 8, color: '#f3f4f6', fontSize: 14,
          outline: 'none', transition: 'border-color 0.3s ease',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'transparent' }}
      />
      <svg
        width="20" height="20" viewBox="0 0 24 24"
        style={{ position: 'absolute', left: 14, top: 12, color: '#6b7280' }}
        fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
  )
}
