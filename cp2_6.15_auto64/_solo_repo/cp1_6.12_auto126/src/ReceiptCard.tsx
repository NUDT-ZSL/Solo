import { useState, useCallback } from 'react'
import type { ReceiptItem, Receipt } from './App'

interface ReceiptCardProps {
  receipt: Receipt
  onUpdate: (updates: Partial<Receipt>) => void
  onDelete: () => void
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #E2E8F0',
  borderRadius: 4,
  fontSize: 13,
  color: '#2D3748',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#F7FAFC',
  transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
  width: '100%'
}

const cellInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '4px 8px',
  fontSize: 12
}

export default function ReceiptCard({ receipt, onUpdate, onDelete }: ReceiptCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    merchantName: receipt.merchantName,
    purchaseDate: receipt.purchaseDate,
    items: receipt.items.map(it => ({ ...it })),
    totalAmount: receipt.totalAmount
  })

  const startEdit = useCallback(() => {
    setEditData({
      merchantName: receipt.merchantName,
      purchaseDate: receipt.purchaseDate,
      items: receipt.items.map(it => ({ ...it })),
      totalAmount: receipt.totalAmount
    })
    setIsEditing(true)
  }, [receipt])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const saveEdit = useCallback(() => {
    onUpdate({
      merchantName: editData.merchantName,
      purchaseDate: editData.purchaseDate,
      items: editData.items,
      totalAmount: editData.totalAmount
    })
    setIsEditing(false)
  }, [editData, onUpdate])

  const updateItem = useCallback((index: number, field: keyof ReceiptItem, value: string | number) => {
    setEditData(prev => {
      const items = prev.items.map((it, i) => {
        if (i !== index) return it
        const updated = { ...it, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.subtotal = Number((updated.quantity * updated.unitPrice).toFixed(2))
        }
        return updated
      })
      const total = items.reduce((s, it) => s + it.subtotal, 0)
      return { ...prev, items, totalAmount: Number(total.toFixed(2)) }
    })
  }, [])

  const addItem = useCallback(() => {
    setEditData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, unitPrice: 0, subtotal: 0 }]
    }))
  }, [])

  const removeItem = useCallback((index: number) => {
    setEditData(prev => {
      const items = prev.items.filter((_, i) => i !== index)
      const total = items.reduce((s, it) => s + it.subtotal, 0)
      return { ...prev, items, totalAmount: Number(total.toFixed(2)) }
    })
  }, [])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e8e8e8',
      borderRadius: 6,
      overflow: 'hidden',
      transition: 'box-shadow 200ms ease-out'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e8e8e8'
      }}>
        <div style={{
          width: 120,
          minHeight: 120,
          flexShrink: 0,
          background: '#F7FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #e8e8e8',
          padding: 8
        }}>
          <img
            src={receipt.imageUrl}
            alt="小票"
            style={{
              maxWidth: '100%',
              maxHeight: 100,
              objectFit: 'contain',
              borderRadius: 4
            }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>

        <div style={{ flex: 1, padding: '16px 20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <div style={{ flex: 1 }}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ fontSize: 11, color: '#718096', marginBottom: 3, display: 'block' }}>商家名称</label>
                    <input
                      type="text"
                      value={editData.merchantName}
                      onChange={e => setEditData(prev => ({ ...prev, merchantName: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(91,141,239,0.15)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div style={{ flex: '0 0 160px' }}>
                    <label style={{ fontSize: 11, color: '#718096', marginBottom: 3, display: 'block' }}>购买日期</label>
                    <input
                      type="date"
                      value={editData.purchaseDate}
                      onChange={e => setEditData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(91,141,239,0.15)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a202c', margin: 0 }}>
                    {receipt.merchantName}
                  </h3>
                  <span style={{
                    fontSize: 12,
                    color: '#2B6CB0',
                    background: '#EBF4FF',
                    padding: '2px 10px',
                    borderRadius: 20,
                    fontWeight: 500
                  }}>
                    {receipt.category}
                  </span>
                </div>
              )}
              {!isEditing && (
                <p style={{ fontSize: 13, color: '#718096', margin: '4px 0 0 0' }}>
                  {formatDate(receipt.purchaseDate)}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }}>
              {isEditing ? (
                <>
                  <button
                    onClick={saveEdit}
                    style={{
                      padding: '6px 14px',
                      background: '#5B8DEF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 200ms ease-out'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#4A7CDC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#5B8DEF'}
                  >保存</button>
                  <button
                    onClick={cancelEdit}
                    style={{
                      padding: '6px 14px',
                      background: '#999',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 200ms ease-out'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#7a7a7a'}
                    onMouseLeave={e => e.currentTarget.style.background = '#999'}
                  >取消</button>
                </>
              ) : (
                <>
                  <button
                    onClick={startEdit}
                    style={{
                      padding: '6px 14px',
                      background: '#F7FAFC',
                      color: '#4A5568',
                      border: '1px solid #E2E8F0',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 200ms ease-out, border-color 200ms ease-out'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EDF2F7'; e.currentTarget.style.borderColor = '#CBD5E0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F7FAFC'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                  >✏️ 编辑</button>
                  <button
                    onClick={onDelete}
                    style={{
                      padding: '6px 14px',
                      background: '#FFF5F5',
                      color: '#C53030',
                      border: '1px solid #FEB2B2',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 200ms ease-out'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FED7D7'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
                  >🗑 删除</button>
                </>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: '#718096', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #f0f0f0' }}>商品名</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: '#718096', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #f0f0f0', width: 70 }}>数量</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', color: '#718096', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #f0f0f0', width: 90 }}>单价</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', color: '#718096', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #f0f0f0', width: 90 }}>小计</th>
                  {isEditing && <th style={{ width: 36, borderBottom: '1px solid #f0f0f0' }}></th>}
                </tr>
              </thead>
              <tbody>
                {(isEditing ? editData.items : receipt.items).map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #fafafa' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          style={cellInputStyle}
                          onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
                        />
                      ) : (
                        <span style={{ color: '#2D3748' }}>{item.name}</span>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #fafafa', textAlign: 'center' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.quantity}
                          min={1}
                          onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          style={{ ...cellInputStyle, textAlign: 'center', width: 60 }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
                        />
                      ) : (
                        <span style={{ color: '#4A5568' }}>{item.quantity}</span>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #fafafa', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.unitPrice}
                          min={0}
                          step="0.01"
                          onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          style={{ ...cellInputStyle, textAlign: 'right', width: 80 }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
                        />
                      ) : (
                        <span style={{ color: '#4A5568' }}>¥{item.unitPrice.toFixed(2)}</span>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #fafafa', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.subtotal}
                          min={0}
                          step="0.01"
                          onChange={e => updateItem(idx, 'subtotal', parseFloat(e.target.value) || 0)}
                          style={{ ...cellInputStyle, textAlign: 'right', width: 80 }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0' }}
                        />
                      ) : (
                        <span style={{ color: '#2D3748', fontWeight: 500 }}>¥{item.subtotal.toFixed(2)}</span>
                      )}
                    </td>
                    {isEditing && (
                      <td style={{ borderBottom: '1px solid #fafafa', textAlign: 'center' }}>
                        <button
                          onClick={() => removeItem(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#C53030',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: 2,
                            borderRadius: 4,
                            transition: 'background 200ms ease-out'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          title="删除此行"
                        >×</button>
                      </td>
                    )}
                  </tr>
                ))}
                {isEditing && (
                  <tr>
                    <td colSpan={5} style={{ padding: '6px 8px' }}>
                      <button
                        onClick={addItem}
                        style={{
                          background: 'none',
                          border: '1px dashed #CBD5E0',
                          color: '#5B8DEF',
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '4px 12px',
                          borderRadius: 4,
                          width: '100%',
                          fontFamily: 'inherit',
                          transition: 'border-color 200ms ease-out, background 200ms ease-out'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B8DEF'; e.currentTarget.style.background = '#EBF4FF' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E0'; e.currentTarget.style.background = 'none' }}
                      >+ 添加商品</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #e8e8e8'
          }}>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#718096' }}>总金额:</span>
                <input
                  type="number"
                  value={editData.totalAmount}
                  min={0}
                  step="0.01"
                  onChange={e => setEditData(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                  style={{ ...inputStyle, width: 120, textAlign: 'right', fontWeight: 600, fontSize: 14 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5B8DEF'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(91,141,239,0.15)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            ) : (
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2B6CB0' }}>
                合计: ¥{receipt.totalAmount.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
