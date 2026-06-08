import React from 'react';
import { Copy, Music } from 'lucide-react';
import type { Playlist } from './types';

interface Props {
  playlist: Playlist;
  onClick: () => void;
  onCopyShare: (e: React.MouseEvent) => void;
}

const PlaylistCard: React.FC<Props> = ({ playlist, onClick, onCopyShare }) => {
  return (
    <div className="playlist-card" onClick={onClick}>
      <div className="playlist-card-header">
        <div className="playlist-card-title">{playlist.title}</div>
        <button className="btn-copy" onClick={onCopyShare} title="复制分享链接">
          <Copy size={14} />
          <span>分享</span>
        </button>
      </div>
      <div className="playlist-card-desc">
        {playlist.description || '暂无描述'}
      </div>
      <div className="playlist-card-footer">
        <span className="song-count-badge">
          <Music size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {playlist.songs.length} 首
        </span>
        <span className="share-code">{playlist.shareCode}</span>
      </div>
    </div>
  );
};

export default PlaylistCard;
