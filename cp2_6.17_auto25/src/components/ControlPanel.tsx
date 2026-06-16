import { useTrafficStore } from '../store/trafficStore';
import { TrafficMode } from '../utils/trafficLogic';

const modes: { value: TrafficMode; label: string; description: string }[] = [
  { value: 'fixed', label: '固定时长', description: '绿灯30s 黄灯3s 红灯30s' },
  { value: 'actuated', label: '感应式', description: '排队>5辆时延长绿灯15s' },
  { value: 'adaptive', label: '自适应协调', description: '根据车流量动态调整配时' }
];

export default function ControlPanel() {
  const { mode, setMode } = useTrafficStore();

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>信号灯模式</div>
      <div style={buttonContainerStyle}>
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            style={{
              ...buttonStyle,
              borderColor: mode === m.value ? '#00b894' : 'transparent',
              backgroundColor: mode === m.value ? 'rgba(0, 184, 148, 0.2)' : 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <div style={buttonLabelStyle}>{m.label}</div>
            <div style={buttonDescStyle}>{m.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  width: '180px',
  padding: '12px',
  borderRadius: '10px',
  backgroundColor: 'rgba(30, 39, 46, 0.85)',
  backdropFilter: 'blur(10px)',
  color: '#dfe6e9',
  zIndex: 100,
  transition: 'all 0.25s ease'
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '10px',
  color: '#dfe6e9'
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '2px solid transparent',
  borderRadius: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  color: '#dfe6e9',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.25s ease',
  fontFamily: 'inherit'
};

const buttonLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  marginBottom: '2px'
};

const buttonDescStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#b2bec3',
  lineHeight: 1.3
};
