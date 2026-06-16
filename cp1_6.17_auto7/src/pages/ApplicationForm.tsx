import { useState } from 'react';
import type { Animal, ApplicationFormData, HousingType } from '../logic/AdoptionLogic';
import { validateApplication } from '../logic/AdoptionLogic';

interface Props {
  animal: Animal;
  onClose: () => void;
}

export default function ApplicationForm({ animal, onClose }: Props) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    applicantName: '',
    phone: '',
    age: '',
    housingType: [],
    hasExistingPets: '',
    petExperience: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const housingOptions: HousingType[] = ['自有住房', '租房', '其他'];

  const updateField = <K extends keyof ApplicationFormData>(
    field: K,
    value: ApplicationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleHousing = (option: HousingType) => {
    setFormData((prev) => {
      const exists = prev.housingType.includes(option);
      return {
        ...prev,
        housingType: exists
          ? prev.housingType.filter((h) => h !== option)
          : [...prev.housingType, option]
      };
    });
    if (errors.housingType) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.housingType;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateApplication(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('提交申请失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="modal-overlay">
        <div className="modal-content success-modal-content">
          <div className="success-icon">🎉</div>
          <h3 className="success-title">申请提交成功！</h3>
          <p className="success-text">
            我们已收到您对 <b>{animal.name}</b> 的领养申请，<br />
            管理员会尽快与您联系，请保持手机畅通~
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="title-emoji">💝</span>
            领养申请 · {animal.name}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-animal-summary">
              <img src={animal.photo} alt={animal.name} className="form-animal-photo" />
              <div className="form-animal-info">
                <div className="form-animal-name">{animal.name}</div>
                <div className="form-animal-meta">{animal.breed} · {animal.gender} · {animal.age}岁</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                领养人姓名 <span className="required-mark">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.applicantName}
                onChange={(e) => updateField('applicantName', e.target.value)}
                placeholder="请输入您的姓名"
              />
              {errors.applicantName && (
                <span className="form-error">{errors.applicantName}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                联系电话 <span className="required-mark">*</span>
              </label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="请输入11位手机号码"
                maxLength={11}
              />
              {errors.phone && (
                <span className="form-error">{errors.phone}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                年龄 <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                className="form-input"
                value={formData.age}
                onChange={(e) => updateField('age', e.target.value)}
                placeholder="请输入18-70岁之间的整数"
                min={18}
                max={70}
              />
              {errors.age && (
                <span className="form-error">{errors.age}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                住房类型 <span className="required-mark">*</span>
                <span className="field-hint">（可多选）</span>
              </label>
              <div className="form-checkbox-group">
                {housingOptions.map((option) => (
                  <label key={option} className="form-checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.housingType.includes(option)}
                      onChange={() => toggleHousing(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.housingType && (
                <span className="form-error">{errors.housingType}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                是否已有宠物 <span className="required-mark">*</span>
              </label>
              <div className="form-radio-group">
                <label className="form-radio-item">
                  <input
                    type="radio"
                    name="hasPets"
                    value="是"
                    checked={formData.hasExistingPets === '是'}
                    onChange={() => updateField('hasExistingPets', '是')}
                  />
                  <span>是</span>
                </label>
                <label className="form-radio-item">
                  <input
                    type="radio"
                    name="hasPets"
                    value="否"
                    checked={formData.hasExistingPets === '否'}
                    onChange={() => updateField('hasExistingPets', '否')}
                  />
                  <span>否</span>
                </label>
              </div>
              {errors.hasExistingPets && (
                <span className="form-error">{errors.hasExistingPets}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">养宠经验描述</label>
              <textarea
                className="form-textarea"
                value={formData.petExperience}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    updateField('petExperience', e.target.value);
                  }
                }}
                placeholder="请描述您过去养宠物的经历，包括宠物种类、饲养时长等（选填，最多500字）"
                rows={4}
              />
              <div className="char-count">
                {formData.petExperience.length}/500
              </div>
              {errors.petExperience && (
                <span className="form-error">{errors.petExperience}</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
