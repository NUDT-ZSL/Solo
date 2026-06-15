import { PenTool, ZoomIn, Camera } from 'lucide-react';
import { useAppStore } from '../data/store';
import { saveScreenshot } from '../data/storage';
import { takeScreenshot } from '../controls/interaction';

export function ToolPanel() {
  const isMarkerMode = useAppStore((s) => s.isMarkerMode);
  const setMarkerMode = useAppStore((s) => s.setMarkerMode);
  const selectedArtifact = useAppStore((s) => s.selectedArtifact);

  const handleMarkerClick = () => {
    setMarkerMode(!isMarkerMode);
  };

  const handleZoomClick = () => {
    if (selectedArtifact) {
      console.log('Zoom to:', selectedArtifact.name);
    }
  };

  const handleScreenshotClick = () => {
    const dataUrl = takeScreenshot();
    if (dataUrl) {
      const id = `screenshot-${Date.now()}`;
      saveScreenshot(dataUrl, id);
      console.log('Screenshot saved:', id);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '220px',
        padding: '20px',
        borderRadius: '12px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(0, 30, 60, 0.7)',
        border: '1px solid rgba(129, 212, 250, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 100,
        transition: 'all 0.3s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '2px solid rgba(224, 224, 224, 0.5)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#00bcd4',
              boxShadow: '0 0 10px #00bcd4',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '20px',
              height: '2px',
              backgroundColor: 'rgba(224, 224, 224, 0.6)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '2px',
              height: '20px',
              backgroundColor: 'rgba(224, 224, 224, 0.6)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          gap: '10px',
        }}
      >
        <ToolButton
          icon={<PenTool size={20} />}
          label="标记"
          active={isMarkerMode}
          onClick={handleMarkerClick}
        />
        <ToolButton
          icon={<ZoomIn size={20} />}
          label="放大"
          active={false}
          onClick={handleZoomClick}
          disabled={!selectedArtifact}
        />
        <ToolButton
          icon={<Camera size={20} />}
          label="截图"
          active={false}
          onClick={handleScreenshotClick}
        />
      </div>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(129, 212, 250, 0.2)',
          fontSize: '12px',
          color: '#b0bec5',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          拖拽旋转 · 滚轮缩放
        </div>
        <div>
          右键添加标注
        </div>
      </div>

      <div
        style={{
          marginTop: '12px',
          padding: '10px',
          borderRadius: '8px',
          background: 'rgba(0, 50, 100, 0.5)',
          fontSize: '11px',
          color: '#80deea',
        }}
      >
        <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>
          提示
        </div>
        {isMarkerMode ? (
          <div>点击海底放置标记点</div>
        ) : (
          <div>靠近古物查看高亮光环</div>
        )}
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({ icon, label, active, onClick, disabled }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 10px',
        borderRadius: '10px',
        border: 'none',
        background: active
          ? 'rgba(0, 188, 212, 0.3)'
          : 'rgba(255, 255, 255, 0.05)',
        color: disabled ? '#546e7a' : active ? '#00bcd4' : '#e0e0e0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease-out',
        minWidth: '56px',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = active
            ? 'rgba(0, 188, 212, 0.3)'
            : 'rgba(255, 255, 255, 0.05)';
        }
      }}
    >
      {icon}
      <span style={{ fontSize: '11px' }}>{label}</span>
    </button>
  );
}
