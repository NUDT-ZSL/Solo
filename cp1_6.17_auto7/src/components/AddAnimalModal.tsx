import { useState, useRef } from 'react';
import type { Animal, PersonalityTag, HealthStatus } from '../logic/AdoptionLogic';

interface Props {
  onClose: () => void;
  onAdded: (animal: Animal) => void;
}

export default function AddAnimalModal({ onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'公' | '母' | ''>('');
  const [personalityTags, setPersonalityTags] = useState<PersonalityTag[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus[]>([]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const personalityOptions: PersonalityTag[] = ['友好', '胆小', '活泼'];
  const healthOptions: HealthStatus[] = ['已驱虫', '已疫苗', '已绝育'];

  const handleFile = (file: File) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: '请上传 JPG 或 PNG 格式的图片' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: '图片大小不能超过 2MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(e.target?.result as string);
      setPhotoName(file.name);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const togglePersonality = (tag: PersonalityTag) => {
    setPersonalityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleHealth = (status: HealthStatus) => {
    setHealthStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = '请填写动物名称';
    if (!breed.trim()) newErrors.breed = '请填写品种';
    if (!age || isNaN(parseInt(age, 10)) || parseInt(age, 10) < 0) newErrors.age = '请填写有效年龄';
    if (!gender) newErrors.gender = '请选择性别';
    if (personalityTags.length === 0) newErrors.personality = '请至少选择一个性格标签';
    if (healthStatus.length === 0) newErrors.health = '请至少选择一个健康状况';
    if (!photo) newErrors.photo = '请上传动物照片';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/animals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          breed: breed.trim(),
          age: parseInt(age, 10),
          gender,
          personalityTags,
          healthStatus,
          photo,
          description: description.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        onAdded(data);
        onClose();
      }
    } catch (err) {
      console.error('添加动物失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="title-emoji">📝</span>
            添加新动物
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                动物照片 <span className="required-mark">*</span>
              </label>
              <div
                className={`file-upload ${dragOver ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="file-upload-icon">📷</div>
                <div className="file-upload-text">
                  {photoName ? photoName : '点击或拖拽上传图片'}
                </div>
                <div className="file-upload-hint">支持 JPG/PNG 格式，最大 2MB</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
              {photo && <img src={photo} alt="预览" className="preview-image" />}
              {errors.photo && <span className="form-error">{errors.photo}</span>}
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label className="form-label">
                  名称 <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：小黄"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  品种 <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="例如：中华田园犬"
                />
                {errors.breed && <span className="form-error">{errors.breed}</span>}
              </div>
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label className="form-label">
                  年龄（岁） <span className="required-mark">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="0-30"
                  min={0}
                  max={30}
                />
                {errors.age && <span className="form-error">{errors.age}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  性别 <span className="required-mark">*</span>
                </label>
                <div className="form-radio-group">
                  <label className="form-radio-item">
                    <input
                      type="radio"
                      name="gender"
                      value="公"
                      checked={gender === '公'}
                      onChange={() => setGender('公')}
                    />
                    <span>♂ 公</span>
                  </label>
                  <label className="form-radio-item">
                    <input
                      type="radio"
                      name="gender"
                      value="母"
                      checked={gender === '母'}
                      onChange={() => setGender('母')}
                    />
                    <span>♀ 母</span>
                  </label>
                </div>
                {errors.gender && <span className="form-error">{errors.gender}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                性格标签 <span className="required-mark">*</span>
                <span className="field-hint">（可多选）</span>
              </label>
              <div className="form-checkbox-group">
                {personalityOptions.map((tag) => (
                  <label key={tag} className="form-checkbox-item">
                    <input
                      type="checkbox"
                      checked={personalityTags.includes(tag)}
                      onChange={() => togglePersonality(tag)}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
              {errors.personality && <span className="form-error">{errors.personality}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                健康状况 <span className="required-mark">*</span>
                <span className="field-hint">（可多选）</span>
              </label>
              <div className="form-checkbox-group">
                {healthOptions.map((status) => (
                  <label key={status} className="form-checkbox-item">
                    <input
                      type="checkbox"
                      checked={healthStatus.includes(status)}
                      onChange={() => toggleHealth(status)}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
              {errors.health && <span className="form-error">{errors.health}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">详细描述</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="介绍一下这只小动物的性格、故事等..."
                rows={3}
              />
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
              {submitting ? '添加中...' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
