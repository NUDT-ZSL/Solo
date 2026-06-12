import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import ExhibitionList from './pages/ExhibitionList'
import ExhibitionDetail from './pages/ExhibitionDetail'
import { ExhibitionListItem } from './types'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [exhibitions, setExhibitions] = useState<ExhibitionListItem[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newZones, setNewZones] = useState<string[]>([''])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchExhibitions()
  }, [])

  const fetchExhibitions = async () => {
    try {
      const res = await fetch('/api/exhibitions')
      const data = await res.json()
      setExhibitions(data)
    } catch (err) {
      console.error('Failed to fetch exhibitions:', err)
    }
  }

  const handleNewExhibition = () => {
    setNewName('')
    setNewStartDate('')
    setNewEndDate('')
    setNewZones([''])
    setShowNewModal(true)
  }

  const handleAddZone = () => {
    setNewZones([...newZones, ''])
  }

  const handleRemoveZone = (index: number) => {
    if (newZones.length > 1) {
      setNewZones(newZones.filter((_, i) => i !== index))
    }
  }

  const handleZoneChange = (index: number, value: string) => {
    const updated = [...newZones]
    updated[index] = value
    setNewZones(updated)
  }

  const handleSubmitNew = async () => {
    const validZones = newZones.filter(z => z.trim() !== '')
    if (!newName.trim() || !newStartDate || !newEndDate || validZones.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/exhibitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          startDate: newStartDate,
          endDate: newEndDate,
          zones: validZones
        })
      })
      const data = await res.json()
      setShowNewModal(false)
      await fetchExhibitions()
      navigate(`/exhibition/${data.id}`)
    } catch (err) {
      console.error('Failed to create exhibition:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = newName.trim() !== '' && newStartDate !== '' && newEndDate !== '' && newZones.some(z => z.trim() !== '')

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return '即将开展'
      case 'ongoing': return '进行中'
      case 'ended': return '已结束'
      default: return status
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-title" onClick={() => navigate('/')}>
          ArtFlow
        </div>
        <button className="btn-new" onClick={handleNewExhibition}>
          + 新建
        </button>
      </nav>

      <div className="page-container">
        <Routes>
          <Route
            path="/"
            element={<ExhibitionList exhibitions={exhibitions} />}
          />
          <Route
            path="/exhibition/:id"
            element={<ExhibitionDetail />}
          />
        </Routes>
      </div>

      <div className={`new-exhibition-modal-overlay ${showNewModal ? 'visible' : ''}`} onClick={() => setShowNewModal(false)}>
        <div className="new-exhibition-modal" onClick={(e) => e.stopPropagation()}>
          <h2>新建展览</h2>

          <div className="form-group">
            <label>展览名称</label>
            <input
              type="text"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="请输入展览名称"
            />
          </div>

          <div className="date-range">
            <div className="form-group">
              <label>开始日期</label>
              <input
                type="date"
                className="form-input"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>结束日期</label>
              <input
                type="date"
                className="form-input"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>展区设置</label>
            {newZones.map((zone, index) => (
              <div key={index} className="zone-input-row">
                <input
                  type="text"
                  className="form-input"
                  value={zone}
                  onChange={(e) => handleZoneChange(index, e.target.value)}
                  placeholder={`展区 ${index + 1}`}
                />
                <button
                  className="btn-remove-zone"
                  onClick={() => handleRemoveZone(index)}
                  disabled={newZones.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button className="btn-add-zone" onClick={handleAddZone}>
              + 添加展区
            </button>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setShowNewModal(false)}>
              取消
            </button>
            <button
              className="btn-confirm"
              onClick={handleSubmitNew}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
