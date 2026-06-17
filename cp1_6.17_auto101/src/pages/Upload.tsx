import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import WatermarkEditor, { WatermarkParams } from '../components/WatermarkEditor';

export default function Upload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [price, setPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [watermarkParams, setWatermarkParams] = useState<WatermarkParams>({
    text: '版权归作者所有',
    fontSize: 18,
    color: '#999999',
    opacity: 0.33,
    angle: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setError('');
    }
  };

  const handleParamsChange = useCallback((params: WatermarkParams) => {
    setWatermarkParams(params);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('请输入作品标题'); return; }
    if (!price || parseFloat(price) <= 0) { setError('请输入有效价格'); return; }
    if (!imageFile) { setError('请选择图片文件'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('style', style);
      formData.append('price', price);
      formData.append('watermarkText', watermarkParams.text);
      formData.append('watermarkFontSize', String(watermarkParams.fontSize));
      formData.append('watermarkColor', watermarkParams.color);
      formData.append('watermarkOpacity', String(watermarkParams.opacity));
      formData.append('watermarkAngle', String(watermarkParams.angle));

      await api.works.upload(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <h2 className="section-title">上传作品</h2>

      <div className="upload-layout">
        <div className="upload-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>作品图片</label>
              <div className="file-input-wrapper">
                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
              </div>
            </div>

            <div className="form-group">
              <label>作品标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入作品标题"
              />
            </div>

            <div className="form-group">
              <label>风格</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="">请选择风格</option>
                <option value="海报">海报</option>
                <option value="插画">插画</option>
                <option value="Logo">Logo</option>
                <option value="UI设计">UI设计</option>
                <option value="摄影">摄影</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="form-group">
              <label>价格（元）</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="请输入价格"
              />
            </div>

            <div className="form-group">
              <label>作品描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入作品描述"
                rows={4}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '上传中...' : '提交上传'}
            </button>
          </form>
        </div>

        <div className="upload-preview">
          <WatermarkEditor
            imageFile={imageFile}
            onParamsChange={handleParamsChange}
          />
        </div>
      </div>
    </div>
  );
}
