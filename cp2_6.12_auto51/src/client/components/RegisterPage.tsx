import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { registerUser } from '../api';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('文件格式错误，请上传 JPG 或 PNG 格式的图片');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件大小超过限制，请上传小于 2MB 的图片');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNameError(null);

    if (!name.trim()) {
      setNameError('请输入姓名');
      return;
    }

    if (!avatarBase64) {
      setError('请上传头像');
      return;
    }

    try {
      setLoading(true);
      const user = await registerUser(name.trim(), avatarBase64);
      navigate(`/user/${user.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #FFF8E7 0%, #FFE4B5 50%, #FFDAB9 100%)',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 20px 60px rgba(245, 166, 35, 0.15)',
          width: '100%',
          maxWidth: 420,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F5A623 0%, #F7B84E 100%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 16px',
              fontSize: 32,
            }}
          >
            🌟
          </motion.div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: '#3D2914',
            }}
          >
            欢迎注册
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              color: '#8B7355',
              fontSize: 14,
            }}
          >
            创建您的账户，开始打卡之旅
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: 600,
                color: '#5D4037',
                fontSize: 14,
              }}
            >
              姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="请输入您的姓名"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: nameError ? '2px solid #E74C3C' : '2px solid #F0E0C8',
                borderRadius: 12,
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                background: '#FFFCF8',
              }}
              onFocus={(e) => {
                if (!nameError) e.target.style.borderColor = '#F5A623';
              }}
              onBlur={(e) => {
                if (!nameError) e.target.style.borderColor = '#F0E0C8';
              }}
            />
            {nameError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  margin: '8px 0 0',
                  color: '#E74C3C',
                  fontSize: 13,
                }}
              >
                {nameError}
              </motion.p>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: 600,
                color: '#5D4037',
                fontSize: 14,
              }}
            >
              头像
            </label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <motion.div
                whileHover={{ scale: avatarPreview ? 1.02 : 1 }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #F5A623',
                  background: '#FFF5E6',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="头像预览"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 48, opacity: 0.4 }}>👤</span>
                )}
              </motion.div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '10px 24px',
                  background: '#FFF5E6',
                  border: '2px dashed #F5A623',
                  borderRadius: 10,
                  color: '#F5A623',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {avatarPreview ? '更换头像' : '选择头像'}
              </motion.button>

              <p style={{ margin: 0, fontSize: 12, color: '#A0896C' }}>
                支持 JPG、PNG 格式，大小不超过 2MB
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: '#FDE8E8',
                  border: '1px solid #F5B7B1',
                  borderRadius: 10,
                  color: '#C0392B',
                  fontSize: 13,
                }}
              >
                {error}
              </motion.div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 24px rgba(245, 166, 35, 0.35)' } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%',
              padding: '16px',
              background: loading
                ? 'linear-gradient(135deg, #D4A05C 0%, #D4A05C 100%)'
                : 'linear-gradient(135deg, #F5A623 0%, #F7B84E 100%)',
              border: 'none',
              borderRadius: 12,
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(245, 166, 35, 0.25)',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 18,
                  height: 18,
                  border: '2px solid #FFFFFF',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                }}
              />
            )}
            {loading ? '注册中...' : '立即注册'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
