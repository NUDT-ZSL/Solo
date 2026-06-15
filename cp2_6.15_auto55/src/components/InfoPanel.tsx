import { useStore } from '@/store';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  left: '20px',
  bottom: '20px',
  width: '320px',
  backgroundColor: 'rgba(26, 26, 46, 0.85)',
  borderRadius: '16px',
  padding: '24px',
  backdropFilter: 'blur(10px)',
  zIndex: 1000,
};

const titleStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '16px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  borderBottom: '1px solid rgba(100, 181, 246, 0.3)',
  paddingBottom: '10px',
};

const emptyStyle: React.CSSProperties = {
  color: '#888',
  fontSize: '13px',
  textAlign: 'center',
  padding: '20px 0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const labelStyle: React.CSSProperties = {
  color: '#a0a0a0',
  fontSize: '13px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const valueStyle: React.CSSProperties = {
  color: '#64b5f6',
  fontSize: '13px',
  fontFamily: "'Courier New', monospace",
  fontWeight: 'bold',
};

const coordContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginTop: '4px',
};

const coordItemStyle: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
  backgroundColor: 'rgba(100, 181, 246, 0.1)',
  borderRadius: '8px',
  padding: '8px',
};

const coordLabelStyle: React.CSSProperties = {
  color: '#888',
  fontSize: '11px',
  marginBottom: '2px',
};

const coordValueStyle: React.CSSProperties = {
  color: '#64b5f6',
  fontSize: '14px',
  fontFamily: "'Courier New', monospace",
  fontWeight: 'bold',
};

const lithologyStyle: React.CSSProperties = {
  color: '#81c784',
  fontSize: '14px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontWeight: '600',
  marginTop: '4px',
};

const directionBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '4px',
};

const barBgStyle: React.CSSProperties = {
  flex: 1,
  height: '6px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '3px',
  overflow: 'hidden',
};

const barFillStyle: React.CSSProperties = {
  height: '100%',
  backgroundColor: '#64b5f6',
  borderRadius: '3px',
  transition: 'width 0.3s ease',
};

function formatDirection(degrees: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return dirs[index];
}

export default function InfoPanel() {
  const selectedPoint = useStore((state) => state.selectedPoint);

  if (!selectedPoint) {
    return (
      <div style={panelStyle}>
        <div style={titleStyle}>点信息</div>
        <div style={emptyStyle}>点击场景中的任意位置查询数据</div>
      </div>
    );
  }

  const { x, y, z, speed, direction, lithology } = selectedPoint;
  const speedPercent = Math.min(100, speed * 20);

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>点信息</div>

      <div style={{ marginBottom: '16px' }}>
        <div style={labelStyle}>坐标</div>
        <div style={coordContainerStyle}>
          <div style={coordItemStyle}>
            <div style={coordLabelStyle}>X</div>
            <div style={coordValueStyle}>{x.toFixed(2)}</div>
          </div>
          <div style={coordItemStyle}>
            <div style={coordLabelStyle}>Y</div>
            <div style={coordValueStyle}>{y.toFixed(2)}</div>
          </div>
          <div style={coordItemStyle}>
            <div style={coordLabelStyle}>Z</div>
            <div style={coordValueStyle}>{z.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>岩性</span>
        <span style={lithologyStyle}>{lithology}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>流速</span>
        <span style={valueStyle}>{speed.toFixed(3)} m/s</span>
      </div>

      <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
        <span style={labelStyle}>流速强度</span>
        <div style={directionBarStyle}>
          <div style={barBgStyle}>
            <div style={{ ...barFillStyle, width: `${speedPercent}%` }} />
          </div>
          <span style={valueStyle}>{speedPercent.toFixed(0)}%</span>
        </div>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>水平方向</span>
        <span style={valueStyle}>
          {direction.horizontal.toFixed(0)}° ({formatDirection(direction.horizontal)})
        </span>
      </div>

      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>垂直方向</span>
        <span style={valueStyle}>
          {direction.vertical.toFixed(0)}° {direction.vertical > 0 ? '(向上)' : direction.vertical < 0 ? '(向下)' : '(水平)'}
        </span>
      </div>
    </div>
  );
}
