import { useState, useEffect, useMemo } from 'react';
import { ClimateData, TreeRecord } from '../types';
import { generateTree } from '../utils/treeGenerator';
import TreeCanvas from './TreeCanvas';

interface TreeCardProps {
  record: TreeRecord | null;
  todayDate: string;
  onSubmit: (climate: ClimateData, isUpdate: boolean, date?: string) => Promise<boolean>;
  onDelete: (date: string) => void;
  onClose: () => void;
}

interface SliderConfig {
  key: keyof ClimateData;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: string;
}

const sliders: SliderConfig[] = [
  { key: 'temperature', label: '温度', min: -10, max: 45, step: 0.5, unit: '°C', icon: '🌡️' },
  { key: 'humidity', label: '湿度', min: 0, max: 100, step: 1, unit: '%', icon: '💧' },
  { key: 'windSpeed', label: '风速', min: 0, max: 30, step: 0.5, unit: 'm/s', icon: '🌬️' },
  { key: 'light', label: '光照', min: 0, max: 100000, step: 500, unit: 'lux', icon: '☀️' },
];

const defaultClimate: ClimateData = {
  temperature: 22,
  humidity: 55,
  windSpeed: 5,
  light: 30000,
};

export default function TreeCard({
  record,
  todayDate,
  onSubmit,
  onDelete,
  onClose,
}: TreeCardProps) {
  const [climate, setClimate] = useState<ClimateData>(defaultClimate);
  const [isEditing, setIsEditing] = useState(false);
  const [animate, setAnimate] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setClimate(record.climate);
      setIsEditing(false);
      setAnimate(true);
      setAnimationKey((k) => k + 1);
    } else {
      setClimate(defaultClimate);
      setIsEditing(true);
      setAnimate(true);
      setAnimationKey((k) => k + 1);
    }
  }, [record]);

  const previewTree = useMemo(() => generateTree(climate), [climate]);
  const displayTree = record && !isEditing ? record.tree : previewTree;
  const effectiveDate = record?.date || todayDate;
  const isNewRecord = !record;
  const isTodayRecord = record?.date === todayDate;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const isUpdate = !!record && (isTodayRecord || isEditing);
    const ok = await onSubmit(climate, isUpdate, record?.date);
    setSubmitting(false);
    if (ok) {
      setIsEditing(false);
      setAnimate(true);
      setAnimationKey((k) => k + 1);
      showToast(isUpdate ? '已更新数据' : '记录成功！');
    } else {
      showToast('提交失败');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    if (record) {
      onDelete(record.date);
      setShowConfirm(false);
    }
  };

  const handleReplay = () => {
    setAnimate(true);
    setAnimationKey((k) => k + 1);
  };

  const updateClimate = (key: keyof ClimateData, value: number) => {
    setClimate((c) => ({ ...c, [key]: value }));
    if (!isEditing) setIsEditing(true);
  };

  if (!record && !isEditing) return null;

  return (
    <div className="card-overlay" onClick={onClose}>
      <div className="tree-card" onClick={(e) => e.stopPropagation()}>
        <button className="card-close" onClick={onClose}>
          ×
        </button>

        <div className="card-header">
          <h2 className="card-title">
            {isNewRecord ? '🌱 记录今日微气候' : `🌳 ${effectiveDate} 气候记录`}
            {record && isTodayRecord && <span className="today-badge">今天</span>}
          </h2>
          <p className="card-subtitle">
            {isNewRecord
              ? '调整参数，生成属于今天的独特之树'
              : isEditing
              ? '修改参数以重新生成树木'
              : '点击播放按钮重新观看生长动画'}
          </p>
        </div>

        <div className="card-body">
          <div className="card-tree-wrapper">
            <TreeCanvas
              tree={displayTree}
              animate={animate}
              animationKey={animationKey}
              size={400}
            />
            <button className="replay-btn" onClick={handleReplay} title="重播生长动画">
              ▶
            </button>
          </div>

          <div className="card-sliders">
            {sliders.map((s) => (
              <div key={s.key} className="slider-row">
                <div className="slider-label">
                  <span className="slider-icon">{s.icon}</span>
                  <span className="slider-name">{s.label}</span>
                  <span className="slider-value">
                    {s.key === 'light'
                      ? climate[s.key].toLocaleString()
                      : climate[s.key]}
                    {s.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={climate[s.key]}
                  onChange={(e) => updateClimate(s.key, Number(e.target.value))}
                  className="custom-slider"
                />
                <div className="slider-range">
                  <span>
                    {s.key === 'light' ? s.min.toLocaleString() : s.min}
                    {s.unit}
                  </span>
                  <span>
                    {s.key === 'light' ? s.max.toLocaleString() : s.max}
                    {s.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-footer">
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-label">树干</span>
              <span className="stat-value">{displayTree.trunkThickness.toFixed(1)}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">分支</span>
              <span className="stat-value">{displayTree.branchAngle.toFixed(0)}°</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">叶片</span>
              <span className="stat-value">{displayTree.leafCount}片</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">叶色</span>
              <span
                className="stat-color"
                style={{ backgroundColor: displayTree.leafColor }}
              />
            </div>
          </div>

          <div className="card-actions">
            {!isNewRecord && !isEditing && (
              <>
                <button className="btn btn-secondary" onClick={handleEdit}>
                  ✏️ 编辑
                </button>
                <button className="btn btn-danger" onClick={handleDeleteClick}>
                  🗑️ 删除
                </button>
              </>
            )}
            {(isNewRecord || isEditing) && (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '保存中...' : isNewRecord ? '📝 提交记录' : '💾 保存修改'}
              </button>
            )}
          </div>
        </div>

        {toast && <div className="toast">{toast}</div>}

        {showConfirm && (
          <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="confirm-title">确认删除</h3>
              <p className="confirm-message">
                确定要删除 {effectiveDate} 的气候记录吗？此操作不可撤销。
              </p>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                  取消
                </button>
                <button className="btn btn-danger" onClick={confirmDelete}>
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
