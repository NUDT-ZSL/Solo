import React, { useState, useEffect, useRef } from 'react';

interface Capsule {
  id: string;
  title: string;
  content: string;
  thumbnail?: string;
  unlockDate: string;
  email: string;
  createdAt: string;
}

interface FormData {
  title: string;
  content: string;
  image?: string;
  unlockDate: string;
  email: string;
}

const App: React.FC = () => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    unlockDate: '',
    email: ''
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [emailShake, setEmailShake] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('capsules');
    if (saved) {
      try {
        setCapsules(JSON.parse(saved));
      } catch {
        fetchCapsules();
      }
    } else {
      fetchCapsules();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('capsules', JSON.stringify(capsules));
  }, [capsules]);

  const fetchCapsules = async () => {
    try {
      const res = await fetch('/api/capsules');
      if (res.ok) {
        const data = await res.json();
        setCapsules(data);
      }
    } catch {
      console.log('Using local data');
    }
  };

  const getDaysRemaining = (unlockDate: string): number => {
    const now = new Date();
    const unlock = new Date(unlockDate);
    const diff = unlock.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = (): string => {
    const max = new Date();
    max.setDate(max.getDate() + 365);
    return max.toISOString().split('T')[0];
  };

  const handleNewCapsule = () => {
    setSelectedId(null);
    setFormData({
      title: '',
      content: '',
      unlockDate: '',
      email: ''
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleSelectCapsule = (capsule: Capsule) => {
    setSelectedId(capsule.id);
    setFormData({
      title: capsule.title,
      content: capsule.content,
      image: capsule.thumbnail,
      unlockDate: capsule.unlockDate,
      email: capsule.email
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = capsule.content;
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这个时间胶囊吗？')) return;
    
    setDeletingId(id);
    setTimeout(async () => {
      try {
        await fetch(`/api/capsules/${id}`, { method: 'DELETE' });
      } catch {
        console.log('Local delete');
      }
      setCapsules(prev => prev.filter(c => c.id !== id));
      if (selectedId === id) {
        handleNewCapsule();
      }
      setDeletingId(null);
    }, 300);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, image: compressed }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const insertImageToEditor = () => {
    if (!formData.image) return;
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertImage', false, formData.image);
    }
  };

  const formatText = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, content: editorRef.current!.innerHTML }));
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, content: editorRef.current!.innerHTML }));
    }
  };

  const handleSeal = () => {
    if (!formData.title.trim()) {
      alert('请输入胶囊标题');
      return;
    }
    if (!formData.unlockDate) {
      alert('请选择解锁日期');
      return;
    }
    if (!validateEmail(formData.email)) {
      setEmailError(true);
      setEmailShake(true);
      setTimeout(() => setEmailShake(false), 300);
      return;
    }
    setEmailError(false);
    setShowConfirm(true);
  };

  const confirmSeal = async () => {
    const newCapsule: Capsule = {
      id: Date.now().toString(),
      title: formData.title,
      content: formData.content,
      thumbnail: formData.image,
      unlockDate: formData.unlockDate,
      email: formData.email,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCapsule)
      });
      if (res.ok) {
        const saved = await res.json();
        newCapsule.id = saved.id || newCapsule.id;
      }
    } catch {
      console.log('Local save');
    }

    setCapsules(prev => [newCapsule, ...prev]);
    setShowConfirm(false);
    handleNewCapsule();
  };

  const gradientBg: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(ellipse at center, #F5ECD7 0%, #E8D5B7 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Noto Serif SC', serif",
    overflow: 'hidden'
  };

  const cardStyle: React.CSSProperties = {
    width: '1000px',
    height: '600px',
    borderRadius: '24px',
    backgroundColor: '#FFFBF5',
    boxShadow: '0 20px 60px #C9B89A, 0 8px 24px rgba(201, 184, 154, 0.4)',
    display: 'flex',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  };

  const leftPanel: React.CSSProperties = {
    width: '40%',
    padding: '20px',
    borderRight: '1px solid #E8DCC8',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  const rightPanel: React.CSSProperties = {
    width: '60%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FDF9F0',
    borderRadius: '12px',
    margin: '12px',
    overflow: 'hidden'
  };

  const newButton: React.CSSProperties = {
    width: '100%',
    height: '44px',
    background: 'linear-gradient(135deg, #D4A84B 0%, #B8923A 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '16px',
    fontFamily: "'Noto Serif SC', serif",
    letterSpacing: '1px',
    boxShadow: '0 4px 12px rgba(212, 168, 75, 0.4)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  };

  const listContainer: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px'
  };

  const listItem = (id: string, isSelected: boolean): React.CSSProperties => ({
    width: '100%',
    height: '80px',
    padding: '10px',
    marginBottom: '8px',
    backgroundColor: isSelected ? '#EDE1C8' : '#F7F2E5',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    opacity: deletingId === id ? 0 : 1,
    transform: deletingId === id ? 'translateX(20px)' : 'translateX(0)',
    transition: 'all 0.2s ease, opacity 0.3s ease, transform 0.3s ease',
    border: isSelected ? '2px solid #D4A84B' : '2px solid transparent',
    boxSizing: 'border-box'
  });

  const thumbnailStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    objectFit: 'cover',
    backgroundColor: '#E8DCC8',
    flexShrink: 0,
    marginRight: '12px'
  };

  const itemContent: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0
  };

  const itemTitle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#4A3C2A',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const itemDays: React.CSSProperties = {
    fontSize: '12px',
    color: '#8B7A5E'
  };

  const deleteButton: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: '#E8C4C4',
    color: '#C94C4C',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    transition: 'background-color 0.2s ease'
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#8B7A5E',
    marginBottom: '6px',
    marginTop: '0'
  };

  const titleInput: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    border: `1px solid ${titleFocused ? '#C8A96E' : '#D4C5A9'}`,
    borderRadius: '8px',
    fontSize: '15px',
    fontFamily: "'Noto Serif SC', serif",
    backgroundColor: '#FFFBF5',
    color: '#3A2C20',
    outline: 'none',
    boxShadow: titleFocused ? '0 0 0 3px rgba(200, 169, 110, 0.2)' : 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    marginBottom: '8px'
  };

  const toolbarButton: React.CSSProperties = {
    width: '36px',
    height: '32px',
    border: '1px solid #D4C5A9',
    borderRadius: '6px',
    backgroundColor: '#FFFBF5',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'Noto Serif SC', serif",
    color: '#4A3C2A',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const editorStyle: React.CSSProperties = {
    width: '100%',
    height: '280px',
    border: '1px solid #D4C5A9',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    lineHeight: 1.6,
    color: '#3A2C20',
    fontFamily: "'Noto Serif SC', serif",
    backgroundColor: '#FFFBF5',
    overflowY: 'auto',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const imageRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px'
  };

  const imagePreview: React.CSSProperties = {
    width: '150px',
    height: '150px',
    borderRadius: '10px',
    objectFit: 'cover',
    backgroundColor: '#E8DCC8',
    border: '1px solid #D4C5A9'
  };

  const uploadButton: React.CSSProperties = {
    padding: '10px 16px',
    border: '1px dashed #D4C5A9',
    borderRadius: '8px',
    backgroundColor: '#FFFBF5',
    color: '#8B7A5E',
    cursor: 'pointer',
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '14px',
    transition: 'all 0.2s ease'
  };

  const formRow: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginTop: '12px'
  };

  const formField: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  };

  const dateInput: React.CSSProperties = {
    height: '36px',
    padding: '0 10px',
    border: '1px solid #D4C5A9',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Noto Serif SC', serif",
    backgroundColor: '#FFFBF5',
    color: '#3A2C20',
    outline: 'none'
  };

  const emailInput: React.CSSProperties = {
    height: '36px',
    padding: '0 10px',
    border: `1px solid ${emailError ? '#C94C4C' : '#D4C5A9'}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Noto Serif SC', serif",
    backgroundColor: '#FFFBF5',
    color: '#3A2C20',
    outline: 'none',
    animation: emailShake ? 'shake 0.3s ease' : 'none'
  };

  const errorText: React.CSSProperties = {
    color: '#C94C4C',
    fontSize: '12px',
    marginTop: '4px',
    minHeight: '16px'
  };

  const sealButton: React.CSSProperties = {
    width: '100%',
    height: '44px',
    background: 'linear-gradient(135deg, #D4A84B 0%, #B8923A 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Noto Serif SC', serif",
    letterSpacing: '2px',
    marginTop: '16px',
    boxShadow: '0 4px 12px rgba(212, 168, 75, 0.4)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#FBF6EE',
    borderRadius: '16px',
    padding: '32px',
    minWidth: '400px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'scaleIn 0.3s ease forwards'
  };

  const modalTitle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#4A3C2A',
    marginBottom: '20px',
    textAlign: 'center',
    fontFamily: "'Noto Serif SC', serif"
  };

  const modalInfo: React.CSSProperties = {
    backgroundColor: '#F7F2E5',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '24px'
  };

  const modalInfoRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#4A3C2A',
    fontFamily: "'Noto Serif SC', serif"
  };

  const modalButtons: React.CSSProperties = {
    display: 'flex',
    gap: '12px'
  };

  const modalCancel: React.CSSProperties = {
    flex: 1,
    height: '42px',
    border: '1px solid #D4C5A9',
    borderRadius: '8px',
    backgroundColor: '#FFFBF5',
    color: '#8B7A5E',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Noto Serif SC', serif",
    transition: 'all 0.2s ease'
  };

  const modalConfirm: React.CSSProperties = {
    flex: 1,
    height: '42px',
    background: 'linear-gradient(135deg, #D4A84B 0%, #B8923A 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Noto Serif SC', serif",
    boxShadow: '0 4px 12px rgba(212, 168, 75, 0.4)',
    transition: 'all 0.2s ease'
  };

  return (
    <>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #D4C5A9;
          border-radius: 3px;
        }
        .capsule-item:hover {
          background-color: #EDE1C8 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(201, 184, 154, 0.3);
        }
        .btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 168, 75, 0.5);
        }
        .btn-hover:active {
          transform: translateY(0);
        }
        .toolbar-btn:hover {
          background-color: #F0E6D2;
          border-color: #C8A96E;
        }
        .upload-btn:hover {
          background-color: #F7F2E5;
          border-color: #C8A96E;
        }
        .delete-btn:hover {
          background-color: #D9A8A8 !important;
        }
        .cancel-btn:hover {
          background-color: #F7F2E5;
        }
        [contenteditable] img {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
        }
      `}</style>
      <div style={gradientBg}>
        <div style={cardStyle} className="card-hover">
          <div style={leftPanel}>
            <button
              style={newButton}
              className="btn-hover"
              onClick={handleNewCapsule}
            >
              + 新建胶囊
            </button>
            <div style={listContainer}>
              {capsules.length === 0 && (
                <div style={{ textAlign: 'center', color: '#8B7A5E', padding: '40px 20px', fontSize: '14px' }}>
                  暂无时间胶囊<br />点击上方按钮创建
                </div>
              )}
              {capsules.map(capsule => (
                <div
                  key={capsule.id}
                  style={listItem(capsule.id, selectedId === capsule.id)}
                  className="capsule-item"
                  onClick={() => handleSelectCapsule(capsule)}
                >
                  {capsule.thumbnail ? (
                    <img src={capsule.thumbnail} alt="" style={thumbnailStyle} />
                  ) : (
                    <div style={thumbnailStyle} />
                  )}
                  <div style={itemContent}>
                    <div style={itemTitle}>{capsule.title || '未命名胶囊'}</div>
                    <div style={itemDays}>
                      剩余 {getDaysRemaining(capsule.unlockDate)} 天解锁
                    </div>
                  </div>
                  <button
                    style={deleteButton}
                    className="delete-btn"
                    onClick={(e) => handleDelete(capsule.id, e)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={rightPanel}>
            <h3 style={{ ...sectionTitle, fontSize: '14px', marginBottom: '10px' }}>胶囊标题</h3>
            <input
              type="text"
              style={titleInput}
              placeholder="给这个时间胶囊起个名字..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
            />

            <h3 style={sectionTitle}>胶囊内容</h3>
            <div style={toolbarStyle}>
              <button
                style={{ ...toolbarButton, fontWeight: 700 }}
                className="toolbar-btn"
                onClick={() => formatText('bold')}
                type="button"
              >
                B
              </button>
              <button
                style={{ ...toolbarButton, fontStyle: 'italic' }}
                className="toolbar-btn"
                onClick={() => formatText('italic')}
                type="button"
              >
                I
              </button>
              <button
                style={toolbarButton}
                className="toolbar-btn"
                onClick={insertImageToEditor}
                type="button"
                title="插入图片"
              >
                🖼
              </button>
            </div>
            <div
              ref={editorRef}
              style={editorStyle}
              contentEditable
              onInput={handleEditorInput}
              suppressContentEditableWarning
            />

            <div style={imageRow}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button
                style={uploadButton}
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                📷 上传图片
              </button>
              {formData.image && (
                <img src={formData.image} alt="预览" style={imagePreview} />
              )}
            </div>

            <div style={formRow}>
              <div style={formField}>
                <label style={sectionTitle}>解锁日期</label>
                <input
                  type="date"
                  style={dateInput}
                  value={formData.unlockDate}
                  min={getMinDate()}
                  max={getMaxDate()}
                  onChange={(e) => setFormData(prev => ({ ...prev, unlockDate: e.target.value }))}
                />
              </div>
              <div style={formField}>
                <label style={sectionTitle}>收件邮箱</label>
                <input
                  type="email"
                  style={emailInput}
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    if (emailError && validateEmail(e.target.value)) {
                      setEmailError(false);
                    }
                  }}
                />
                <div style={errorText}>
                  {emailError && !validateEmail(formData.email) ? '请输入有效的邮箱地址' : ''}
                </div>
              </div>
            </div>

            <button
              style={sealButton}
              className="btn-hover"
              onClick={handleSeal}
            >
              ✦ 封 装 胶 囊 ✦
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div style={overlayStyle} onClick={() => setShowConfirm(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalTitle}>确认封装时间胶囊？</div>
            <div style={modalInfo}>
              <div style={modalInfoRow}>
                <span>胶囊标题</span>
                <span style={{ fontWeight: 600 }}>{formData.title}</span>
              </div>
              <div style={modalInfoRow}>
                <span>解锁日期</span>
                <span style={{ fontWeight: 600 }}>{formData.unlockDate}</span>
              </div>
              <div style={modalInfoRow}>
                <span>剩余天数</span>
                <span style={{ fontWeight: 600, color: '#D4A84B' }}>
                  {getDaysRemaining(formData.unlockDate)} 天
                </span>
              </div>
            </div>
            <div style={modalButtons}>
              <button
                style={modalCancel}
                className="cancel-btn"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </button>
              <button
                style={modalConfirm}
                className="btn-hover"
                onClick={confirmSeal}
              >
                确认封装
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
