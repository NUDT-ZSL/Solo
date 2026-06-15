import { useState, useMemo, useCallback } from 'react'
import { Activity, Signup, FilterStatus } from '../types'

interface SignupPanelProps {
  activity: Activity | null
  signups: Signup[]
  onAddSignup: (activityId: string, nickname: string, phone: string) => Promise<void>
  onDeleteSignup: (signupId: string) => Promise<void>
  onToggleSupply: (signupId: string, supplyName: string) => Promise<void>
  onBack: () => void
}

const PAGE_SIZE = 20

export default function SignupPanel({
  activity,
  signups,
  onAddSignup,
  onDeleteSignup,
  onToggleSupply,
  onBack,
}: SignupPanelProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ nickname: '', phone: '' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Signup | null>(null)
  const [animKey, setAnimKey] = useState(0)

  const filteredSignups = useMemo(() => {
    let result = signups
    if (search.trim()) {
      const keyword = search.trim().toLowerCase()
      result = result.filter((s) => s.nickname.toLowerCase().includes(keyword))
    }
    if (filter === 'confirmed') {
      result = result.filter((s) => s.confirmed)
    } else if (filter === 'pending') {
      result = result.filter((s) => !s.confirmed)
    }
    return result
  }, [signups, search, filter])

  const totalPages = Math.max(1, Math.ceil(filteredSignups.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedSignups = filteredSignups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = useCallback((newFilter: FilterStatus) => {
    setFilter(newFilter)
    setPage(1)
    setAnimKey((k) => k + 1)
  }, [])

  const handleAdd = useCallback(async () => {
    if (!activity) return
    setAddError('')
    if (!addForm.nickname.trim()) {
      setAddError('请输入昵称')
      return
    }
    if (!/^\d{11}$/.test(addForm.phone)) {
      setAddError('手机号必须为11位数字')
      return
    }
    setAddLoading(true)
    try {
      await onAddSignup(activity.id, addForm.nickname.trim(), addForm.phone.trim())
      setAddForm({ nickname: '', phone: '' })
      setShowAddModal(false)
    } catch (e: any) {
      setAddError(e.message || '添加失败')
    } finally {
      setAddLoading(false)
    }
  }, [activity, addForm, onAddSignup])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await onDeleteSignup(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, onDeleteSignup])

  if (!activity) {
    return (
      <div className="empty-panel">
        <div className="empty-icon">📋</div>
        <p>请从左侧选择一个活动</p>
      </div>
    )
  }

  return (
    <div className="signup-panel">
      <div className="panel-header">
        <button className="back-btn mobile-only" onClick={onBack}>← 返回</button>
        <h2 className="panel-title">{activity.name}</h2>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + 添加报名
        </button>
      </div>

      <div className="panel-toolbar">
        <input
          type="text"
          placeholder="搜索昵称..."
          className="search-input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <div className="filter-tabs">
          {(['all', 'confirmed', 'pending'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => handleFilterChange(f)}
            >
              {f === 'all' ? '全部' : f === 'confirmed' ? '已确认' : '待确认'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="signup-table">
          <thead>
            <tr>
              <th className="col-seq">#</th>
              <th className="col-name">昵称</th>
              <th className="col-phone">手机号</th>
              <th className="col-time">报名时间</th>
              <th className="col-status">状态</th>
              {activity.supplies.map((s) => (
                <th key={s.name} className="col-supply">{s.name}</th>
              ))}
              <th className="col-action">操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedSignups.map((signup, idx) => (
              <tr key={signup.id} className={`table-row fade-in anim-${animKey % 3}`}>
                <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                <td>{signup.nickname}</td>
                <td>{signup.phone}</td>
                <td>{new Date(signup.registeredAt).toLocaleDateString('zh-CN')}</td>
                <td>
                  <span className={`status-tag ${signup.confirmed ? 'confirmed' : 'pending'}`}>
                    {signup.confirmed ? '已确认' : '待确认'}
                  </span>
                </td>
                {activity.supplies.map((s) => (
                  <td key={s.name}>
                    <label className="supply-checkbox">
                      <input
                        type="checkbox"
                        checked={signup.supplies.includes(s.name)}
                        onChange={() => onToggleSupply(signup.id, s.name)}
                      />
                      <span className="checkmark" />
                    </label>
                  </td>
                ))}
                <td>
                  <button className="delete-btn" onClick={() => setDeleteTarget(signup)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </button>
          <span className="page-info">
            {currentPage} / {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>添加报名者</h3>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={addForm.nickname}
                onChange={(e) => setAddForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="请输入昵称"
              />
            </div>
            <div className="form-group">
              <label>手机号</label>
              <input
                type="text"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="11位手机号"
                maxLength={11}
              />
            </div>
            {addError && <div className="form-error">{addError}</div>}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="btn-confirm" onClick={handleAdd} disabled={addLoading}>
                {addLoading ? '提交中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除报名者「{deleteTarget.nickname}」吗？此操作不可撤销。</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="btn-danger" onClick={handleDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
