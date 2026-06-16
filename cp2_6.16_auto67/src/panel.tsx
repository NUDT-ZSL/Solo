import React, { useState, useEffect, useRef } from 'react'
import type { Plant, User, CareLog } from './types'
import { getUserAdoptedPlants, getCareLogs, addCareLog } from './data'

interface CarePanelProps {
  user: User | null
  onUserUpdate: (user: User) => void
}

export default function CarePanel({ user, onUserUpdate }: CarePanelProps) {
  const [plants, setPlants] = useState<Plant[]>([])
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [logs, setLogs] = useState<CareLog[]>([])
  const [logContent, setLogContent] = useState('')
  const [healthScore, setHealthScore] = useState(3)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [pointsAnimating, setPointsAnimating] = useState(false)
  const [lastPointChange, setLastPointChange] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    getUserAdoptedPlants(user.id).then((data) => {
      setPlants(data)
      if (data.length > 0 && !selectedPlant) {
        setSelectedPlant(data[0])
      }
    })
  }, [user])

  useEffect(() => {
    if (!selectedPlant) return
    getCareLogs(selectedPlant.id).then(setLogs)
  }, [selectedPlant])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('照片大小不能超过5MB')
      return
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('只支持 JPEG 和 PNG 格式')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!selectedPlant || !user) return
    if (!logContent.trim()) {
      alert('请填写养护日志')
      return
    }
    if (logContent.length > 500) {
      alert('日志不能超过500字')
      return
    }
    if (!photoFile) {
      alert('请上传现场照片')
      return
    }

    const oldPoints = user.points
    const result = await addCareLog(
      selectedPlant.id,
      user.id,
      logContent.trim(),
      healthScore,
      photoFile
    )
    onUserUpdate(result.user)
    setLogs((prev) => [result.log, ...prev])
    setLastPointChange(result.user.points - oldPoints)
    setPointsAnimating(true)
    setTimeout(() => setPointsAnimating(false), 500)
    setLogContent('')
    setPhotoFile(null)
    setPhotoPreview('')
    setHealthScore(3)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const renderLeafIcon = (index: number, selected: boolean, size: number = 24) => {
    const color = selected ? '#40916c' : '#ccc'
    return (
      <svg
        key={index}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onClick={() => setHealthScore(index + 1)}
      >
        <path
          d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"
          fill={color}
        />
      </svg>
    )
  }

  return (
    <div
      style={{
        width: '80vw',
        maxWidth: '1200px',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#2d6a4f' }}>
          🌿 我的养护面板
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{ color: '#666', fontSize: '14px' }}>当前积分</span>
          <span
            className={pointsAnimating ? 'bounce-flash' : ''}
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#2d6a4f',
              minWidth: '60px',
              textAlign: 'center',
              display: 'inline-block',
            }}
          >
            {user?.points || 0}
          </span>
          {pointsAnimating && lastPointChange !== 0 && (
            <span
              style={{
                color: lastPointChange > 0 ? '#40916c' : '#e63946',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {lastPointChange > 0 ? `+${lastPointChange}` : lastPointChange}
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
        <div
          style={{
            width: '280px',
            minWidth: '280px',
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
            我的植物 ({plants.length})
          </h3>
          {plants.length === 0 && (
            <p style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              还没有认养植物<br />去地图上认养吧～
            </p>
          )}
          {plants.map((plant) => (
            <div
              key={plant.id}
              onClick={() => setSelectedPlant(plant)}
              style={{
                padding: '12px',
                borderRadius: '10px',
                cursor: 'pointer',
                marginBottom: '8px',
                transition: 'all 0.3s ease',
                background: selectedPlant?.id === plant.id ? '#d8f3dc' : 'transparent',
                border:
                  selectedPlant?.id === plant.id ? '1px solid #40916c' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedPlant?.id !== plant.id) {
                  e.currentTarget.style.background = '#f0f7f0'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPlant?.id !== plant.id) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                {plant.name}
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>{plant.species}</div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                📍 {plant.location}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            background: '#f0f7f0',
            borderRadius: '12px',
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {selectedPlant ? (
            <>
              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#2d6a4f', marginBottom: '8px' }}>
                  {selectedPlant.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#666' }}>{selectedPlant.species}</p>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
                  {selectedPlant.description}
                </p>
              </div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
                  📝 记录养护日志
                </h4>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#666',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    现场照片
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      border: '2px dashed #40916c55',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: '#f0f7f0',
                      transition: 'all 0.3s ease',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#40916c')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#40916c55')}
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="预览"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#40916c', fontSize: '13px' }}>
                        📷 点击上传照片 (JPEG/PNG, 最大5MB)
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#666',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    养护日志 (最多500字)
                  </label>
                  <textarea
                    value={logContent}
                    onChange={(e) => setLogContent(e.target.value.slice(0, 500))}
                    placeholder="记录今天的养护情况..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'border-color 0.3s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#40916c')}
                    onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                  />
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: '11px',
                      color: logContent.length > 450 ? '#e63946' : '#aaa',
                      marginTop: '4px',
                    }}
                  >
                    {logContent.length}/500
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#666',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    植物健康度
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {[0, 1, 2, 3, 4].map((i) => renderLeafIcon(i, i < healthScore))}
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666' }}>
                      {healthScore}/5
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  style={submitButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1b4332'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#2d6a4f'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                  onMouseDown={(e) => createRipple(e)}
                >
                  ✨ 提交日志 (+10积分)
                </button>
              </div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
                  📋 养护记录 ({logs.length})
                </h4>
                {logs.length === 0 && (
                  <p style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    还没有养护记录
                  </p>
                )}
                {logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#f9fdf9',
                      marginBottom: '8px',
                      border: '1px solid #e8f5e9',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {new Date(log.date).toLocaleString('zh-CN')}
                      </span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <svg key={i} width={14} height={14} viewBox="0 0 24 24">
                            <path
                              d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"
                              fill={i < log.healthScore ? '#40916c' : '#ddd'}
                            />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {log.photoUrl && (
                      <img
                        src={log.photoUrl}
                        alt="养护照片"
                        style={{
                          width: '100%',
                          maxHeight: '150px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          marginBottom: '8px',
                        }}
                      />
                    )}
                    <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.5 }}>
                      {log.content}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}
            >
              请从左侧选择一株植物
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounceFlash {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .bounce-flash {
          animation: bounceFlash 0.5s ease, flash 0.5s ease;
        }
        @media (max-width: 768px) {
          /* 响应式调整在组件外层通过 style 处理 */
        }
      `}</style>
    </div>
  )
}

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  background: '#2d6a4f',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
}

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget
  const circle = document.createElement('span')
  const diameter = Math.max(button.clientWidth, button.clientHeight)
  const radius = diameter / 2
  const rect = button.getBoundingClientRect()
  circle.style.width = circle.style.height = `${diameter}px`
  circle.style.left = `${event.clientX - rect.left - radius}px`
  circle.style.top = `${event.clientY - rect.top - radius}px`
  circle.style.background = 'rgba(255,255,255,0.4)'
  circle.style.position = 'absolute'
  circle.style.borderRadius = '50%'
  circle.style.transform = 'scale(0)'
  circle.style.animation = 'ripple 0.6s ease-out'
  circle.style.pointerEvents = 'none'
  circle.style.zIndex = '1'
  button.appendChild(circle)
  setTimeout(() => circle.remove(), 600)
}
