import { useState, useRef } from 'react';
import type { Song } from '../types';

interface Props {
  song: Song;
}

export default function SongCard({ song }: Props) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const coverEmojis = ['🎸', '🎹', '🎤', '🎷', '🎻', '🥁', '🎵'];
  const emoji = coverEmojis[song.id.charCodeAt(song.id.length - 1) % coverEmojis.length];

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (contentRef.current) {
      contentRef.current.style.maxHeight = next
        ? `${contentRef.current.scrollHeight}px`
        : '0px';
    }
  };

  return (
    <div className="song-card">
      <div className="song-cover">{emoji}</div>
      <div className="song-title">{song.title}</div>
      <div className="song-genres">
        {song.genre.map((g, i) => (
          <span key={i} className="song-genre-tag">{g}</span>
        ))}
      </div>
      <div
        ref={contentRef}
        className="lyrics-content"
        style={{ maxHeight: '0px' }}
      >
        <div className="lyrics-text">{song.lyrics}</div>
      </div>
      <span className="lyrics-toggle" onClick={toggleExpand}>
        {expanded ? '收起歌词 ▲' : '展开歌词 ▼'}
      </span>
    </div>
  );
}
