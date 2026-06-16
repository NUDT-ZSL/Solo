import type { Song } from '../types';

interface SongSelectorProps {
  songs: Song[];
  onSelectSong: (song: Song) => void;
  onBack: () => void;
}

const difficultyConfig: Record<string, { color: string; label: string; stars: number }> = {
  easy: { color: '#4CAF50', label: '简单', stars: 1 },
  normal: { color: '#FFD93D', label: '普通', stars: 2 },
  hard: { color: '#E74C3C', label: '困难', stars: 3 }
};

export default function SongSelector({ songs, onSelectSong, onBack }: SongSelectorProps) {
  return (
    <div style={{ width: '100%', maxWidth: '900px' }}>
      <button 
        className="btn btn-secondary" 
        onClick={onBack}
        style={{ marginBottom: '20px' }}
      >
        ← 返回舞台
      </button>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        padding: '20px'
      }}>
        {songs.map(song => {
          const config = difficultyConfig[song.difficulty];
          return (
            <div
              key={song.id}
              onClick={() => onSelectSong(song)}
              style={{
                width: '280px',
                backgroundColor: '#3E4A5E',
                borderRadius: '10px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease-out',
                justifySelf: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4C5C72';
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3E4A5E';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '40px',
                textAlign: 'center',
                marginBottom: '10px'
              }}>
                {song.difficulty === 'easy' ? '🎵' : song.difficulty === 'normal' ? '🎶' : '🎸'}
              </div>
              
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#E0E0E0',
                textAlign: 'center',
                marginBottom: '10px'
              }}>
                {song.name}
              </h3>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                fontSize: '13px',
                color: '#95A5A6'
              }}>
                <span>BPM: {song.bpm}</span>
                <span>时长: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  backgroundColor: config.color,
                  color: '#FFFFFF',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {config.label}
                </span>
                
                <div style={{ color: '#FFD93D' }}>
                  {'★'.repeat(config.stars)}{'☆'.repeat(3 - config.stars)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
