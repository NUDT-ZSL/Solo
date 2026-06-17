import { Card } from './CardData';

interface CardPreviewProps {
  card: Partial<Card>;
}

export default function CardPreview({ card }: CardPreviewProps) {
  const hasName = card.name && card.name.trim() !== '';

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>卡牌预览</h2>
      <div style={styles.cardWrapper}>
        <div className="card-template" style={{ position: 'relative' }}>
          <div style={styles.costBadge}>{card.cost ?? 0}</div>

          <div style={styles.artworkArea}>
            {hasName ? (
              <div style={styles.artworkPlaceholder}>
                <span style={styles.artworkIcon}>🎴</span>
              </div>
            ) : (
              <div style={styles.artworkPlaceholder}>
                <span style={styles.artworkIcon}>➕</span>
              </div>
            )}
          </div>

          <div style={styles.nameBar}>
            <span style={styles.cardName}>
              {hasName ? card.name : '未命名卡牌'}
            </span>
          </div>

          <div style={styles.descriptionArea}>
            <p style={styles.descriptionText}>
              {hasName
                ? `一张强大的${card.name}，在战场上发挥着关键作用。`
                : '请输入卡牌属性进行预览'}
            </p>
          </div>

          <div style={styles.statsArea}>
            <div style={styles.attackStat}>
              <span style={styles.attackValue}>{card.attack ?? 0}</span>
            </div>
            <div style={styles.healthStat}>
              <span style={styles.healthValue}>{card.health ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.infoPanel}>
        <h3 style={styles.infoTitle}>属性说明</h3>
        <div style={styles.infoList}>
          <div style={styles.infoItem}>
            <span style={{ ...styles.infoBadge, backgroundColor: '#FFD700' }}>
              💎
            </span>
            <span style={styles.infoText}>
              <strong>费用：</strong>召唤该卡牌所需的法力水晶
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={{ ...styles.infoBadge, backgroundColor: '#FF4444' }}>
              ⚔
            </span>
            <span style={styles.infoText}>
              <strong>攻击：</strong>每次攻击造成的伤害
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={{ ...styles.infoBadge, backgroundColor: '#44FF44' }}>
              ❤
            </span>
            <span style={styles.infoText}>
              <strong>生命：</strong>承受伤害的上限
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: '100%'
  },
  title: {
    color: '#E2E8F0',
    fontSize: '22px',
    fontWeight: 600,
    margin: 0
  },
  cardWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0'
  },
  cardTemplate: {
    position: 'relative',
    width: '280px',
    height: '400px',
    borderRadius: '16px',
    border: '2px solid #4A5568',
    background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
    overflow: 'hidden',
    boxShadow: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  costBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    color: '#1A1A2E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(255,215,0,0.4)',
    zIndex: 2
  },
  artworkArea: {
    height: '180px',
    margin: '8px',
    borderRadius: '10px',
    backgroundColor: '#1A1A2E',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  artworkPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  artworkIcon: {
    fontSize: '64px',
    opacity: 0.5
  },
  nameBar: {
    margin: '0 12px 8px 12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: 700,
    textAlign: 'center',
    display: 'block',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    letterSpacing: '0.5px'
  },
  descriptionArea: {
    margin: '0 12px',
    padding: '10px 12px',
    backgroundColor: 'rgba(15, 52, 96, 0.6)',
    borderRadius: '8px',
    minHeight: '56px'
  },
  descriptionText: {
    color: '#CBD5E1',
    fontSize: '12px',
    lineHeight: 1.5,
    margin: 0,
    textAlign: 'center'
  },
  statsArea: {
    position: 'absolute',
    bottom: '12px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 12px'
  },
  attackStat: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,68,68,0.2)',
    border: '2px solid #FF4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(255,68,68,0.3)'
  },
  attackValue: {
    color: '#FF4444',
    fontSize: '22px',
    fontWeight: 800,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  },
  healthStat: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(68,255,68,0.2)',
    border: '2px solid #44FF44',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(68,255,68,0.3)'
  },
  healthValue: {
    color: '#44FF44',
    fontSize: '22px',
    fontWeight: 800,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  },
  infoPanel: {
    marginTop: '8px',
    padding: '16px',
    backgroundColor: '#16213E',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  infoTitle: {
    color: '#CBD5E1',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 12px 0'
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  infoBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0
  },
  infoText: {
    color: '#94A3B8',
    fontSize: '12px',
    lineHeight: 1.4
  }
};
