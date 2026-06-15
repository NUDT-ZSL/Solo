import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { dataStore, plantTypeLabels, ExchangeRequest } from '../../logic/dataStore'
import './PlantDetailPage.css'

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plant, setPlant] = useState(dataStore.getPlantById(id || ''))
  const [requests, setRequests] = useState<ExchangeRequest[]>([])
  const [leavingRequests, setLeavingRequests] = useState<string[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')

  useEffect(() => {
    if (plant) {
      setRequests(dataStore.getExchangeRequests(plant.id))
    }
  }, [plant?.id])

  if (!plant) {
    return (
      <div className="detail-page">
        <div className="not-found">
          <p>植物不存在</p>
          <button onClick={() => navigate('/')} className="back-btn">返回首页</button>
        </div>
      </div>
    )
  }

  const isOwner = plant.ownerId === dataStore.getCurrentUser().id
  const owner = dataStore.getUserById(plant.ownerId)

  const handleAccept = (requestId: string) => {
    setLeavingRequests(prev => [...prev, requestId])
    setTimeout(() => {
      dataStore.updateExchangeRequestStatus(requestId, 'accepted')
      setRequests(dataStore.getExchangeRequests(plant.id))
      setLeavingRequests(prev => prev.filter(id => id !== requestId))
    }, 200)
  }

  const handleReject = (requestId: string) => {
    setLeavingRequests(prev => [...prev, requestId])
    setTimeout(() => {
      dataStore.updateExchangeRequestStatus(requestId, 'rejected')
      setRequests(dataStore.getExchangeRequests(plant.id))
      setLeavingRequests(prev => prev.filter(id => id !== requestId))
    }, 200)
  }

  const handleSubmitRequest = () => {
    if (!requestMessage.trim()) return
    dataStore.addExchangeRequest(plant.id, requestMessage)
    setRequests(dataStore.getExchangeRequests(plant.id))
    setRequestMessage('')
    setShowRequestForm(false)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const getPlantEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      succulent: '🌵',
      foliage: '🌿',
      flowering: '🌸',
      herb: '🌱',
      vegetable: '🥬'
    }
    return emojis[type] || '🌱'
  }

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回
      </button>

      <div className="detail-container">
        <div className="detail-left">
          <div className="detail-image">
            <span className="detail-emoji">{getPlantEmoji(plant.type)}</span>
            <span className={`status-badge ${plant.status}`}>
              {plant.status === 'offering' ? '正在提供' : '正在需求'}
            </span>
          </div>

          <div className="detail-info">
            <h1 className="detail-name">{plant.name}</h1>
            <div className="detail-tags">
              <span className="detail-type-tag">{plantTypeLabels[plant.type]}</span>
              <span className="detail-age-tag">{plant.age}株龄</span>
              <span className="detail-region-tag">{plant.region}</span>
            </div>

            <div className="detail-variety">
              <span className="label">品种：</span>
              <span>{plant.variety}</span>
            </div>

            <div className="detail-description">
              <h3>描述</h3>
              <p>{plant.description}</p>
            </div>
          </div>

          <div className="owner-section">
            <h3>卖家介绍</h3>
            <div className="owner-info">
              <div className="owner-avatar">
                {owner?.name.charAt(0)}
              </div>
              <div className="owner-details">
                <p className="owner-name">{owner?.name}</p>
                <p className="owner-region">{owner?.region}</p>
                <p className="owner-bio">{owner?.bio}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-right">
          <div className="requests-section">
            <div className="requests-header">
              <h3>交换请求</h3>
              {!isOwner && (
                <button 
                  className="request-btn"
                  onClick={() => setShowRequestForm(!showRequestForm)}
                >
                  申请交换
                </button>
              )}
            </div>

            {showRequestForm && (
              <div className="request-form" style={{ animation: 'fadeIn 0.3s ease' }}>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="留言说明你想用什么交换..."
                  rows={3}
                />
                <div className="form-actions">
                  <button className="cancel-btn" onClick={() => setShowRequestForm(false)}>
                    取消
                  </button>
                  <button className="submit-btn" onClick={handleSubmitRequest}>
                    提交申请
                  </button>
                </div>
              </div>
            )}

            {isOwner && requests.length === 0 && (
              <p className="empty-text">暂无交换请求</p>
            )}

            {!isOwner && requests.length === 0 && (
              <p className="empty-text">还没有人申请交换，快来第一个申请吧！</p>
            )}

            <div className="requests-list">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`request-item ${leavingRequests.includes(request.id) ? 'leaving' : ''}`}
                  style={{
                    animation: leavingRequests.includes(request.id) 
                      ? 'slideOutRight 0.2s ease forwards' 
                      : 'fadeIn 0.3s ease'
                  }}
                >
                  <div className="request-avatar">
                    {request.requesterName.charAt(0)}
                  </div>
                  <div className="request-content">
                    <p className="request-name">{request.requesterName}</p>
                    <p className="request-time">{formatDate(request.createdAt)}</p>
                    <p className="request-message">{request.message}</p>
                  </div>
                  {isOwner && (
                    <div className="request-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleAccept(request.id)}
                      >
                        接受
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleReject(request.id)}
                      >
                        拒绝
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
