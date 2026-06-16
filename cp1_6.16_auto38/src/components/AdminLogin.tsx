import React, { useState } from 'react'

interface AdminLoginProps {
  onLogin: () => void
  onBack: () => void
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok) {
        onLogin()
      } else {
        setError(data.error || '密码错误，请重试')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={onBack}>
        <span style={styles.backArrow}>←</span>
        <span>返回首页</span>
      </button>

      <div style={styles.loginCard}>
        <div style={styles.iconWrapper}>
          <div style={styles.lockIcon}>🔐</div>
        </div>
        <h2 style={styles.title}>管理员登录</h2>
        <p style={styles.subtitle}>请输入管理员密码以进入后台管理系统</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>管理员密码</label>
            <input
              type="password"
              style={{
                ...styles.input,
                ...(error ? styles.inputError : {})
              }}
              placeholder="请输入管理员密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              disabled={loading}
              autoFocus
            />
            {error && <p style={styles.errorText}>{error}</p>}
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonLoading : {})
            }}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p style={styles.hint}>提示：默认密码为 admin123</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    paddingTop: '40px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2C3E50',
    cursor: 'pointer',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease-out',
  },
  backArrow: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '48px 40px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    textAlign: 'center' as const,
  },
  iconWrapper: {
    marginBottom: '24px',
  },
  lockIcon: {
    fontSize: '64px',
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
    marginBottom: '32px',
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
    textAlign: 'left' as const,
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
  submitButton: {
    padding: '16px 32px',
    backgroundColor: '#2C3E50',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
    marginTop: '8px',
  },
  submitButtonLoading: {
    backgroundColor: '#7F8C8D',
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#95A5A6',
    margin: '24px 0 0',
  },
}

export default AdminLogin
