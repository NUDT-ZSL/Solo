import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import FlipNumber from './FlipNumber';

interface User {
  id: string;
  name: string;
  avatar: string;
  totalHours: number;
}

interface BadgeConfig {
  type: string;
  name: string;
  minHours: number;
  gradient: string;
  glowColor: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = [
  {
    type: 'bronze',
    name: '铜质服务者',
    minHours: 50,
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #B87333 50%, #8B4513 100%)',
    glowColor: 'rgba(205, 127, 50, 0.5)',
  },
  {
    type: 'silver',
    name: '银质奉献者',
    minHours: 200,
    gradient: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 50%, #808080 100%)',
    glowColor: 'rgba(192, 192, 192, 0.5)',
  },
  {
    type: 'gold',
    name: '金质领袖',
    minHours: 500,
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FDB931 50%, #DAA520 100%)',
    glowColor: 'rgba(255, 215, 0, 0.5)',
  },
];

const getBadgeByHours = (totalHours: number): BadgeConfig | null => {
  let highestBadge: BadgeConfig | null = null;
  for (const config of BADGE_CONFIGS) {
    if (totalHours >= config.minHours) {
      highestBadge = config;
    }
  }
  return highestBadge;
};

const BadgeIcon = ({ badge }: { badge: BadgeConfig }) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: badge.gradient,
        boxShadow: `0 0 20px ${badge.glowColor}, 0 4px 12px rgba(0,0,0,0.15)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
      >
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="white"
          fillOpacity="0.9"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
};

const UserCard = ({ user }: { user: User }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageUrl = user.avatar || '';

  useEffect(() => {
    setImageLoaded(false);
  }, [user.avatar]);

  const badge = getBadgeByHours(user.totalHours);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 8px 32px rgba(245, 166, 35, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        maxWidth: 480,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, #F5A623 0%, #F7E9D7 100%)',
        }}
      />

      <div style={{ position: 'relative', flexShrink: 0 }}>
        {!imageLoaded && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#F7E9D7',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
        )}
        <img
          src={imageUrl}
          alt={user.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid #F7E9D7',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        {!imageUrl && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#F7E9D7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
                fill="#F5A623"
                fillOpacity="0.5"
              />
              <path
                d="M12 14.5C8 15.5 4 17 4 20L20 20C20 17 16 15.5 12 14.5Z"
                fill="#F5A623"
                fillOpacity="0.5"
              />
            </svg>
          </motion.div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 22,
            fontWeight: 700,
            color: '#2D2D2D',
            letterSpacing: '-0.02em',
          }}
        >
          {user.name}
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: '#8B7355',
              fontWeight: 500,
            }}
          >
            累计工时：
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#F5A623',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'baseline',
            }}
          >
            <FlipNumber value={user.totalHours} duration={0.6} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#8B7355',
                marginLeft: 4,
              }}
            >
              小时
            </span>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {badge ? (
          <>
            <BadgeIcon badge={badge} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#8B7355',
                textAlign: 'center',
                maxWidth: 60,
              }}
            >
              {badge.name}
            </span>
          </>
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#F7E9D7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#D4C4B0"
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserCard;
