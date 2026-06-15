import { motion, AnimatePresence } from 'framer-motion';
import { PlanetData } from '@/astronomy/planetData';

interface InfoCardProps {
  planet: PlanetData | null;
  onClose: () => void;
}

export default function InfoCard({ planet, onClose }: InfoCardProps) {
  return (
    <AnimatePresence>
      {planet && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <motion.div
            initial={{ x: 300, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 300, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              width: 320,
              maxWidth: 'calc(100vw - 48px)',
              zIndex: 1000,
              borderRadius: 16,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(136, 204, 255, 0.3)',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: 'white',
            }}
            whileHover={{
              boxShadow: '0 0 30px rgba(136, 204, 255, 0.2)',
            }}
          >
            <div
              style={{
                position: 'relative',
                height: 120,
                background: `linear-gradient(135deg, ${planet.color}40, transparent 70%),
                            radial-gradient(circle at 30% 50%, ${planet.color}30, transparent 50%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  width: 180,
                  height: 180,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${planet.color}, ${planet.color}80 40%, transparent 70%)`,
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: planet.color,
                  boxShadow: `0 0 40px ${planet.color}60, inset -10px -10px 30px rgba(0,0,0,0.3)`,
                  zIndex: 1,
                }}
              />
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
                whileHover={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  scale: 1.1,
                }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: '#88ccff',
                  }}
                >
                  {planet.nameCN}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    fontSize: 11,
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {planet.name}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                    直径
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {planet.diameter.toLocaleString()} km
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                    公转周期
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {planet.orbitPeriod.toLocaleString()} 地球日
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                    距太阳距离
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {planet.distanceFromSun.toLocaleString()} 百万公里
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  简介
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
                  {planet.description}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
