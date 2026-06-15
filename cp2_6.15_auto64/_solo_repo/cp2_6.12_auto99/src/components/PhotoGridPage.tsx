import { motion } from 'framer-motion';
import type { Album } from '../data/albums';

interface PhotoGridPageProps {
  albums: Album[];
  onSelectAlbum: (album: Album) => void;
}

export default function PhotoGridPage({ albums, onSelectAlbum }: PhotoGridPageProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#16213e',
        padding: '48px 32px',
        overflowY: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            fontSize: '36px',
            fontWeight: 600,
            color: '#f0f0f0',
            marginBottom: '8px',
          }}
        >
          光影相册
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ fontSize: '16px', color: '#888' }}
        >
          选择一个分类，开启你的视觉之旅
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {albums.map((album, index) => (
          <motion.div
            key={album.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
            onClick={() => onSelectAlbum(album)}
            whileHover={{ scale: 1.02 }}
            style={{
              position: 'relative',
              aspectRatio: '4 / 3',
              borderRadius: '12px',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'box-shadow 0.4s',
            }}
            whileHoverstyle={{
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <motion.img
              src={album.cover}
              alt={album.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 500,
                  color: '#f0f0f0',
                }}
              >
                {album.title}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
