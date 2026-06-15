interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export default function TagFilter({ tags, selectedTags, onToggleTag }: TagFilterProps) {
  return (
    <div className="tag-filter-bar">
      <span className="tag-filter-label">标签筛选：</span>
      {tags.map((tag) => (
        <button
          key={tag}
          className={`tag-pill ${selectedTags.includes(tag) ? 'active' : ''}`}
          onClick={() => onToggleTag(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
