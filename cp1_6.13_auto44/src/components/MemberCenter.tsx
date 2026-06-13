import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Member {
  _id: string
  name: string
  phone: string
  points: number
  storeId: string
}

interface PointHistory {
  _id: string
  memberId: string
  date: string
  service: string
  points: number
  type: string
}

const gifts = [
  { id: 'gift-1', name: '免费洗澡一次', points: 200, icon: '🛁' },
  { id: 'gift-2', name: '宠物零食包', points: 50, icon: '🦴' },
  { id: 'gift-3', name: '剪毛8折券', points: 100, icon: '🎫' },
  { id: 'gift-4', name: 'SPA体验一次', points: 500, icon: '💆' },
  { id: 'gift-5', name: '寄养半天免费', points: 300, icon: '🏠' },
]

const MemberCenter: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [history, setHistory] = useState<PointHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemGift, setRedeemGift] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/members').then(res => {
      setMembers(res.data)
      if (res.data.length > 0) {
        setSelectedMember(res.data[0])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedMember) return
    axios.get(`/api/members/${selectedMember._id}/points`).then(res => {
      setHistory(res.data.history || [])
    }).catch(() => setHistory([]))
  }, [selectedMember])

  const handleRedeem = async (giftId: string) => {
    if (!selectedMember) return
    const gift = gifts.find(g => g.id === giftId)
    if (!gift) return

    try {
      await axios.put('/api/members/points', {
        memberId: selectedMember._id,
        points: gift.points,
        service: `兑换：${gift.name}`,
        type: 'redeem',
      })
      const res = await axios.get('/api/members')
      setMembers(res.data)
      const updated = res.data.find((m: Member) => m._id === selectedMember._id)
      if (updated) setSelectedMember(updated)
      setRedeemGift(null)

      const histRes = await axios.get(`/api/members/${selectedMember._id}/points`)
      setHistory(histRes.data.history || [])
    } catch (err: any) {
      alert(err.response?.data?.error || '兑换失败')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: 16, color: '#64748b' }}>加载会员信息...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>⭐ 会员中心</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>选择会员</label>
        <select
          value={selectedMember?._id || ''}
          onChange={e => {
            const m = members.find(m => m._id === e.target.value)
            setSelectedMember(m || null)
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            outline: 'none',
            minWidth: 200,
          }}
        >
          {members.map(m => (
            <option key={m._id} value={m._id}>
              {m.name} ({m.phone})
            </option>
          ))}
        </select>
      </div>

      {selectedMember && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>会员姓名</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{selectedMember.name}</div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>积分余额</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#f97316' }}>{selectedMember.points}</div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>积分明细</h3>
            {history.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14 }}>暂无积分记录</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>日期</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>项目</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>积分变动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(h => (
                        <tr key={h._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>{h.date}</td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>{h.service}</td>
                          <td style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: h.type === 'earn' ? '#22c55e' : '#ef4444',
                          }}>
                            {h.type === 'earn' ? '+' : '-'}{h.points}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>积分兑换</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {gifts.map(gift => {
                const canRedeem = selectedMember.points >= gift.points
                return (
                  <div
                    key={gift.id}
                    style={{
                      width: 180,
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{gift.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{gift.name}</div>
                    <div style={{ fontSize: 13, color: '#f97316', fontWeight: 600, marginBottom: 12 }}>
                      {gift.points} 积分
                    </div>
                    <button
                      onClick={() => setRedeemGift(gift.id)}
                      disabled={!canRedeem}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: canRedeem ? '#f97316' : '#cbd5e1',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canRedeem ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {canRedeem ? '兑换' : '积分不足'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {redeemGift && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={() => setRedeemGift(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              width: 320,
              maxWidth: '90vw',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>确认兑换</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
              确定要消耗 <strong style={{ color: '#f97316' }}>{gifts.find(g => g.id === redeemGift)?.points}</strong> 积分兑换
              「{gifts.find(g => g.id === redeemGift)?.name}」吗？
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRedeemGift(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={() => handleRedeem(redeemGift)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#f97316',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                确认兑换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberCenter
