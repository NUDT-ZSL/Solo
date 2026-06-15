import React, { useState, useCallback, memo } from 'react'
import type { ShoppingItem } from '../App.js'

interface Props {
  items: ShoppingItem[]
  onItemsChange: () => void
}

interface ListItemProps {
  item: ShoppingItem
  isRemoving: boolean
  onCheck: (item: ShoppingItem) => void
}

const ListItem = memo(function ListItem({ item, isRemoving, onCheck }: ListItemProps) {
  return (
    <div
      className={`list-item ${isRemoving ? 'checked' : ''}`}
    >
      <button
        className={`checkbox ${isRemoving ? 'is-checked' : ''}`}
        onClick={() => onCheck(item)}
        aria-label={`标记 ${item.name} 为已购`}
        disabled={isRemoving}
        type="button"
      >
        {isRemoving && (
          <svg className="checkbox-check" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="list-content">
        <div className="list-name">{item.name}</div>
        <div className="list-meta">
          建议采购 {item.quantity} {item.unit} · 当前库存 {item.currentStock}
        </div>
      </div>
      <span className="list-badge">待购</span>
    </div>
  )
})

function ShoppingList({ items, onItemsChange }: Props) {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const handleCheck = useCallback(async (item: ShoppingItem) => {
    if (removingIds.has(item.id)) return
    setRemovingIds((prev) => new Set(prev).add(item.id))

    try {
      await fetch(`/api/shopping-list/${item.id}/check`, { method: 'PATCH' })
    } catch (err) {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      return
    }

    setTimeout(() => {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      onItemsChange()
    }, 320)
  }, [removingIds, onItemsChange])

  return (
    <div>
      <style>{`
        .list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          contain: layout paint;
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 18px 20px;
          transition: transform ease-out 200ms, box-shadow ease-out 200ms,
            background ease-out 200ms;
          overflow: hidden;
          contain: content;
          will-change: transform, opacity;
        }

        .list-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        }

        .list-item.checked {
          animation: slideOut 300ms ease-out forwards;
          pointer-events: none;
          overflow: hidden;
        }

        .list-item.checked .list-name,
        .list-item.checked .list-meta {
          text-decoration: line-through;
          color: rgba(255, 255, 255, 0.45) !important;
        }

        .checkbox {
          width: 24px;
          height: 24px;
          min-width: 24px;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform ease-out 200ms, background ease-out 200ms,
            border-color ease-out 200ms, box-shadow ease-out 200ms;
          padding: 0;
        }

        .checkbox:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .checkbox.is-checked {
          background: rgba(34, 197, 94, 0.6);
          border-color: rgba(34, 197, 94, 0.85);
        }

        .checkbox-check {
          width: 14px;
          height: 14px;
          stroke: #fff;
          stroke-width: 3;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .list-content {
          flex: 1;
          min-width: 0;
        }

        .list-name {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
          transition: color ease-out 200ms;
          word-break: break-word;
        }

        .list-meta {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.72);
          transition: color ease-out 200ms;
        }

        .list-badge {
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.25);
          border: 1px solid rgba(251, 191, 36, 0.4);
          font-size: 12px;
          font-weight: 500;
          color: #fef3c7;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .empty {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
          line-height: 1.6;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .list {
            gap: 10px;
          }

          .list-item {
            width: 100%;
            padding: 14px 16px;
            gap: 12px;
          }
        }
      `}</style>

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎉</div>
          库存充足，暂无需要采购的物品
        </div>
      ) : (
        <div className="list">
          {items.map((item) => (
            <ListItem
              key={item.id}
              item={item}
              isRemoving={removingIds.has(item.id)}
              onCheck={handleCheck}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(ShoppingList)
