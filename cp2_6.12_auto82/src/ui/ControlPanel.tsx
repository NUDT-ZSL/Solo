import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { artworkTemplates, getArtworkTemplate } from '../scene/ArtworkManager';

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  left: '20px',
  top: '20px',
  bottom: '20px',
  width: '280px',
  background: 'rgba(20, 20, 40, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  padding: '16px',
  color: '#fff',
  overflowY: 'auto',
  zIndex: 10,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '12px',
  color: '#e0e0ff',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const thumbnailContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '10px',
  marginBottom: '20px',
};

const thumbnailStyle = (isHovered: boolean): React.CSSProperties => ({
  width: '120px',
  height: '100px',
  borderRadius: '8px',
  background: 'rgba(60, 60, 100, 0.5)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
  boxShadow: isHovered ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
});

const categoryTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  marginBottom: '12px',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '6px 8px',
  fontSize: '11px',
  borderRadius: '6px',
  background: active ? 'rgba(100, 150, 255, 0.4)' : 'rgba(60, 60, 100, 0.5)',
  border: '1px solid',
  borderColor: active ? 'rgba(100, 150, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
});

const propertyRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#a0a0c0',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  background: 'rgba(40, 40, 70, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '4px',
  background: 'rgba(60, 60, 100, 0.8)',
  outline: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
};

const deleteButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  background: 'rgba(231, 76, 60, 0.8)',
  border: 'none',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginTop: '10px',
};

const confirmModalStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(20, 20, 40, 0.95)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  padding: '24px',
  zIndex: 100,
  minWidth: '280px',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#e74c3c',
  marginBottom: '12px',
};

const modalTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#c0c0e0',
  marginBottom: '20px',
  lineHeight: 1.5,
};

const modalButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
};

const modalButtonStyle = (isConfirm: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  background: isConfirm ? '#c0392b' : 'rgba(60, 60, 100, 0.8)',
  color: '#fff',
});

type Category = 'all' | 'sculpture' | 'painting' | 'installation';

export default function ControlPanel() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { selectedArtworkId, artworks, updateArtwork, setIsPlacing, showDeleteConfirm, setShowDeleteConfirm, removeArtwork } = useStore();

  const selectedArtwork = artworks.find((a) => a.id === selectedArtworkId);

  const filteredTemplates = artworkTemplates.filter((t) => {
    if (activeCategory === 'all') return true;
    return t.category === activeCategory;
  });

  const handleThumbnailClick = (type: string) => {
    setIsPlacing(true, type);
  };

  const handleDeleteConfirm = () => {
    if (selectedArtworkId) {
      removeArtwork(selectedArtworkId);
    }
    setShowDeleteConfirm(false);
  };

  const handlePositionChange = (axis: number, value: number) => {
    if (!selectedArtworkId || !selectedArtwork) return;
    const newPosition = [...selectedArtwork.position] as [number, number, number];
    newPosition[axis] = value;
    updateArtwork(selectedArtworkId, { position: newPosition });
  };

  const handleRotationChange = (axis: number, valueDeg: number) => {
    if (!selectedArtworkId || !selectedArtwork) return;
    const newRotation = [...selectedArtwork.rotation] as [number, number, number];
    newRotation[axis] = (valueDeg * Math.PI) / 180;
    updateArtwork(selectedArtworkId, { rotation: newRotation });
  };

  const handleScaleChange = (value: number) => {
    if (!selectedArtworkId) return;
    updateArtwork(selectedArtworkId, { scale: value });
  };

  const getThumbnailContent = (type: string, color: string) => {
    switch (type) {
      case 'sculpture-sphere':
        return <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, #666)`, boxShadow: 'inset -5px -5px 10px rgba(0,0,0,0.3)' }} />;
      case 'sculpture-cube':
        return <div style={{ width: '35px', height: '35px', background: color, transform: 'rotate(5deg)', boxShadow: '3px 3px 8px rgba(0,0,0,0.3)' }} />;
      case 'sculpture-torus':
        return <div style={{ width: '45px', height: '45px', borderRadius: '50%', border: `8px solid ${color}`, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' }} />;
      case 'sculpture-cone':
        return <div style={{ width: 0, height: 0, borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderBottom: `35px solid ${color}`, filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }} />;
      case 'painting-abstract':
      case 'painting-landscape':
      case 'painting-portrait':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '35px', background: 'linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)', borderRadius: '2px' }} />
            <div style={{ width: '55px', height: '4px', background: '#d4af37', marginTop: '2px', borderRadius: '0 0 2px 2px' }} />
          </div>
        );
      case 'installation-pyramid':
        return <div style={{ width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderBottom: `38px solid ${color}`, opacity: 0.85, filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }} />;
      case 'installation-cylinder':
        return <div style={{ width: '25px', height: '45px', background: `linear-gradient(90deg, ${color}88, ${color}, ${color}88)`, borderRadius: '12px/6px', boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }} />;
      case 'installation-tetra':
        return <div style={{ width: 0, height: 0, borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderBottom: `35px solid ${color}`, transform: 'rotate(15deg)', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }} />;
      default:
        return <div style={{ width: '35px', height: '35px', background: color, borderRadius: '4px' }} />;
    }
  };

  return (
    <>
      <div style={panelStyle}>
        <div style={{ ...sectionTitleStyle, marginTop: 0 }}>模型库</div>
        
        <div style={categoryTabsStyle}>
          {(['all', 'sculpture', 'painting', 'installation'] as Category[]).map((cat) => (
            <button
              key={cat}
              style={tabStyle(activeCategory === cat)}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? '全部' : cat === 'sculpture' ? '雕塑' : cat === 'painting' ? '画作' : '装置'}
            </button>
          ))}
        </div>

        <div style={thumbnailContainerStyle}>
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.type}
              style={thumbnailStyle(hoveredItem === template.type)}
              onMouseEnter={() => setHoveredItem(template.type)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => handleThumbnailClick(template.type)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {getThumbnailContent(template.type, template.color)}
              <span style={{ fontSize: '11px', marginTop: '6px', color: '#c0c0e0' }}>
                {template.name}
              </span>
            </motion.div>
          ))}
        </div>

        {selectedArtwork && (
          <>
            <div style={sectionTitleStyle}>属性编辑</div>
            
            <div style={propertyRowStyle}>
              <span style={labelStyle}>名称</span>
              <div style={{ ...inputStyle, color: '#e0e0ff', fontWeight: 500 }}>
                {selectedArtwork.name}
              </div>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>位置 X</span>
              <input
                type="range"
                min="-9"
                max="9"
                step="0.1"
                value={selectedArtwork.position[0]}
                onChange={(e) => handlePositionChange(0, parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {selectedArtwork.position[0].toFixed(1)} m
              </span>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>位置 Y</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={selectedArtwork.position[1]}
                onChange={(e) => handlePositionChange(1, parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {selectedArtwork.position[1].toFixed(1)} m
              </span>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>位置 Z</span>
              <input
                type="range"
                min="-6.5"
                max="6.5"
                step="0.1"
                value={selectedArtwork.position[2]}
                onChange={(e) => handlePositionChange(2, parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {selectedArtwork.position[2].toFixed(1)} m
              </span>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>缩放</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={selectedArtwork.scale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {selectedArtwork.scale.toFixed(1)}x
              </span>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>旋转 X</span>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={(selectedArtwork.rotation[0] * 180) / Math.PI}
                onChange={(e) => handleRotationChange(0, parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {Math.round((selectedArtwork.rotation[0] * 180) / Math.PI)}°
              </span>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>旋转 Y</span>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={(selectedArtwork.rotation[1] * 180) / Math.PI}
                onChange={(e) => handleRotationChange(1, parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {Math.round((selectedArtwork.rotation[1] * 180) / Math.PI)}°
              </span>
            </div>

            <div style={propertyRowStyle}>
              <span style={labelStyle}>旋转 Z</span>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={(selectedArtwork.rotation[2] * 180) / Math.PI}
                onChange={(e) => handleRotationChange(2, parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={{ fontSize: '11px', color: '#8080a0', textAlign: 'right' }}>
                {Math.round((selectedArtwork.rotation[2] * 180) / Math.PI)}°
              </span>
            </div>

            <motion.button
              style={deleteButtonStyle}
              onClick={() => setShowDeleteConfirm(true)}
              whileHover={{ backgroundColor: 'rgba(231, 76, 60, 1)' }}
              whileTap={{ scale: 0.95 }}
            >
              删除艺术品
            </motion.button>
          </>
        )}

        {!selectedArtwork && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(60, 60, 100, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#8080a0' }}>
              点击左侧缩略图添加艺术品<br />
              点击场景中的物体选中编辑
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={confirmModalStyle}
          >
            <div style={modalTitleStyle}>⚠ 确认删除</div>
            <p style={modalTextStyle}>
              确定要删除这件艺术品吗？<br />
              此操作无法撤销。
            </p>
            <div style={modalButtonsStyle}>
              <motion.button
                style={modalButtonStyle(false)}
                onClick={() => setShowDeleteConfirm(false)}
                whileHover={{ backgroundColor: 'rgba(80, 80, 130, 0.9)' }}
                whileTap={{ scale: 0.95 }}
              >
                取消
              </motion.button>
              <motion.button
                style={modalButtonStyle(true)}
                onClick={handleDeleteConfirm}
                whileHover={{ backgroundColor: '#a93226' }}
                whileTap={{ scale: 0.95 }}
              >
                确认删除
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
