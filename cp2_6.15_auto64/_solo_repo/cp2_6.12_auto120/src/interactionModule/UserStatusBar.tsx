import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { capsuleApi } from '../services/api';

const UserStatusBar: React.FC = () => {
  const { capsules, userPosition } = useAppContext();
  const [nearbyCount, setNearbyCount] = useState(0);

  const buriedCount = capsules.length;
  const pendingCount = capsules.filter((c) => !c.is_unlocked).length;

  useEffect(() => {
    if (!userPosition) return;
    const [lat, lng] = userPosition;
    capsuleApi
      .getNearby(lat, lng, 5000)
      .then((data) => setNearbyCount(data.length))
      .catch(() => setNearbyCount(0));
  }, [capsules, userPosition]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={logoStyle}>⏳</div>
        <div>
          <div style={titleStyle}>时间胶囊</div>
          <div style={subtitleStyle}>时空留言</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={statRowStyle}>
          <div style={statIconStyle}>📦</div>
          <div style={{ flex: 1 }}>
            <div style={statLabelStyle}>已埋下胶囊</div>
            <div style={statValueStyle}>{buriedCount}</div>
          </div>
        </div>
        <div style={dividerLineStyle} />
        <div style={statRowStyle}>
          <div style={statIconStyle}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={statLabelStyle}>待解锁</div>
            <div style={statValueStyle}>{pendingCount}</div>
          </div>
        </div>
      </div>

      <div style={hintStyle}>共发现 {nearbyCount} 个附近胶囊</div>

      <div style={legendStyle}>
        <div style={legendTitleStyle}>图例</div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDot, backgroundColor: '#ff4757' }} />
          <span>1小时内解锁</span>
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDot, backgroundColor: '#ffa502' }} />
          <span>1周 - 1月解锁</span>
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...legendDot, backgroundColor: '#3742fa' }} />
          <span>1月以上解锁</span>
        </div>
      </div>

      <div style={tipStyle}>
        💡 长按地图任意位置超过 1.5 秒即可埋下时间胶囊
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  padding: 20,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 24,
};

const logoStyle: React.CSSProperties = {
  fontSize: 36,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#fff',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8888aa',
  marginTop: 2,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: 12,
  padding: '16px 18px',
  border: '1px solid rgba(255,255,255,0.08)',
};

const statRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '6px 0',
};

const statIconStyle: React.CSSProperties = {
  fontSize: 22,
  width: 36,
  textAlign: 'center',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#9999bb',
};

const statValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: '#fff',
  marginTop: 2,
};

const dividerLineStyle: React.CSSProperties = {
  height: 1,
  backgroundColor: 'rgba(255,255,255,0.08)',
  margin: '8px 0',
};

const hintStyle: React.CSSProperties = {
  marginTop: 20,
  padding: '12px 14px',
  backgroundColor: 'rgba(55,66,250,0.15)',
  borderRadius: 8,
  fontSize: 14,
  color: '#a0b0ff',
  border: '1px solid rgba(55,66,250,0.3)',
};

const legendStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 16,
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderRadius: 10,
};

const legendTitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8888aa',
  marginBottom: 12,
  fontWeight: 500,
};

const legendItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
  color: '#ccddee',
  padding: '4px 0',
};

const legendDot: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  display: 'inline-block',
};

const tipStyle: React.CSSProperties = {
  marginTop: 20,
  fontSize: 12,
  color: '#777799',
  lineHeight: 1.6,
  padding: 12,
  backgroundColor: 'rgba(255,255,255,0.03)',
  borderRadius: 8,
};

export default UserStatusBar;
