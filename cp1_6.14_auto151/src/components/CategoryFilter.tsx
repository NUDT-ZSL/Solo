interface CategoryFilterProps {
  categories: string[]
  selected: string
  onChange: (cat: string) => void
}

export default function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          style={{
            padding: '6px 18px', borderRadius: 20, border: 'none',
            background: selected === cat ? '#f59e0b' : '#374151',
            color: selected === cat ? '#fff' : '#d1d5db',
            fontSize: 13, fontWeight: selected === cat ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
