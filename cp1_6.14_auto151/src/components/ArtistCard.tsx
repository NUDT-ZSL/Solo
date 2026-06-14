import { Artist } from '../types'

interface ArtistCardProps {
  artist: Artist
  onClick: (id: string) => void
}

export default function ArtistCard({ artist, onClick }: ArtistCardProps) {
  return (
    <div
      onClick={() => onClick(artist.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: '#1f2937', borderRadius: 12,
        cursor: 'pointer', transition: 'background 0.2s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#374151' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#1f2937' }}
    >
      <img
        src={artist.avatar}
        alt={artist.name}
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>{artist.name}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {artist.bio}
        </div>
      </div>
    </div>
  )
}
