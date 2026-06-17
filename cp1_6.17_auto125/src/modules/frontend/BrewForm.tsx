import React, { useState, useCallback } from 'react';
import { Save, RotateCcw, Star } from 'lucide-react';

const ORIGINS = [
  '埃塞俄比亚',
  '哥伦比亚',
  '巴西',
  '危地马拉',
  '肯尼亚',
  '哥斯达黎加',
  '巴拿马',
  '印度尼西亚',
];

const GRIND_LABELS = ['粗', '偏粗', '中', '偏细', '细'];
const RATIOS = ['1:14', '1:15', '1:16', '1:17'];
const FLAVORS = [
  { key: '酸', color: '#EF4444' },
  { key: '甜', color: '#F59E0B' },
  { key: '苦', color: '#8B5CF6' },
  { key: '醇', color: '#10B981' },
];

interface FormErrors {
  origin?: string;
  grindLevel?: string;
  waterTemp?: string;
  ratio?: string;
  pourTime?: string;
  flavorTags?: string;
  rating?: string;
}

export default function BrewForm() {
  const [origin, setOrigin] = useState('');
  const [grindLevel, setGrindLevel] = useState(0);
  const [waterTemp, setWaterTemp] = useState(90);
  const [ratio, setRatio] = useState('');
  const [pourTime, setPourTime] = useState(180);
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!origin) e.origin = '请选择咖啡豆产地';
    if (!grindLevel) e.grindLevel = '请选择研磨度';
    if (waterTemp < 87 || waterTemp > 96) e.waterTemp = '水温范围87-96℃';
    if (!ratio) e.ratio = '请选择粉水比';
    if (pourTime < 120 || pourTime > 300) e.pourTime = '注水时间范围120-300秒';
    if (flavorTags.length === 0) e.flavorTags = '请至少选择一个风味标签';
    if (rating === 0) e.rating = '请选择评分';
    return e;
  }, [origin, grindLevel, waterTemp, ratio, pourTime, flavorTags, rating]);

  const toggleFlavor = (key: string) => {
    setFlavorTags((prev) => {
      if (prev.includes(key)) return prev.filter((f) => f !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
    setErrors((e) => ({ ...e, flavorTags: undefined }));
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/brews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          grindLevel,
          waterTemp,
          ratio,
          pourTime,
          flavorTags,
          rating,
        }),
      });
      if (res.ok) {
        handleReset();
        alert('保存成功！');
      }
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (origin || grindLevel || rating) {
      const confirmed = window.confirm('确定要清空所有输入吗？');
      if (!confirmed) return;
    }
    setOrigin('');
    setGrindLevel(0);
    setWaterTemp(90);
    setRatio('');
    setPourTime(180);
    setFlavorTags([]);
    setRating(0);
    setHoverRating(0);
    setErrors({});
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 600);
  };

  return (
    <div className="brew-form-page">
      <h2 className="page-title">记录冲煮参数</h2>

      <div className="form-group">
        <label className="form-label">咖啡豆产地</label>
        <select
          className={`form-select ${errors.origin ? 'input-error' : ''}`}
          value={origin}
          onChange={(e) => {
            setOrigin(e.target.value);
            setErrors((err) => ({ ...err, origin: undefined }));
          }}
        >
          <option value="">请选择产地</option>
          {ORIGINS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {errors.origin && <span className="error-text">{errors.origin}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">研磨度</label>
        <div className="grind-options">
          {GRIND_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`grind-btn ${grindLevel === i + 1 ? 'grind-btn--active' : ''} ${
                errors.grindLevel ? 'input-error' : ''
              }`}
              onClick={() => {
                setGrindLevel(i + 1);
                setErrors((err) => ({ ...err, grindLevel: undefined }));
              }}
            >
              <span className="grind-number">{i + 1}</span>
              <span className="grind-label">{label}</span>
            </button>
          ))}
        </div>
        {errors.grindLevel && <span className="error-text">{errors.grindLevel}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">水温（℃）</label>
        <div className="temp-row">
          <input
            type="range"
            min={87}
            max={96}
            step={1}
            value={waterTemp}
            onChange={(e) => {
              setWaterTemp(Number(e.target.value));
              setErrors((err) => ({ ...err, waterTemp: undefined }));
            }}
            className="temp-slider"
          />
          <span className="temp-value">{waterTemp}℃</span>
        </div>
        {errors.waterTemp && <span className="error-text">{errors.waterTemp}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">粉水比</label>
        <div className="ratio-options">
          {RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              className={`ratio-btn ${ratio === r ? 'ratio-btn--active' : ''} ${
                errors.ratio ? 'input-error' : ''
              }`}
              onClick={() => {
                setRatio(r);
                setErrors((err) => ({ ...err, ratio: undefined }));
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {errors.ratio && <span className="error-text">{errors.ratio}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">总注水时间（秒）</label>
        <input
          type="number"
          min={120}
          max={300}
          value={pourTime}
          onChange={(e) => {
            setPourTime(Number(e.target.value));
            setErrors((err) => ({ ...err, pourTime: undefined }));
          }}
          className={`form-input ${errors.pourTime ? 'input-error' : ''}`}
        />
        {errors.pourTime && <span className="error-text">{errors.pourTime}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">风味标签（最多3个）</label>
        <div className="flavor-options">
          {FLAVORS.map(({ key, color }) => (
            <button
              key={key}
              type="button"
              className={`flavor-tag ${flavorTags.includes(key) ? 'flavor-tag--active' : ''} ${
                errors.flavorTags && !flavorTags.length ? 'input-error' : ''
              }`}
              style={{
                backgroundColor: flavorTags.includes(key) ? color : 'transparent',
                borderColor: color,
                color: flavorTags.includes(key) ? '#fff' : color,
              }}
              onClick={() => toggleFlavor(key)}
            >
              {key}
            </button>
          ))}
        </div>
        {errors.flavorTags && <span className="error-text">{errors.flavorTags}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">个人评分</label>
        <div className="star-rating">
          {Array.from({ length: 10 }, (_, i) => {
            const starValue = i + 1;
            const filled = starValue <= (hoverRating || rating);
            return (
              <button
                key={i}
                type="button"
                className={`star-btn ${filled ? 'star-btn--filled' : ''} ${
                  errors.rating ? 'input-error-star' : ''
                }`}
                onClick={() => {
                  setRating(starValue);
                  setErrors((err) => ({ ...err, rating: undefined }));
                }}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  size={24}
                  fill={filled ? '#FFD700' : 'none'}
                  stroke={filled ? '#FFD700' : '#ccc'}
                />
              </button>
            );
          })}
          <span className="rating-text">
            {rating > 0 ? `${rating}/10` : '未评分'}
          </span>
        </div>
        {errors.rating && <span className="error-text">{errors.rating}</span>}
      </div>

      <div className="form-actions">
        <button
          className="btn btn-save"
          onClick={(e) => {
            handleRipple(e);
            handleSave();
          }}
          disabled={saving}
        >
          {ripple && (
            <span
              className="ripple-effect"
              style={{ left: ripple.x, top: ripple.y }}
            />
          )}
          <Save size={18} />
          {saving ? '保存中...' : '保存'}
        </button>
        <button className="btn btn-reset" onClick={handleReset}>
          <RotateCcw size={18} />
          重置
        </button>
      </div>
    </div>
  );
}
