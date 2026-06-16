import SearchBar from '../components/SearchBar';
import ArtistCard from '../components/ArtistCard';
import { useArtists } from '../hooks/useData';

export default function HomePage() {
  const { artists, loading } = useArtists();
  const recommended = artists.slice(0, 6);

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '48px', marginTop: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>
          发现<span style={{ color: 'var(--accent-primary)' }}>独立音乐</span>的魅力
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '16px' }}>
          浏览音乐人作品，查看巡演安排，开启你的音乐之旅
        </p>
        <SearchBar />
      </div>

      <h2 className="page-title" style={{ marginTop: '40px' }}>推荐音乐人</h2>
      <p className="page-subtitle">精选独立音乐人，总有你喜欢的声音</p>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="artist-grid">
          {recommended.map((a, i) => (
            <ArtistCard key={a.id} artist={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
