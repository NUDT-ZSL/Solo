import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Plant,
  PlantSpecies,
  LightZone,
  PotMaterial,
  MoisturePreference,
  SPECIES_LIST,
  LIGHT_ZONES,
  POT_MATERIALS,
  MOISTURE_PREFERENCES,
  createPlant,
  validatePlant,
  getSpeciesColor,
  generateWateringFrequency,
} from './plantManager';
import {
  GrowthRecord,
  MonthlyStats,
  generateWeeklyTasks,
  aggregateMonthlyStats,
  computePlantStats,
} from './TaskService';
import PlantCard from './components/PlantCard';
import TaskBoard from './components/TaskBoard';

type TabKey = 'plants' | 'tasks' | 'growth' | 'stats';

const TAB_CONFIG: { key: TabKey; label: string; icon: string }[] = [
  { key: 'plants', label: '植物档案', icon: '🌿' },
  { key: 'tasks', label: '养护看板', icon: '📋' },
  { key: 'growth', label: '生长记录', icon: '📸' },
  { key: 'stats', label: '统计看板', icon: '📊' },
];

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
    },
    [key]
  );
  return [state, set];
}

const TrendChart: React.FC<{ stats: MonthlyStats[]; themeColor: string }> = ({
  stats,
  themeColor,
}) => {
  if (stats.length === 0) return null;
  const maxTotal = Math.max(...stats.map((s) => s.total), 1);
  const width = 600;
  const height = 200;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const points = stats.map((s, i) => ({
    x: padL + (i / Math.max(stats.length - 1, 1)) * chartW,
    y: padT + chartH - (s.total / maxTotal) * chartH,
    data: s,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath =
    linePath +
    ` L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 600, height: 'auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padT + chartH - ratio * chartH;
        return (
          <g key={ratio}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#E8E8E8" strokeWidth={0.5} />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#AAA">
              {Math.round(ratio * maxTotal)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={themeColor} fillOpacity={0.08} />
      <path d={linePath} fill="none" stroke={themeColor} strokeWidth={2} strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={themeColor} />
          <text
            x={p.x}
            y={padT + chartH + 15}
            textAnchor="middle"
            fontSize={8}
            fill="#999"
          >
            {p.data.month.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
};

const App: React.FC = () => {
  const [plants, setPlants] = useLocalStorage<Plant[]>('plants', []);
  const [completedTaskIds, setCompletedTaskIds] = useLocalStorage<string[]>('completedTaskIds', []);
  const [growthRecords, setGrowthRecords] = useLocalStorage<GrowthRecord[]>('growthRecords', []);
  const [activeTab, setActiveTab] = useState<TabKey>('plants');
  const [showForm, setShowForm] = useState(false);

  const [formName, setFormName] = useState('');
  const [formSpecies, setFormSpecies] = useState<PlantSpecies | ''>('');
  const [formLocation, setFormLocation] = useState<LightZone | ''>('');
  const [formPot, setFormPot] = useState<PotMaterial | ''>('');
  const [formMoisture, setFormMoisture] = useState<MoisturePreference | ''>('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [growthNote, setGrowthNote] = useState('');
  const [growthPhoto, setGrowthPhoto] = useState('');
  const [rawPhoto, setRawPhoto] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<HTMLDivElement>(null);

  const weeklyTasks = useMemo(() => generateWeeklyTasks(plants, new Date()), [plants]);

  const tasksWithCompletion = useMemo(
    () =>
      weeklyTasks.map((t) => ({
        ...t,
        completed: completedTaskIds.includes(t.id),
      })),
    [weeklyTasks, completedTaskIds]
  );

  const handleToggleTask = useCallback(
    (taskId: string) => {
      setCompletedTaskIds((prev) => {
        const exists = prev.includes(taskId);
        return exists ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      });
    },
    [setCompletedTaskIds]
  );

  const completedTasks = useMemo(
    () => weeklyTasks.filter((t) => completedTaskIds.includes(t.id)),
    [weeklyTasks, completedTaskIds]
  );

  const monthlyStats = useMemo(() => aggregateMonthlyStats(completedTasks), [completedTasks]);
  const plantStats = useMemo(() => computePlantStats(plants, completedTasks), [plants, completedTasks]);

  const handleCreatePlant = () => {
    const partial: Partial<Plant> = {
      name: formName,
      species: formSpecies as PlantSpecies | undefined,
      location: formLocation as LightZone | undefined,
      potMaterial: formPot as PotMaterial | undefined,
      moisturePreference: formMoisture as MoisturePreference | undefined,
    };
    const errors = validatePlant(partial);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    const plant = createPlant(
      formName,
      formSpecies as PlantSpecies,
      formLocation as LightZone,
      formPot as PotMaterial,
      formMoisture as MoisturePreference
    );
    setPlants((prev) => [...prev, plant]);
    setShowForm(false);
    setFormName('');
    setFormSpecies('');
    setFormLocation('');
    setFormPot('');
    setFormMoisture('');
    setFormErrors([]);
  };

  const handleDeletePlant = (id: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setRawPhoto(result);
      setShowCropper(true);
      setCropArea({ x: 10, y: 10, w: 80, h: 80 });
    };
    reader.readAsDataURL(file);
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropArea.x, y: e.clientY - cropArea.y });
  };

  const handleCropMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = cropperRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let newX = e.clientX - dragStart.x - rect.left;
      let newY = e.clientY - dragStart.y - rect.top;
      newX = Math.max(0, Math.min(newX, 120 - cropArea.w));
      newY = Math.max(0, Math.min(newY, 120 - cropArea.h));
      setCropArea((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [isDragging, dragStart, cropArea.w, cropArea.h]
  );

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
    };
  }, [isDragging, handleCropMouseMove, handleCropMouseUp]);

  const applyCrop = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = img.naturalWidth / 120;
      const scaleY = img.naturalHeight / 120;
      const sx = cropArea.x * scaleX;
      const sy = cropArea.y * scaleY;
      const sw = cropArea.w * scaleX;
      const sh = cropArea.h * scaleY;

      canvas.width = 160;
      canvas.height = 160;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 160, 160);
      setGrowthPhoto(canvas.toDataURL('image/jpeg', 0.8));
      setShowCropper(false);
    };
    img.src = rawPhoto;
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setRawPhoto('');
  };

  const handleAddGrowthRecord = () => {
    if (!selectedPlantId || !growthNote.trim()) return;
    const plant = plants.find((p) => p.id === selectedPlantId);
    if (!plant) return;
    const record: GrowthRecord = {
      id: `gr_${Date.now()}`,
      plantId: selectedPlantId,
      photo: growthPhoto || '',
      note: growthNote.trim(),
      lightLevel: plant.lightLevel,
      timestamp: new Date().toISOString(),
      taskType: '浇水',
    };
    setGrowthRecords((prev) => [record, ...prev]);
    setGrowthNote('');
    setGrowthPhoto('');
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #E0E0E0',
    fontSize: 13,
    background: '#fff',
    width: '100%',
    color: '#333',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FDF5E6' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @keyframes elasticExpand {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-elastic { animation: elasticExpand 0.3s ease forwards; transform-origin: top; }
        .animate-fade { animation: fadeIn 0.3s ease forwards; }
        @media (max-width: 768px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
          .task-week-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .responsive-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .task-week-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1025px) {
          .responsive-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        input:focus, select:focus, textarea:focus { border-color: #4CAF50 !important; box-shadow: 0 0 0 2px rgba(76,175,80,0.15); }
        button:active { transform: scale(0.97); }
      `}</style>

      <header
        style={{
          background: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
          padding: '20px 24px',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            🌱 绿植养护助手
          </h1>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            {plants.length} 盆植物 · {completedTaskIds.length} 项已完成
          </span>
        </div>
      </header>

      <nav
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          gap: 0,
          padding: '0 16px',
          borderBottom: '2px solid #E8E8E8',
          background: '#FDF5E6',
        }}
      >
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#4CAF50' : '#888',
              borderBottom: activeTab === tab.key ? '2px solid #4CAF50' : '2px solid transparent',
              marginBottom: -2,
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
        {activeTab === 'plants' && (
          <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, color: '#2E3B2E' }}>我的植物</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4CAF50',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
              >
                {showForm ? '取消' : '+ 添加植物'}
              </button>
            </div>

            {showForm && (
              <div
                className="animate-elastic"
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '1px 1px 4px #E0E0E0',
                  marginBottom: 16,
                }}
              >
                <h3 style={{ fontSize: 15, marginBottom: 12, color: '#2E3B2E' }}>创建植物档案</h3>

                {formErrors.length > 0 && (
                  <div style={{ background: '#FFF3E0', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    {formErrors.map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#E65100' }}>{e}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>植物名称</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="如：客厅绿萝"
                      style={{ ...selectStyle, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>品种</label>
                    <select
                      value={formSpecies}
                      onChange={(e) => setFormSpecies(e.target.value as PlantSpecies)}
                      style={selectStyle}
                    >
                      <option value="">请选择</option>
                      {SPECIES_LIST.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>摆放位置</label>
                    <select
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value as LightZone)}
                      style={selectStyle}
                    >
                      <option value="">请选择</option>
                      {LIGHT_ZONES.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>盆器材质</label>
                    <select
                      value={formPot}
                      onChange={(e) => setFormPot(e.target.value as PotMaterial)}
                      style={selectStyle}
                    >
                      <option value="">请选择</option>
                      {POT_MATERIALS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>土壤湿度偏好</label>
                    <select
                      value={formMoisture}
                      onChange={(e) => setFormMoisture(e.target.value as MoisturePreference)}
                      style={selectStyle}
                    >
                      <option value="">请选择</option>
                      {MOISTURE_PREFERENCES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  {formSpecies && formLocation && formMoisture && (
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <div
                        style={{
                          background: '#E8F5E9',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 13,
                          color: '#2E7D32',
                          fontWeight: 600,
                        }}
                      >
                        💧 建议浇水频率：每
                        {generateWateringFrequency(
                          formSpecies,
                          formLocation,
                          formMoisture
                        )}
                        天
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreatePlant}
                  style={{
                    marginTop: 16,
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#4CAF50',
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer',
                    fontWeight: 600,
                    width: '100%',
                    transition: 'background 0.2s',
                  }}
                >
                  创建档案
                </button>
              </div>
            )}

            {plants.length === 0 && !showForm && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  color: '#AAA',
                  fontSize: 14,
                }}
              >
                还没有植物档案，点击"添加植物"开始吧 🌱
              </div>
            )}

            <div
              className="responsive-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
              }}
            >
              {plants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} onDelete={handleDeletePlant} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="animate-fade">
            <h2 style={{ fontSize: 18, color: '#2E3B2E', marginBottom: 16 }}>本周养护任务</h2>
            {plants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#AAA', fontSize: 14 }}>
                请先添加植物档案 🌿
              </div>
            ) : (
              <TaskBoard tasks={tasksWithCompletion} onToggleTask={handleToggleTask} />
            )}
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="animate-fade">
            <h2 style={{ fontSize: 18, color: '#2E3B2E', marginBottom: 16 }}>生长记录</h2>

            <div
              className="animate-elastic"
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 20,
                boxShadow: '1px 1px 4px #E0E0E0',
                marginBottom: 20,
                transformOrigin: 'top',
              }}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 150px', minWidth: 150 }}>
                  <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>选择植物</label>
                  <select
                    value={selectedPlantId}
                    onChange={(e) => setSelectedPlantId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">请选择</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '2 1 200px', minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>生长状态</label>
                  <input
                    value={growthNote}
                    onChange={(e) => setGrowthNote(e.target.value)}
                    placeholder="如：新叶展开2片"
                    style={{ ...selectStyle, width: '100%' }}
                  />
                </div>
                <div style={{ flex: '0 0 auto' }}>
                  <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>照片</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #E0E0E0',
                      background: '#fff',
                      fontSize: 13,
                      cursor: 'pointer',
                      color: '#555',
                    }}
                  >
                    📷 {growthPhoto ? '已选择' : '上传照片'}
                  </button>
                </div>
                <button
                  onClick={handleAddGrowthRecord}
                  disabled={!selectedPlantId || !growthNote.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedPlantId && growthNote.trim() ? '#4CAF50' : '#CCC',
                    color: '#fff',
                    fontSize: 13,
                    cursor: selectedPlantId && growthNote.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  添加记录
                </button>
              </div>

              {growthPhoto && (
                <div style={{ marginTop: 12, display: 'inline-block' }}>
                  <img
                    src={growthPhoto}
                    alt="preview"
                    style={{
                      maxHeight: 80,
                      borderRadius: 8,
                      border: '1px solid #E0E0E0',
                    }}
                  />
                </div>
              )}

              {showCropper && rawPhoto && (
                <div
                  className="animate-elastic"
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) cancelCrop();
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: 20,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    <h4 style={{ fontSize: 15, marginBottom: 12, color: '#333' }}>
                      裁剪照片
                    </h4>
                    <div
                      ref={cropperRef}
                      style={{
                        position: 'relative',
                        width: 120,
                        height: 120,
                        border: '1px solid #E0E0E0',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={rawPhoto}
                        alt="crop"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        onMouseDown={handleCropMouseDown}
                        style={{
                          position: 'absolute',
                          left: cropArea.x,
                          top: cropArea.y,
                          width: cropArea.w,
                          height: cropArea.h,
                          border: '2px dashed #4CAF50',
                          background: 'rgba(76,175,80,0.15)',
                          cursor: 'move',
                          borderRadius: 4,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          pointerEvents: 'none',
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 8, marginBottom: 12 }}>
                      拖动选框调整裁剪区域
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={cancelCrop}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: '1px solid #E0E0E0',
                          background: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: '#666',
                        }}
                      >
                        取消
                      </button>
                      <button
                        onClick={applyCrop}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#4CAF50',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      >
                        确认裁剪
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {growthRecords.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#AAA', fontSize: 14 }}>
                暂无生长记录，完成养护后添加一条吧 📸
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {growthRecords.map((record) => {
                const plant = plants.find((p) => p.id === record.plantId);
                if (!plant) return null;
                const color = getSpeciesColor(plant.species);
                return (
                  <div
                    key={record.id}
                    className="animate-fade animate-elastic"
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      boxShadow: '1px 1px 4px #E0E0E0',
                      overflow: 'hidden',
                      transformOrigin: 'top',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, padding: 16 }}>
                      {record.photo && (
                        <img
                          src={record.photo}
                          alt="growth"
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: `2px solid ${color}`,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#2E3B2E' }}>
                            {plant.name}
                          </span>
                          <span style={{ fontSize: 11, color: '#AAA' }}>
                            {new Date(record.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{record.note}</div>
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>
                            光照强度：{record.lightLevel} Lux
                          </div>
                          <div
                            style={{
                              height: 6,
                              background: '#EEE',
                              borderRadius: 3,
                              overflow: 'hidden',
                              maxWidth: 200,
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(100, (record.lightLevel / 800) * 100)}%`,
                                background: color,
                                borderRadius: 3,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="animate-fade">
            <h2 style={{ fontSize: 18, color: '#2E3B2E', marginBottom: 16 }}>统计看板</h2>

            {plants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#AAA', fontSize: 14 }}>
                请先添加植物档案 📊
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  {plantStats.map((ps) => {
                    const plant = plants.find((p) => p.id === ps.plantId);
                    const color = plant ? getSpeciesColor(plant.species) : '#4CAF50';
                    return (
                      <div
                        key={ps.plantId}
                        className="animate-elastic"
                        style={{
                          background: '#fff',
                          borderRadius: 12,
                          padding: 16,
                          boxShadow: '1px 1px 4px #E0E0E0',
                          borderLeft: `4px solid ${color}`,
                          transformOrigin: 'top',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#2E3B2E', marginBottom: 8 }}>
                          {ps.plantName}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: color }}>
                              {ps.totalWatering}
                            </div>
                            <div style={{ color: '#999' }}>浇水</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: color }}>
                              {ps.totalFertilizing}
                            </div>
                            <div style={{ color: '#999' }}>施肥</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: color }}>
                              {ps.ageDays}
                            </div>
                            <div style={{ color: '#999' }}>天</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="animate-elastic"
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '1px 1px 4px #E0E0E0',
                    transformOrigin: 'top',
                  }}
                >
                  <h3 style={{ fontSize: 15, color: '#2E3B2E', marginBottom: 16 }}>
                    月度养护趋势（12个月）
                  </h3>
                  <TrendChart stats={monthlyStats} themeColor="#4CAF50" />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
