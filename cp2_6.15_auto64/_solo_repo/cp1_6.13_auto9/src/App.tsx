import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { PropertyPanel } from '@/components/PropertyPanel';

export default function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>虚拟展厅策展平台</span>
        <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
          拖拽添加墙壁和展品，点击查看属性
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minWidth: 0,
          minHeight: 0,
        }}
        className="app-main-layout"
      >
        <Canvas />
        <div
          style={{
            width: 250,
            backgroundColor: '#fafafa',
            borderLeft: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}
          className="sidebar-panel"
        >
          <Sidebar />
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
}
