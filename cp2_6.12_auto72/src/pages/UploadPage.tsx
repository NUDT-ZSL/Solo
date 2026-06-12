import { useState } from 'react'

const UploadPage = () => {
  const [dragActive, setDragActive] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            上传作品
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            添加新的插画作品到你的作品集
          </p>
        </div>

        <div className="dashboard-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              alert('作品上传功能演示 - 实际项目中会连接后端API')
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                作品图片
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--primary-blue)' : 'var(--border-gray)'}`,
                  borderRadius: '12px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  backgroundColor: dragActive ? 'rgba(74, 144, 217, 0.05)' : 'var(--light-gray)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {selectedFile ? (
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      拖拽图片到这里，或点击选择
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      支持 JPG、PNG、WEBP 格式
                    </div>
                  </>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                作品标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给你的作品起个名字"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '1px solid var(--border-gray)',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary-blue)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-gray)')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  创作日期
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '1px solid var(--border-gray)',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  作品尺寸
                </label>
                <input
                  type="text"
                  placeholder="如 30×40cm"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '1px solid var(--border-gray)',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                使用工具
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['digital', 'watercolor', 'pencil'].map((tool) => {
                  const labels: Record<string, string> = {
                    digital: '数字绘画',
                    watercolor: '水彩',
                    pencil: '铅笔'
                  }
                  return (
                    <label
                      key={tool}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      <input type="checkbox" value={tool} />
                      {labels[tool]}
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                创作心得
              </label>
              <textarea
                placeholder="记录你的创作灵感和心得体会..."
                className="detail-description"
                style={{ width: '100%', minHeight: '100px' }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 500,
                color: '#fff',
                background: 'linear-gradient(to right, var(--primary-blue), var(--primary-purple))',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseDown={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
            >
              上传作品
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UploadPage
