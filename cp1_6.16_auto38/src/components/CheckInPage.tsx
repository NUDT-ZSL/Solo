import React, { useState, useEffect } from 'react'
import type { Registration, Activity } from '../types'
import { calculateCheckInStats, formatDate, validateEmail, validatePhone } from '../business/activityManager'

const CheckInPage: React.FC = () => {
  const [checkInCode, setCheckInCode] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ email?: string; phone?: string; code?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [participants, setParticipants] = useState<Registration[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  const fetchParticipants = async (activityId: string) => {
    setLoadingParticipants(true)
    try {
      const response = await fetch(`/api/activities/${activityId}/registrations`)
      const data = await response.json()
      setParticipants(data)
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setLoadingParticipants(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { email?: string; phone?: string; code?: string } = {}

    if (!checkInCode.trim()) {
      newErrors.code = '请输入签到码'
    }

    if (!email && !phone) {
      newErrors.email = '请输入邮箱或手机号'
      newErrors.phone = '请输入邮箱或手机号'
    } else if (email && !validateEmail(email)) {
      newErrors.email = '请输入有效的邮箱地址'
    } else if (phone && !validatePhone(phone)) {
      newErrors.phone = '请输入有效的手机号码'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setCheckInStatus('idle')
    setStatusMessage('')

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: checkInCode.trim().toUpperCase(),
          email: email.trim(),
          phone: phone.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCheckInStatus('success')
        setStatusMessage(data.message || '签到成功！')
        setCurrentActivity(data.activity)
        setShowSuccessAnimation(true)
        fetchParticipants(data.activity.id)
      } else {
        setCheckInStatus('error')
        setStatusMessage(data.error || '签到失败，请检查信息')
      }
    } catch (error) {
      setCheckInStatus('error')
      setStatusMessage('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleScanCode = () => {
    alert('扫码功能：请扫描活动现场的二维码进行签到')
  }

  const handleReset = () => {
    setCheckInCode('')
    setEmail('')
    setPhone('')
    setErrors({})
    setCheckInStatus('idle')
    setStatusMessage('')
    setCurrentActivity(null)
    setParticipants([])
  }

  const getAvatarColor = (name: string): string => {
    const colors = ['#3498DB', '#27AE60', '#E74C3C', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const stats = currentActivity ? calculateCheckInStats(participants) : null

  return (
    <div style={styles.container}>
      <div style={styles.checkInCard}>
        <div style={styles.cardHeader}>
          <h2 style={styles.title}>活动签到</h2>
          <p style={styles.subtitle}>输入签到码或扫码完成签到</p>
        </div>

        {checkInStatus === 'success' && showSuccessAnimation && (
          <div style={styles.successAnimation}>
            <div style={styles.successIconWrapper}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ animation: 'rotate 0.5s ease-out' }}>
                <circle cx="40" cy="40" r="38" fill="#27AE60" />
                <path
                  d="M24 40L34 50L56 28"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p style={styles.successText}>签到成功！</p>
            <button
              type="button"
              style={styles.resetButton}
              onClick={handleReset}
            >
              继续签到
            </button>
          </div>
        )}

        {checkInStatus !== 'success' && (
          <form style={styles.form} onSubmit={handleCheckIn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>签到码</label>
              <input
                type="text"
                style={{
                  ...styles.input,
                  ...(errors.code ? styles.inputError : {})
                }}
                placeholder="请输入6位签到码"
                value={checkInCode}
                onChange={(e) => {
                  setCheckInCode(e.target.value.toUpperCase())
                  if (errors.code) setErrors(prev => ({ ...prev, code: undefined }))
                  if (checkInStatus !== 'idle') {
                    setCheckInStatus('idle')
                    setStatusMessage('')
                  }
                }}
                disabled={submitting}
                maxLength={10}
              />
              {errors.code && <p style={styles.errorText}>{errors.code}</p>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>邮箱</label>
              <input
                type="email"
                style={{
                  ...styles.input,
                  ...(errors.email ? styles.inputError : {})
                }}
                placeholder="请输入报名时的邮箱"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                }}
                disabled={submitting}
              />
              {errors.email && <p style={styles.errorText}>{errors.email}</p>}
            </div>

            <div style={styles.divider}>
              <span style={styles.dividerText}>或</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>手机号</label>
              <input
                type="tel"
                style={{
                  ...styles.input,
                  ...(errors.phone ? styles.inputError : {})
                }}
                placeholder="请输入报名时的手机号"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }))
                }}
                disabled={submitting}
                maxLength={11}
              />
              {errors.phone && <p style={styles.errorText}>{errors.phone}</p>}
            </div>

            {checkInStatus === 'error' && (
              <div style={{
                ...styles.statusMessage,
                ...styles.errorMessage
              }}>
                <span style={styles.statusIcon}>
                  ✕
                </span>
                <span>{statusMessage}</span>
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(submitting ? styles.submitButtonLoading : {})
                }}
                disabled={submitting}
              >
                {submitting ? '签到中...' : '确认签到'}
              </button>
              <button
                type="button"
                style={styles.scanButton}
                onClick={handleScanCode}
                disabled={submitting}
              >
                <span style={styles.scanIcon}>📷</span>
                扫码签到
              </button>
            </div>
          </form>
        )}
      </div>

      {currentActivity && (
        <div style={styles.participantsCard}>
          <div style={styles.participantsHeader}>
            <div>
              <h3 style={styles.participantsTitle}>{currentActivity.name}</h3>
              <p style={styles.participantsSubtitle}>
                {formatDate(currentActivity.date)} {currentActivity.time} · {currentActivity.location}
              </p>
            </div>
            {stats && (
              <div style={styles.statsContainer}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{stats.totalRegistered}</span>
                  <span style={styles.statLabel}>总报名</span>
                </div>
                <div style={styles.statDivider}></div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: '#27AE60' }}>{stats.totalCheckedIn}</span>
                  <span style={styles.statLabel}>已签到</span>
                </div>
                <div style={styles.statDivider}></div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: '#E74C3C' }}>{stats.notCheckedInCount}</span>
                  <span style={styles.statLabel}>未签到</span>
                </div>
              </div>
            )}
          </div>

          <div style={styles.participantsList}>
            {loadingParticipants ? (
              <div style={styles.loadingState}>
                <div style={styles.loadingSpinner}></div>
                <p>加载参与者列表...</p>
              </div>
            ) : participants.length > 0 ? (
              participants
                .sort((a, b) => {
                  if (a.checkedIn !== b.checkedIn) return a.checkedIn ? -1 : 1
                  return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
                })
                .map((participant, index) => (
                  <div key={participant.id} style={styles.participantItem} className="slide-up">
                    <div style={{
                      ...styles.avatar,
                      backgroundColor: getAvatarColor(participant.name)
                    }}>
                      {participant.name.charAt(0)}
                    </div>
                    <div style={styles.participantInfo}>
                      <span style={styles.participantName}>{participant.name}</span>
                      <span style={styles.participantEmail}>{participant.email}</span>
                    </div>
                    <div style={{
                      ...styles.checkInStatus,
                      ...(participant.checkedIn ? styles.checkedIn : styles.notCheckedIn)
                    }}>
                      <span style={styles.statusDot}></span>
                      {participant.checkedIn ? '已签到' : '未签到'}
                    </div>
                  </div>
                ))
            ) : (
              <div style={styles.emptyState}>
                <p>暂无参与者信息</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  cardHeader: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2C3E50',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7F8C8D',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#2C3E50',
  },
  input: {
    padding: '14px 16px',
    border: '2px solid #E0E0E0',
    borderRadius: '10px',
    fontSize: '15px',
    color: '#2C3E50',
    backgroundColor: '#FAFAFA',
    transition: 'all 0.3s ease-out',
    textTransform: 'uppercase' as const,
  },
  inputError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FDF2F2',
  },
  errorText: {
    fontSize: '12px',
    color: '#E74C3C',
    margin: 0,
  },
  divider: {
    position: 'relative' as const,
    textAlign: 'center' as const,
    margin: '8px 0',
  },
  dividerText: {
    position: 'relative' as const,
    zIndex: 1,
    padding: '0 16px',
    backgroundColor: '#FFFFFF',
    color: '#95A5A6',
    fontSize: '12px',
  },
  statusMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
  },
  successMessage: {
    backgroundColor: '#EAFAF1',
    color: '#27AE60',
    border: '1px solid #ABEBC6',
  },
  errorMessage: {
    backgroundColor: '#FDF2F2',
    color: '#E74C3C',
    border: '1px solid #FADBD8',
  },
  statusIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '16px 32px',
    backgroundColor: '#3498DB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  submitButtonLoading: {
    backgroundColor: '#85C1E9',
    cursor: 'not-allowed',
  },
  scanButton: {
    padding: '16px 24px',
    backgroundColor: '#2C3E50',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease-out',
  },
  scanIcon: {
    fontSize: '18px',
  },
  resetButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#3498DB',
    border: '2px solid #3498DB',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  successAnimation: {
    textAlign: 'center' as const,
    padding: '40px 20px',
  },
  successIconWrapper: {
    marginBottom: '16px',
  },
  successText: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#27AE60',
    margin: 0,
    animation: 'fadeIn 0.5s ease-out',
  },
  participantsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  participantsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #F0F0F0',
  },
  participantsTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: '4px',
  },
  participantsSubtitle: {
    fontSize: '13px',
    color: '#7F8C8D',
    margin: 0,
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    backgroundColor: '#F8F9FA',
    borderRadius: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: '60px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: '11px',
    color: '#7F8C8D',
    marginTop: '2px',
  },
  statDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: '#E0E0E0',
  },
  participantsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '500px',
    overflowY: 'auto' as const,
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    transition: 'all 0.3s ease-out',
    animationDelay: '0.1s',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: 600,
    flexShrink: 0,
  },
  participantInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    minWidth: 0,
  },
  participantName: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#2C3E50',
  },
  participantEmail: {
    fontSize: '13px',
    color: '#7F8C8D',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  checkInStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
  checkedIn: {
    backgroundColor: '#EAFAF1',
    color: '#27AE60',
  },
  notCheckedIn: {
    backgroundColor: '#FDF2F2',
    color: '#E74C3C',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
  loadingState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#7F8C8D',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #E0E0E0',
    borderTopColor: '#3498DB',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'rotate 1s linear infinite',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#95A5A6',
  },
}

export default CheckInPage
