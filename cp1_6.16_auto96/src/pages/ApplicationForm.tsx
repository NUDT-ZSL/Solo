import { useState } from 'react'
import type { Animal, ApplicationFormData, HousingType, ValidationErrors } from '../logic/AdoptionLogic'
import { validateApplication, calculateMatchScore } from '../logic/AdoptionLogic'
import '../styles/ApplicationForm.css'

interface ApplicationFormProps {
  animal: Animal
  onClose: () => void
  onSubmitSuccess: () => void
}

const housingOptions: HousingType[] = ['自有住房', '租房', '其他']

function ApplicationForm({ animal, onClose, onSubmitSuccess }: ApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    applicantName: '',
    phone: '',
    age: '',
    housingType: [],
    hasPet: false,
    experience: '',
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleInputChange = (field: keyof ApplicationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const toggleHousing = (type: HousingType) => {
    setFormData((prev) => ({
      ...prev,
      housingType: prev.housingType.includes(type)
        ? prev.housingType.filter((t) => t !== type)
        : [...prev.housingType, type],
    }))
    if (errors.housingType) {
      setErrors((prev) => ({ ...prev, housingType: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    const validationErrors = validateApplication(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const matchScore = calculateMatchScore(formData, animal)

    setSubmitting(true)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animalId: animal.id,
          applicantName: formData.applicantName,
          phone: formData.phone,
          age: parseInt(formData.age as string),
          housingType: formData.housingType,
          hasPet: formData.hasPet,
          experience: formData.experience,
          matchScore,
        }),
      })

      if (response.ok) {
        onSubmitSuccess()
      } else {
        const data = await response.json()
        setSubmitError(data.error || '提交失败，请稍后重试')
      }
    } catch (error) {
      setSubmitError('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content application-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>领养申请表</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="form-animal-info">
          <span>申请领养：</span>
          <strong>{animal.name}</strong>
          <span className="form-animal-breed">（{animal.breed}）</span>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {submitError && <div className="form-error">{submitError}</div>}

          <div className="form-group">
            <label>领养人姓名 *</label>
            <input
              type="text"
              value={formData.applicantName}
              onChange={(e) => handleInputChange('applicantName', e.target.value)}
              placeholder="请输入您的姓名"
            />
            {errors.applicantName && (
              <span className="field-error">{errors.applicantName}</span>
            )}
          </div>

          <div className="form-group">
            <label>联系电话 *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="请输入11位手机号码"
              maxLength={11}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label>年龄 *</label>
            <input
              type="number"
              min="18"
              max="70"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="请输入年龄（18-70岁）"
            />
            {errors.age && <span className="field-error">{errors.age}</span>}
          </div>

          <div className="form-group">
            <label>住房类型 *</label>
            <div className="checkbox-group">
              {housingOptions.map((option) => (
                <label
                  key={option}
                  className={`checkbox-tag ${
                    formData.housingType.includes(option) ? 'active' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.housingType.includes(option)}
                    onChange={() => toggleHousing(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
            {errors.housingType && (
              <span className="field-error">{errors.housingType}</span>
            )}
          </div>

          <div className="form-group">
            <label>是否已有宠物 *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="hasPet"
                  value="yes"
                  checked={formData.hasPet === true}
                  onChange={() => handleInputChange('hasPet', true)}
                />
                是
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="hasPet"
                  value="no"
                  checked={formData.hasPet === false}
                  onChange={() => handleInputChange('hasPet', false)}
                />
                否
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>养宠经验描述</label>
            <textarea
              value={formData.experience}
              onChange={(e) => handleInputChange('experience', e.target.value)}
              placeholder="请描述您的养宠经验（选填，最多500字）"
              rows={4}
              maxLength={500}
            />
            <div className="char-count">{formData.experience.length}/500</div>
            {errors.experience && (
              <span className="field-error">{errors.experience}</span>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationForm
