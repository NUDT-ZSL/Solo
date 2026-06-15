import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Copy, Edit3 } from 'lucide-react';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  hasNode: boolean;
  onAddNode: () => void;
  onDeleteNode: () => void;
  onEditNode: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  hasNode,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            left: x,
            top: y,
            background: '#ffffff',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: 4,
            minWidth: 160,
            zIndex: 9999,
            border: '1px solid #e0e0e0',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <MenuItem
            icon={<Plus size={16} />}
            label="添加节点"
            onClick={onAddNode}
          />
          {hasNode && (
            <>
              <Divider />
              <MenuItem
                icon={<Edit3 size={16} />}
                label="编辑节点"
                onClick={onEditNode}
              />
              <MenuItem
                icon={<Copy size={16} />}
                label="复制节点"
                onClick={() => {
                  onClose();
                }}
                danger={false}
              />
              <Divider />
              <MenuItem
                icon={<Trash2 size={16} />}
                label="删除节点"
                onClick={onDeleteNode}
                danger
              />
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, danger }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 13,
      color: danger ? '#ef5350' : '#424242',
      transition: 'all 0.15s',
      userSelect: 'none',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = danger ? '#ffebee' : '#f5f5f5';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>
      {icon}
    </span>
    <span>{label}</span>
  </div>
);

const Divider: React.FC = () => (
  <div
    style={{
      height: 1,
      background: '#eeeeee',
      margin: '4px 8px',
    }}
  />
);
