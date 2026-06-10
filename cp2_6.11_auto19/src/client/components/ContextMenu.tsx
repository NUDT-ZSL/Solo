/**
 * 右键上下文菜单
 * 提供添加笔记、添加标签、删除节点等操作
 *
 * 修复问题3：
 * - "添加/编辑笔记" 打开 NoteModal 并定位到笔记编辑
 * - "管理标签" 打开 NoteModal 并自动聚焦到标签输入框
 * - 所有操作都会正确保存数据并关联到节点
 */

import { useEffect, useRef } from 'react';
import { FileText, Tag, Trash2, Copy } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

export default function ContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    contextMenu,
    hideContextMenu,
    deleteNode,
    setNoteModalOpen,
    selectNode,
    updateNode,
    setNoteModalInitialTab,  // 新增：控制NoteModal默认打开的标签页
  } = useGraphStore();

  const { visible, x, y, nodeId } = contextMenu;

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, hideContextMenu]);

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [visible, hideContextMenu]);

  if (!visible || !nodeId) return null;

  /**
   * ========== 修复问题3：完整交互流程实现 ==========
   */
  const menuItems = [
    {
      id: 'note',
      label: '添加/编辑笔记',
      icon: FileText,
      onClick: () => {
        // 选中节点 → 打开NoteModal → 默认显示笔记编辑tab
        selectNode(nodeId);
        setNoteModalInitialTab('note');
        setNoteModalOpen(true);
        hideContextMenu();
      },
    },
    {
      id: 'tags',
      label: '管理标签',
      icon: Tag,
      onClick: () => {
        // 选中节点 → 打开NoteModal → 默认显示标签tab并自动聚焦
        selectNode(nodeId);
        setNoteModalInitialTab('tags');
        setNoteModalOpen(true);
        hideContextMenu();
      },
    },
    {
      id: 'divider1',
      divider: true,
    },
    {
      id: 'copy',
      label: '复制节点词',
      icon: Copy,
      onClick: () => {
        const node = useGraphStore.getState().nodes.find(n => n.id === nodeId);
        if (node) {
          navigator.clipboard.writeText(node.word).catch(() => {
            // 降级方案：用 textarea 复制
            const textarea = document.createElement('textarea');
            textarea.value = node.word;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          });
        }
        hideContextMenu();
      },
    },
    {
      id: 'divider2',
      divider: true,
    },
    {
      id: 'delete',
      label: '删除节点',
      icon: Trash2,
      danger: true,
      onClick: () => {
        const node = useGraphStore.getState().nodes.find(n => n.id === nodeId);
        const word = node?.word || '此节点';
        if (window.confirm(`确定删除「${word}」及其所有子节点？\n\n此操作不可撤销。`)) {
          deleteNode(nodeId);
        }
        hideContextMenu();
      },
    },
  ];

  // 计算菜单位置，避免超出视口
  const menuWidth = 180;
  const menuHeight = menuItems.length * 36 + 16;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        minWidth: '180px',
        background: 'rgba(27, 38, 59, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '6px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        zIndex: 1000,
        animation: 'menuFadeIn 0.15s ease-out',
        WebkitAnimation: 'menuFadeIn 0.15s ease-out',
      }}
    >
      {menuItems.map(item => {
        if ('divider' in item) {
          return (
            <div
              key={item.id}
              style={{
                height: '1px',
                background: 'rgba(255,255,255,0.08)',
                margin: '4px 6px',
              }}
            />
          );
        }

        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: item.danger ? '#FF6B6B' : 'rgba(255,255,255,0.85)',
              transition: 'all 0.15s',
              WebkitTransition: 'all 0.15s',
              textAlign: 'left',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = item.danger
                ? 'rgba(255,107,107,0.15)'
                : 'rgba(74, 144, 217, 0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {Icon && <Icon size={15} />}
            <span>{item.label}</span>
          </button>
        );
      })}

      <style>{`
        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @-webkit-keyframes menuFadeIn {
          from {
            opacity: 0;
            -webkit-transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            -webkit-transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
