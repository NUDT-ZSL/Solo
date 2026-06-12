import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle,
  LayoutGrid,
  Palette,
  Download,
  Trash2,
  Loader2,
  Image as ImageIcon,
  FileJson,
} from 'lucide-react';

interface ToolbarProps {
  isMobile: boolean;
  isExporting: boolean;
  showLegend: boolean;
  onAddNode: () => void;
  onAutoLayout: () => void;
  onToggleLegend: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onClearCanvas: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isMobile,
  isExporting,
  showLegend,
  onAddNode,
  onAutoLayout,
  onToggleLegend,
  onExportPNG,
  onExportJSON,
  onClearCanvas,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const toolbarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        padding: 8,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        border: '1px solid #e0e0e0',
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        top: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        zIndex: 1000,
      };

  return (
    <div style={toolbarStyle}>
      <ToolbarButton
        icon={<PlusCircle size={20} />}
        tooltip="添加节点"
        onClick={onAddNode}
        color="#1976d2"
      />

      <ToolbarButton
        icon={<LayoutGrid size={20} />}
        tooltip="自动排列"
        onClick={onAutoLayout}
      />

      <ToolbarButton
        icon={<Palette size={20} />}
        tooltip={showLegend ? '隐藏图例' : '筛选图例'}
        onClick={onToggleLegend}
        active={showLegend}
      />

      <div style={{ position: 'relative' }}>
        <ToolbarButton
          icon={
            isExporting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}
              >
                <Loader2 size={20} />
              </motion.div>
            ) : (
              <Download size={20} />
            )
          }
          tooltip="导出"
          onClick={() => setShowExportMenu((v) => !v)}
          disabled={isExporting}
        />
        <AnimatePresence>
          {showExportMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                [isMobile ? 'bottom' : 'top']: '100%',
                [isMobile ? 'marginBottom' : 'marginTop']: 8,
                right: isMobile ? 'auto' : 0,
                left: isMobile ? 0 : 'auto',
                background: '#ffffff',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid #e0e0e0',
                padding: 4,
                minWidth: 140,
                zIndex: 1001,
                fontFamily: 'system-ui, sans-serif',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExportMenuItem
                icon={<ImageIcon size={16} />}
                label="导出 PNG"
                onClick={() => {
                  onExportPNG();
                  setShowExportMenu(false);
                }}
              />
              <ExportMenuItem
                icon={<FileJson size={16} />}
                label="导出 JSON"
                onClick={() => {
                  onExportJSON();
                  setShowExportMenu(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ position: 'relative' }}>
        <ToolbarButton
          icon={<Trash2 size={20} />}
          tooltip="清空画布"
          onClick={() => setShowClearConfirm(true)}
          danger
        />
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                [isMobile ? 'bottom' : 'top']: '100%',
                [isMobile ? 'marginBottom' : 'marginTop']: 8,
                right: isMobile ? 'auto' : 0,
                left: isMobile ? 0 : 'auto',
                background: '#ffffff',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid #e0e0e0',
                padding: 12,
                minWidth: 200,
                zIndex: 1001,
                fontFamily: 'system-ui, sans-serif',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontSize: 13,
                  color: '#424242',
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                确定要清空所有节点和连线吗？此操作无法撤销。
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}
              >
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #e0e0e0',
                    background: '#f5f5f5',
                    color: '#616161',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onClearCanvas();
                    setShowClearConfirm(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#ef5350',
                    color: '#ffffff',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  确定
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showExportMenu || showClearConfirm ? (
        <div
          onClick={() => {
            setShowExportMenu(false);
            setShowClearConfirm(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
        />
      ) : null}
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  color?: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  tooltip,
  onClick,
  color,
  active,
  danger,
  disabled,
}) => {
  const [hovered, setHovered] = React.useState(false);

  const defaultColor = danger ? '#ef5350' : color || '#1976d2';

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: 'none',
          background: active
            ? defaultColor
            : hovered
            ? `${defaultColor}20`
            : 'rgba(0,0,0,0.04)',
          color: active ? '#ffffff' : danger && !hovered ? '#ef5350' : '#424242',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          opacity: disabled ? 0.5 : 1,
          padding: 0,
        }}
      >
        {icon}
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginRight: 8,
              background: '#424242',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              whiteSpace: 'nowrap',
              fontFamily: 'system-ui, sans-serif',
              pointerEvents: 'none',
              zIndex: 1002,
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ExportMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ExportMenuItem: React.FC<ExportMenuItemProps> = ({ icon, label, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 13,
      color: '#424242',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = '#f5f5f5';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <span style={{ display: 'flex', color: '#757575' }}>{icon}</span>
    <span>{label}</span>
  </div>
);
