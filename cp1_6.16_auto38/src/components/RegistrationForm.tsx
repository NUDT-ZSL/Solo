import React, { useState } from 'react'
import { validateName, validateEmail, validatePhone } from '../business/activityManager'

interface RegistrationFormProps {
  activityId: string
  activityName: string
  onSuccess: () => void
  onClose: () => void
}

interface FormData {
  name: string
  email: string
  phone: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  duplicate?: string
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  activityId,
  activityName,
  onSuccess,
  onClose
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  const checkDuplicateRegistration = async (email: string, phone: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/activities/${activityId}/registrations`)
      const registrations = await response.json()
      
      const exists = registrations.some(
        (reg: any) => reg.email === email || reg.phone === phone
      )
      
      return exists
    } catch (error) {
      console.error('Failed to check duplicate registration:', error)
      return false
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!validateName(formData.name)) {
      newErrors.name = '请输入有效的姓名（2-50个字符）'
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    if (errors.duplicate) {
      setErrors(prev => ({ ...prev, duplicate: undefined }))
    }
    if (submitError) {
      setSubmitError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setCheckingDuplicate(true)
    try {
      const isDuplicate = await checkDuplicateRegistration(formData.email, formData.phone)
      
      if (isDuplicate) {
        setErrors(prev => ({ ...prev, duplicate: '您已报名此活动' }))
        setCheckingDuplicate(false)
        return
      }
    } catch (error) {
      console.error('Duplicate check failed:', error)
    } finally {
      setCheckingDuplicate(false)
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activityId,
          ...formData
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
      } else {
        setSubmitError(data.error || '报名失败，请稍后重试')
      }
    } catch (error) {
      setSubmitError('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.formWrapper}>
      <div style={styles.formHeader}>
        <h2 style={styles.formTitle}>活动报名</h2>
        <p style={styles.activityNameText}>{activityName}</p>
      </div>

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>姓名</label>
          <input
            type="text"
            style={{
              ...styles.input,
              ...(errors.name ? styles.inputError : {})
            }}
            placeholder="请输入您的姓名"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={submitting || checkingDuplicate}
          />
          {errors.name && <p style={styles.errorText}>{errors.name}</p>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>邮箱</label>
          <input
            type="email"
            style={{
              ...styles.input,
              ...(errors.email ? styles.inputError : {})
            }}
            placeholder="请输入您的邮箱地址"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={submitting || checkingDuplicate}
          />
          {errors.email && <p style={styles.errorText}>{errors.email}</p>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>电话</label>
          <input
            type="tel"
            style={{
              ...styles.input,
              ...(errors.phone ? styles.inputError : {})
            }}
            placeholder="请输入您的手机号码"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={submitting || checkingDuplicate}
          />
          {errors.phone && <p style={styles.errorText}>{errors.phone}</p>}
        </div>

        {errors.duplicate && (
          <div style={styles.duplicateError}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{errors.duplicate}</span>
          </div>
        )}

        {submitError && (
          <div style={styles.submitError}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(submitting || checkingDuplicate ? styles.submitButtonLoading : {})
          }}
          disabled={submitting || checkingDuplicate}
        >
          {checkingDuplicate ? '校验中...' : submitting ? '提交中...' : '确认报名'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  formWrapper: {
    padding: '40px 32px 32px',
  },
  formHeader: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: '8px',
  },
  activityNameText: {
    fontSize: '14px',
    color: '#7F8C8D',
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    display: 'inline-block',
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
  duplicateError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#FEF9E7',
    border: '1px solid #F9E79F',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#D68910',
  },
  submitError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#FDF2F2',
    border: '1px solid #FADBD8',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#E74C3C',
  },
  errorIcon: {
    fontSize: '16px',
  },
  submitButton: {
    padding: '16px 32px',
    backgroundColor: '#3498DB',
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
    backgroundColor: '#85C1E9',
    cursor: 'not-allowed',
  },
}

export default RegistrationForm
