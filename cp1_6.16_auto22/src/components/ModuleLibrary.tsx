import React from 'react';
import { MODULE_STYLES, MODULE_TYPES, ModuleType } from '../data';

const ModuleLibrary: React.FC = () => {
  const moduleTypes = [
    MODULE_TYPES.STORAGE_BOX,
    MODULE_TYPES.PARTITION,
    MODULE_TYPES.DRAWER
  ] as ModuleType[];

  const containerStyle: React.CSSProperties = {
    width: '220px',
    minWidth: '220px',
    backgroundColor: '#F5F5DC',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '2px solid #D3D3D3',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2F4F4F',
    borderBottom: '2px solid #D3D3D3',
    paddingBottom: '8px',
    marginBottom: '8px'
  };

  const moduleItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    cursor: 'grab',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    userSelect: 'none'
  };

  const moduleLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#2F4F4F',
    fontWeight: 600
  };

  const handleDragStart = (e: React.DragEvent, type: ModuleType) => {
    e.dataTransfer.setData('application/module-type', type);
    e.dataTransfer.effectAllowed = 'copy';
    const target = e.currentTarget as HTMLElement;
    const style = MODULE_STYLES[type];

    const dragImage = document.createElement('div');
    dragImage.style.width = `${style.widthCells * 50}px`;
    dragImage.style.height = `${style.heightCells * 50}px`;
    dragImage.style.backgroundColor = style.bgColor;
    dragImage.style.borderRadius = '4px';
    dragImage.style.opacity = '0.5';
    dragImage.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.left = '-1000px';
    dragImage.style.border = '2px solid rgba(0,0,0,0.2)';
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, style.widthCells * 25, style.heightCells * 25);

    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    target.style.opacity = '0.5';
    target.style.transform = 'scale(0.92)';
    target.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
    target.style.boxShadow = 'none';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'translateY(-2px)';
    target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'translateY(0)';
    target.style.boxShadow = 'none';
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>📦 模块库</div>
      {moduleTypes.map((type) => {
        const style = MODULE_STYLES[type];
        return (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onDragEnd={handleDragEnd}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            style={moduleItemStyle}
          >
            <div
              style={{
                width: `${style.widthCells * 30}px`,
                height: `${style.heightCells * 30}px`,
                backgroundColor: style.bgColor,
                borderRadius: '4px',
                border: '1px solid rgba(0,0,0,0.2)',
                minWidth: '30px',
                minHeight: '30px'
              }}
            />
            <span style={moduleLabelStyle}>{style.label}</span>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 'auto',
          fontSize: '12px',
          color: '#6B6B6B',
          lineHeight: 1.6,
          padding: '10px',
          backgroundColor: '#FAFAE0',
          borderRadius: '4px',
          border: '1px dashed #D3D3D3'
        }}
      >
        💡 提示：拖拽模块到右侧网格放置。双击模块可管理物品。
      </div>
    </div>
  );
};

export default ModuleLibrary;
