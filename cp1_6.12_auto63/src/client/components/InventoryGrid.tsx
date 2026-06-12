import React, { useState } from 'react'
import type { InventoryItem } from '../App.js'

interface Props {
  items: InventoryItem[]
  onItemsChange: () => void
}

function isExpiringSoon(expiryDate: string): boolean {
  if (!expiryDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays < 3
}

function InventoryGrid({ items, onItemsChange }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [newItemId, setNewItemId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    quantity: 1,
    unit: '个',
    expiryDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        quantity: Number(form.quantity),
        unit: form.unit || '个',
        expiryDate: form.expiryDate || undefined,
      }),
    })
    const created: InventoryItem = await res.json()
    setNewItemId(created.id)
    setForm({ name: '', quantity: 1, unit: '个', expiryDate: '' })
    setShowModal(false)
    await onItemsChange()
    setTimeout(() => setNewItemId(null), 600)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    onItemsChange()
  }

  return (
    <div>
      <style>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }

        .card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 20px;
          transition: all ease-out 200ms;
          position: relative;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
        }

        .card.is-new {
          animation: fadeIn 500ms ease-out;
        }

        .card.expiring {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse-red 2.5s ease-in-out infinite;
        }

        .card-name {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          word-break: break-word;
        }

        .card-quantity {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 6px;
        }

        .card-expiry {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 14px;
        }

        .card.expiring .card-expiry {
          color: #fecaca;
          font-weight: 500;
        }

        .card-delete {
          padding: 8px 14px;
          border: none;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.35);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all ease-out 200ms;
        }

        .card-delete:hover {
          transform: translateY(-2px);
          background: rgba(239, 68, 68, 0.55);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
        }

        .fab {
          position: fixed;
          right: 32px;
          bottom: 32px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #fff;
          font-size: 32px;
          font-weight: 300;
          line-height: 1;
          cursor: pointer;
          transition: all ease-out 200ms;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          z-index: 50;
        }

        .fab:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.35);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
          animation: overlayIn 200ms ease-out;
        }

        .modal {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 420px;
          animation: modalIn 250ms ease-out;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 6px;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: all ease-out 200ms;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .form-input:focus {
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.18);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all ease-out 200ms;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .btn-cancel:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .btn-submit {
          background: rgba(255, 255, 255, 0.35);
          color: #fff;
        }

        .btn-submit:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.5);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .empty {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .card {
            width: 100%;
          }

          .fab {
            right: 20px;
            bottom: 20px;
            width: 56px;
            height: 56px;
            font-size: 28px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <h1 className="page-title" style={{ display: 'none' }}>库存</h1>

      {items.length === 0 ? (
        <div className="empty">暂无库存物品，点击右下角按钮添加</div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <div
              key={item.id}
              className={`card ${isExpiringSoon(item.expiryDate) ? 'expiring' : ''} ${item.id === newItemId ? 'is-new' : ''}`}
            >
              <div className="card-name">{item.name}</div>
              <div className="card-quantity">
                数量：{item.quantity} {item.unit}
              </div>
              <div className="card-expiry">
                {item.expiryDate
                  ? `过期日期：${item.expiryDate}`
                  : '未设置过期日期'}
              </div>
              <button
                className="card-delete"
                onClick={() => handleDelete(item.id)}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowModal(true)} aria-label="添加物品">
        +
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowModal(false)
        }}>
          <form className="modal" onSubmit={handleSubmit}>
            <div className="modal-title">添加物品</div>

            <div className="form-group">
              <label className="form-label">商品名称</label>
              <input
                className="form-input"
                type="text"
                placeholder="例如：牛奶"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">数量</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">单位</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="个/盒/袋"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">过期日期（可选）</label>
              <input
                className="form-input"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button type="submit" className="btn btn-submit">
                添加
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default InventoryGrid
