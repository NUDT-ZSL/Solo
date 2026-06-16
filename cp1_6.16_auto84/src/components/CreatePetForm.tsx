import { useState, useRef, useCallback, useEffect } from 'react';
import { Pet, PERSONALITY_OPTIONS } from '../utils/petStore';
import './CreatePetForm.css';

interface CreatePetFormProps {
  pet?: Pet;
  onSave: (data: {
    name: string;
    breed: string;
    age: number;
    personalityTags: string[];
    signature: string;
    avatar: string;
  }) => void;
  onCancel: () => void;
}

export function CreatePetForm({ pet, onSave, onCancel }: CreatePetFormProps) {
  const [name, setName] = useState(pet?.name || '');
  const [breed, setBreed] = useState(pet?.breed || '');
  const [age, setAge] = useState(pet?.age?.toString() || '');
  const [personalityTags, setPersonalityTags] = useState<string[]>(
    pet?.personalityTags || []
  );
  const [signature, setSignature] = useState(pet?.signature || '');
  const [avatar, setAvatar] = useState(pet?.avatar || '');
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar: '请上传图片文件' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAvatar(result);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.avatar;
        return newErrors;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const toggleTag = (tag: string) => {
    setPersonalityTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '请输入宠物名字';
    }
    if (!breed.trim()) {
      newErrors.breed = '请输入宠物品种';
    }
    if (!age || isNaN(Number(age)) || Number(age) < 0) {
      newErrors.age = '请输入有效的年龄';
    }
    if (signature.length > 100) {
      newErrors.signature = '签名不能超过100字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      name: name.trim(),
      breed: breed.trim(),
      age: Number(age),
      personalityTags,
      signature: signature.trim(),
      avatar: avatar || getDefaultAvatar(),
    });
  };

  const getDefaultAvatar = () => {
    const gradients = [
      ['#FFD1DC', '#FFB6C1'],
      ['#B2EBF2', '#80DEEA'],
      ['#E1BEE7', '#CE93D8'],
      ['#FAD0C4', '#FFD1FF'],
      ['#C8E6C9', '#A5D6A7'],
      ['#FFF9C4', '#FFF59D'],
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${randomGradient[0]}"/><stop offset="100%" style="stop-color:${randomGradient[1]}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="85" r="35" fill="white" opacity="0.6"/><ellipse cx="75" cy="140" rx="20" ry="25" fill="white" opacity="0.5"/><ellipse cx="125" cy="140" rx="20" ry="25" fill="white" opacity="0.5"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
  };

  useEffect(() => {
    if (!avatar && !pet) {
      setAvatar(getDefaultAvatar());
    }
  }, []);

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>{pet ? '编辑宠物' : '创建新宠物'}</h2>
        <button className="close-btn" onClick={onCancel}>×</button>
      </div>

      <form onSubmit={handleSubmit} className="pet-form">
        <div className="form-group">
          <label>宠物照片</label>
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {avatar ? (
              <img src={avatar} alt="预览" className="avatar-preview" />
            ) : (
              <div className="drop-zone-content">
                <span className="upload-icon">📷</span>
                <p>点击或拖拽上传照片</p>
                <p className="upload-hint">支持 JPG、PNG 格式</p>
              </div>
            )}
            {isDragging && <div className="pulse-ring" />}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          {errors.avatar && <span className="error-text">{errors.avatar}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>名字 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="宠物的名字"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>品种 *</label>
            <input
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="比如：金毛、英短"
              className={errors.breed ? 'error' : ''}
            />
            {errors.breed && <span className="error-text">{errors.breed}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>年龄（岁）*</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="宠物的年龄"
            min="0"
            step="0.5"
            className={errors.age ? 'error' : ''}
          />
          {errors.age && <span className="error-text">{errors.age}</span>}
        </div>

        <div className="form-group">
          <label>性格标签</label>
          <div className="tags-container">
            {PERSONALITY_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-btn ${personalityTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>宠物签名</label>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="写一句有趣的宠物签名..."
            rows={3}
            maxLength={100}
            className={errors.signature ? 'error' : ''}
          />
          <div className="char-count">
            {signature.length}/100
          </div>
          {errors.signature && <span className="error-text">{errors.signature}</span>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="btn btn-primary">
            {pet ? '保存修改' : '创建卡片'}
          </button>
        </div>
      </form>
    </div>
  );
}
