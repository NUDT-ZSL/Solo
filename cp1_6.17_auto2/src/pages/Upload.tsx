import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import './Upload.css';

interface Flaw {
  x: number;
  y: number;
  w: number;
  h: number;
  description: string;
}

interface Report {
  id: string;
  score: number;
  flaws: Flaw[];
  priceRange: {
    min: number;
    max: number;
    unit: string;
  };
  grade: string;
  generatedAt: string;
}

function CircleProgress({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;
  
  const getColor = (score: number) => {
    if (score >= 90) return '#2ECC71';
    if (score >= 75) return '#3498DB';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  return (
    <div className="circle-progress-small" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-fill animate-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          stroke={getColor(score)}
          style={{
            transition: 'stroke-dashoffset 0.8s ease'
          }}
        />
      </svg>
      <div className="progress-content">
        <span className="score-number">{score}</span>
        <span className="score-unit">分</span>
      </div>
    </div>
  );
}

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    name: '',
    price: ''
  });
  const [activePreview, setActivePreview] = useState(0);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles].slice(0, 6);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    setReport(null);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 6,
    multiple: true
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    setReport(null);
    if (activePreview >= newFiles.length && newFiles.length > 0) {
      setActivePreview(newFiles.length - 1);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    setReport(null);

    try {
      const formDataObj = new FormData();
      files.forEach(file => {
        formDataObj.append('images', file);
      });
      formDataObj.append('brand', formData.brand);
      formDataObj.append('model', formData.model);

      const response = await fetch('/api/reports', {
        method: 'POST',
        body: formDataObj
      });

      if (!response.ok) {
        throw new Error('分析失败');
      }

      const result: Report = await response.json();
      setReport(result);
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!report) return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name || formData.brand + ' ' + formData.model);
      formDataObj.append('brand', formData.brand);
      formDataObj.append('model', formData.model);
      formDataObj.append('price', formData.price || String(report.priceRange.min));
      formDataObj.append('condition', report.grade);
      formDataObj.append('conditionScore', String(report.score));
      formDataObj.append('description', `成色鉴定评分：${report.score}分，${report.grade}。检测到${report.flaws.length}处瑕疵。`);
      formDataObj.append('sellerId', userId);
      formDataObj.append('sellerName', localStorage.getItem('username') || '卖家');
      
      files.forEach(file => {
        formDataObj.append('images', file);
      });

      const response = await fetch('/api/instruments', {
        method: 'POST',
        body: formDataObj
      });

      if (response.ok) {
        const newInstrument = await response.json();
        alert('发布成功！');
        navigate(`/instrument/${newInstrument.id}`);
      } else {
        alert('发布失败，请重试');
      }
    } catch (error) {
      console.error('发布失败:', error);
      alert('发布失败，请重试');
    }
  };

  const getConditionClass = (grade: string) => {
    switch (grade) {
      case '全新': return 'condition-new';
      case '几乎全新': return 'condition-like-new';
      case '有明显使用痕迹': return 'condition-used';
      case '有瑕疵': return 'condition-damaged';
      default: return 'condition-used';
    }
  };

  return (
    <div className="upload-page">
      <div className="container">
        <h1 className="page-title">上传鉴定</h1>
        <p className="page-subtitle">上传乐器照片，AI智能分析成色，生成专业鉴定报告</p>

        <div className="upload-layout">
          <div className="upload-left">
            <div className="upload-section">
              <h2 className="section-title-small">上传照片</h2>
              <p className="section-hint">支持最多6张照片，建议包含正面、背面、琴头、指板等角度</p>
              
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''} ${files.length >= 6 ? 'full' : ''}`}
              >
                <input {...getInputProps()} ref={fileInputRef} />
                
                <div className="dropzone-content">
                  <div className="dropzone-icon">📷</div>
                  <p className="dropzone-text">
                    {isDragActive ? '松开鼠标上传图片' : '拖拽图片到此处，或点击选择'}
                  </p>
                  <p className="dropzone-hint">支持 JPG、PNG、GIF 格式，最多6张</p>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="preview-section">
                  <div className="main-preview">
                    <img src={previews[activePreview]} alt="预览" />
                    {report && report.flaws.length > 0 && activePreview === 0 && (
                      <>
                        {report.flaws.map((flaw, idx) => (
                          <div
                            key={idx}
                            className="flaw-marker-preview"
                            style={{
                              left: `${flaw.x * 100}%`,
                              top: `${flaw.y * 100}%`,
                              width: `${flaw.w * 100}%`,
                              height: `${flaw.h * 100}%`
                            }}
                            title={flaw.description}
                          >
                            <span className="flaw-num">{idx + 1}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  
                  <div className="thumbnails-bar">
                    {previews.map((preview, idx) => (
                      <div
                        key={idx}
                        className={`thumbnail-item ${idx === activePreview ? 'active' : ''}`}
                        onClick={() => setActivePreview(idx)}
                      >
                        <img src={preview} alt={`缩略图 ${idx + 1}`} />
                        <button
                          className="remove-thumb"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                        >
                          ×
                        </button>
                        {report && idx === 0 && (
                          <span className="thumb-badge">主图</span>
                        )}
                      </div>
                    ))}
                    
                    {files.length < 6 && (
                      <button
                        className="add-more-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        + 添加
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <h2 className="section-title-small">基本信息</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">品牌</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="如：Martin、Gibson、Yamaha"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">型号</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="如：D-28、Les Paul"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">标题（可选）</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="给您的乐器起个标题"
                />
              </div>

              <div className="form-group">
                <label className="form-label">期望售价（可选）</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="不填将按推荐价格发布"
                />
              </div>
            </div>

            <button
              className="btn btn-primary analyze-btn"
              onClick={handleAnalyze}
              disabled={files.length === 0 || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="btn-spinner"></span>
                  分析中...
                </>
              ) : (
                '开始鉴定分析'
              )}
            </button>
          </div>

          <div className="upload-right">
            <div className="report-card-sticky">
              <h2 className="section-title-small">鉴定报告</h2>
              
              {!report && !isAnalyzing && (
                <div className="report-placeholder">
                  <div className="placeholder-icon">📋</div>
                  <p>上传照片并开始鉴定</p>
                  <span>生成专业成色评估报告</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="report-loading">
                  <div className="loading-ring"></div>
                  <p>正在分析图像特征...</p>
                  <span>请稍候，约需 3-5 秒</span>
                </div>
              )}

              {report && !isAnalyzing && (
                <div className="report-result">
                  <div className="score-section">
                    <CircleProgress score={report.score} />
                    <span className={`grade-badge ${getConditionClass(report.grade)}`}>
                      {report.grade}
                    </span>
                  </div>

                  <div className="report-divider"></div>

                  <div className="flaws-section">
                    <h3 className="flaws-header">
                      <span>瑕疵检测</span>
                      <span className="flaw-count">{report.flaws.length}处</span>
                    </h3>
                    {report.flaws.length > 0 ? (
                      <ul className="flaw-list">
                        {report.flaws.map((flaw, idx) => (
                          <li key={idx} className="flaw-item">
                            <span className="flaw-index">{idx + 1}</span>
                            <span className="flaw-desc">{flaw.description}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-flaws">未检测到明显瑕疵 ✨</p>
                    )}
                  </div>

                  <div className="report-divider"></div>

                  <div className="price-section">
                    <h3 className="price-header">推荐售价区间</h3>
                    <div className="price-display">
                      ¥{report.priceRange.min.toLocaleString()} 
                      <span className="price-sep"> - </span>
                      ¥{report.priceRange.max.toLocaleString()}
                    </div>
                    <p className="price-note">基于品牌、型号、成色及平台历史数据</p>
                  </div>

                  <button
                    className="btn btn-primary publish-btn"
                    onClick={handleSubmit}
                  >
                    立即发布商品
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
