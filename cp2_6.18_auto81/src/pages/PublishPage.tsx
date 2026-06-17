import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import LoadingSpinner from '../components/LoadingSpinner';
import { compressImage } from '../utils/imageUtils';
import type { Category } from '../types';

const categories: Category[] = ['家具', '电器', '书籍', '衣物', '其他'];

interface FormErrors {
  title?: string;
  category?: string;
  description?: string;
  image?: string;
}

export const PublishPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useItems();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = '请输入物品标题';
    } else if (title.length > 100) {
      newErrors.title = '标题不能超过100个字符';
    }

    if (!category) {
      newErrors.category = '请选择物品分类';
    }

    if (description.length > 500) {
      newErrors.description = '描述不能超过500个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('只支持 JPG/PNG 格式');
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('图片大小不能超过 3MB');
      return;
    }

    setImageLoading(true);
    setImageName(file.name);

    try {
      const compressedImage = await compressImage(file, 1024);
      setImage(compressedImage);
    } catch (err) {
      setImageError('图片压缩失败');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await addItem({
        title: title.trim(),
        category: category as Category,
        description: description.trim(),
        image,
        publisher: '当前用户',
        publisherAvatar: 'https://via.placeholder.com/48',
      });
      navigate('/');
    } catch (err) {
      alert('发布失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    setImageName('');
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={containerStyle}>
      <button className="btn" onClick={() => navigate(-1)} style={backButtonStyle}>
        ← 返回
      </button>

      <div style={formContainerStyle}>
        <h1 style={titleStyle}>发布物品</h1>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              标题 <span style={requiredStyle}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入物品标题"
              style={{ ...inputStyle, ...(errors.title ? errorInputStyle : {}) }}
              disabled={loading}
            />
            {errors.title && <p style={errorTextStyle}>{errors.title}</p>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              分类 <span style={requiredStyle}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              style={{ ...selectStyle, ...(errors.category ? errorInputStyle : {}) }}
              disabled={loading}
            >
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p style={errorTextStyle}>{errors.category}</p>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入物品描述（选填）"
              rows={4}
              style={{ ...textareaStyle, ...(errors.description ? errorInputStyle : {}) }}
              disabled={loading}
            />
            {errors.description && <p style={errorTextStyle}>{errors.description}</p>}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>图片</label>
            <div style={imageUploadContainerStyle}>
              {image ? (
                <div style={imagePreviewContainerStyle}>
                  <img src={image} alt="预览" style={imagePreviewStyle} />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={removeImageButtonStyle}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={imageUploadAreaStyle}
                >
                  {imageLoading ? (
                    <div style={imageLoadingStyle}>
                      <LoadingSpinner size={24} />
                      <span style={{ marginTop: 8 }}>处理中...</span>
                    </div>
                  ) : (
                    <>
                      <span style={uploadIconStyle}>+</span>
                      <span style={uploadTextStyle}>点击上传图片</span>
                      <span style={uploadHintStyle}>支持 JPG/PNG，最大 3MB</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageChange}
                style={hiddenFileInputStyle}
              />
            </div>
            {imageName && !imageError && (
              <p style={imageNameStyle}>{imageName}</p>
            )}
            {imageError && <p style={errorTextStyle}>{imageError}</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || imageLoading}
            style={submitButtonStyle}
          >
            {loading ? '发布中...' : '发布物品'}
          </button>
        </form>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  padding: '24px 16px',
};

const backButtonStyle: React.CSSProperties = {
  marginBottom: 24,
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-background)',
  borderRadius: 8,
  padding: 32,
  boxShadow: 'var(--shadow-md)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 24,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-primary)',
};

const requiredStyle: React.CSSProperties = {
  color: 'var(--error-color)',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  fontSize: 14,
  transition: 'border-color 0.2s',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  fontSize: 14,
  transition: 'border-color 0.2s',
  outline: 'none',
  backgroundColor: '#fff',
};

const textareaStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  fontSize: 14,
  transition: 'border-color 0.2s',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const errorInputStyle: React.CSSProperties = {
  borderColor: 'var(--error-color)',
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--error-color)',
  marginTop: 4,
};

const imageUploadContainerStyle: React.CSSProperties = {
  position: 'relative',
};

const imageUploadAreaStyle: React.CSSProperties = {
  border: '2px dashed var(--border-color)',
  borderRadius: 8,
  padding: 40,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: '#fafafa',
};

const imageLoadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
};

const uploadIconStyle: React.CSSProperties = {
  fontSize: 32,
  color: 'var(--text-secondary)',
  fontWeight: 300,
};

const uploadTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
};

const uploadHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
};

const imagePreviewContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxHeight: 300,
  backgroundColor: '#f5f5f5',
  borderRadius: 8,
  overflow: 'hidden',
};

const imagePreviewStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  maxHeight: 300,
};

const removeImageButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 28,
  height: 28,
  borderRadius: '50%',
  backgroundColor: 'var(--error-color)',
  color: '#fff',
  border: 'none',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const hiddenFileInputStyle: React.CSSProperties = {
  display: 'none',
};

const imageNameStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  marginTop: 8,
};

const submitButtonStyle: React.CSSProperties = {
  marginTop: 8,
};

export default PublishPage;
