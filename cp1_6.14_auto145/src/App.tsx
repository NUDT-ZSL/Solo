import { useState, useEffect, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
} from 'react-router-dom';
import './styles.css';
import { Pet, Record, RecordType, TrendMetric, TimeRange } from './types';
import { PetService } from './PetService';
import { RecordService } from './RecordService';
import PetCard from './components/PetCard';
import RecordTimeline from './components/RecordTimeline';
import TrendChart from './components/TrendChart';

const defaultAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="%23d4a373"/><text x="32" y="40" font-size="24" text-anchor="middle" fill="white" font-family="sans-serif">🐾</text></svg>'
);

function App() {
  return (
    <Router>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pet/:id/records" element={<PetRecordsPage />} />
          <Route path="/pet/:id/trend" element={<PetTrendPage />} />
        </Routes>
      </div>
    </Router>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [showPetModal, setShowPetModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  useEffect(() => {
    setPets(PetService.getAllPets());
    const unsubscribe = PetService.subscribe((newPets) => {
      setPets(newPets as Pet[]);
    });
    return unsubscribe;
  }, []);

  const handleAddPet = () => {
    setEditingPet(null);
    setShowPetModal(true);
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setShowPetModal(true);
  };

  const handleDeletePet = (id: string) => {
    if (confirm('确定要删除这只宠物吗？相关记录也会被删除。')) {
      PetService.deletePet(id);
    }
  };

  const handleSavePet = async (petData: Omit<Pet, 'id' | 'createdAt'>) => {
    if (editingPet) {
      await PetService.updatePet(editingPet.id, petData);
    } else {
      await PetService.createPet(petData);
    }
    setShowPetModal(false);
    setEditingPet(null);
  };

  return (
    <>
      <Navbar title="宠物健康档案" showAddButton onAddClick={handleAddPet} addLabel="添加宠物" />
      <div className="app-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">我的宠物</h1>
            <p className="page-subtitle">记录每一刻，守护毛孩子的健康</p>
          </div>
        </div>

        {pets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="empty-state-text">还没有添加宠物</div>
            <button className="btn btn-primary" onClick={handleAddPet}>
              添加第一只宠物
            </button>
          </div>
        ) : (
          <div className="pet-grid">
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={handleEditPet}
                onDelete={handleDeletePet}
              />
            ))}
          </div>
        )}
      </div>

      {showPetModal && (
        <PetModal
          pet={editingPet}
          onSave={handleSavePet}
          onClose={() => {
            setShowPetModal(false);
            setEditingPet(null);
          }}
        />
      )}
    </>
  );
}

function PetRecordsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | undefined>();
  const [records, setRecords] = useState<Record[]>([]);
  const [showRecordModal, setShowRecordModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setPet(PetService.getPet(id));
    setRecords(RecordService.getRecordsByPetId(id));
    const unsubscribe = RecordService.subscribe(() => {
      setRecords(RecordService.getRecordsByPetId(id));
    });
    return unsubscribe;
  }, [id]);

  const handleAddRecord = () => {
    setShowRecordModal(true);
  };

  const handleSaveRecord = async (recordData: Omit<Record, 'id'>) => {
    await RecordService.addRecord(recordData);
    setShowRecordModal(false);
  };

  const handleGoTrend = () => {
    navigate(`/pet/${id}/trend`);
  };

  return (
    <>
      <Navbar
        pet={pet}
        showBack
        onBack={() => navigate('/')}
        showAddButton
        onAddClick={handleAddRecord}
        addLabel="添加记录"
        rightExtra={
          <button className="btn btn-secondary btn-small" onClick={handleGoTrend}>
            健康趋势
          </button>
        }
      />
      <div className="app-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">护理记录</h1>
            <p className="page-subtitle">{pet?.name} 的日常护理日志</p>
          </div>
        </div>

        <RecordTimeline records={records} />
      </div>

      {showRecordModal && id && (
        <RecordModal
          petId={id}
          onSave={handleSaveRecord}
          onClose={() => setShowRecordModal(false)}
        />
      )}
    </>
  );
}

function PetTrendPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | undefined>();
  const [metric, setMetric] = useState<TrendMetric>('weight');
  const [range, setRange] = useState<TimeRange>(30);

  useEffect(() => {
    if (!id) return;
    setPet(PetService.getPet(id));
  }, [id]);

  const trendData = useMemo(() => {
    if (!id) return { data: [], stats: { average: 0, max: 0, min: 0, total: 0 } };
    return RecordService.getTrendData(id, metric, range);
  }, [id, metric, range]);

  return (
    <>
      <Navbar
        pet={pet}
        showBack
        onBack={() => navigate(`/pet/${id}/records`)}
      />
      <div className="app-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">健康趋势</h1>
            <p className="page-subtitle">{pet?.name} 的健康数据变化</p>
          </div>
        </div>

        <TrendChart
          data={trendData.data}
          stats={trendData.stats}
          metric={metric}
          range={range}
          onMetricChange={setMetric}
          onRangeChange={setRange}
        />
      </div>
    </>
  );
}

interface NavbarProps {
  title?: string;
  pet?: Pet;
  showBack?: boolean;
  onBack?: () => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  rightExtra?: React.ReactNode;
}

function Navbar({ title, pet, showBack, onBack, showAddButton, onAddClick, addLabel, rightExtra }: NavbarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left" onClick={showBack ? handleBack : undefined}>
          {showBack && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ cursor: 'pointer' }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
          {pet ? (
            <>
              <img className="navbar-avatar" src={pet.avatar || defaultAvatar} alt={pet.name} />
              <div>
                <div className="navbar-title">{pet.name}</div>
              </div>
            </>
          ) : (
            <div className="navbar-title">{title || '宠物健康档案'}</div>
          )}
        </div>
        <div className="navbar-right">
          {rightExtra}
          {showAddButton && (
            <button className="btn btn-secondary btn-small" onClick={onAddClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {addLabel || '添加'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

interface PetModalProps {
  pet: Pet | null;
  onSave: (pet: Omit<Pet, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

function PetModal({ pet, onSave, onClose }: PetModalProps) {
  const [name, setName] = useState(pet?.name || '');
  const [breed, setBreed] = useState(pet?.breed || '');
  const [birthday, setBirthday] = useState(pet?.birthday || '');
  const [weight, setWeight] = useState(pet?.weight?.toString() || '');
  const [avatar, setAvatar] = useState(pet?.avatar || '');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('请输入宠物名字');
      return;
    }
    onSave({
      name: name.trim(),
      breed: breed.trim(),
      birthday,
      weight: parseFloat(weight) || 0,
      avatar: avatar || defaultAvatar,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{pet ? '编辑宠物' : '添加宠物'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">头像</label>
            <div className="avatar-upload">
              {avatar ? (
                <img className="avatar-preview" src={avatar} alt="头像" />
              ) : (
                <div className="avatar-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
              )}
              <label className="avatar-upload-btn">
                选择图片
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">名字 *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入宠物名字"
              maxLength={20}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">品种</label>
              <input
                type="text"
                className="form-input"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="如：金毛、布偶"
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label">生日</label>
              <input
                type="date"
                className="form-input"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="form-input"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="请输入体重"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RecordModalProps {
  petId: string;
  onSave: (record: Omit<Record, 'id'>) => void;
  onClose: () => void;
}

function RecordModal({ petId, onSave, onClose }: RecordModalProps) {
  const [type, setType] = useState<RecordType>('feeding');
  const [note, setNote] = useState('');
  const [value, setValue] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const recordTypes: { value: RecordType; label: string }[] = [
    { value: 'feeding', label: '喂食' },
    { value: 'walk', label: '遛弯' },
    { value: 'medication', label: '用药' },
    { value: 'bath', label: '洗澡' },
    { value: 'weight', label: '体重' },
  ];

  const valuePlaceholder = () => {
    switch (type) {
      case 'weight':
        return '体重 (kg)';
      case 'walk':
        return '时长 (分钟)';
      case 'feeding':
        return '喂食量 (g)';
      default:
        return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date(dateTime).getTime();
    const recordData: Omit<Record, 'id'> = {
      petId,
      type,
      note: note.slice(0, 50),
      timestamp,
    };
    if (value) {
      recordData.value = parseFloat(value) || 0;
    }
    onSave(recordData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">添加记录</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">类型</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as RecordType)}
              >
                {recordTypes.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">时间</label>
              <input
                type="datetime-local"
                className="form-input"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
          </div>

          {(type === 'weight' || type === 'walk' || type === 'feeding') && (
            <div className="form-group">
              <label className="form-label">{valuePlaceholder()}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="form-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={valuePlaceholder()}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 50))}
              placeholder="记录一些细节..."
              maxLength={50}
            />
            <div className="form-hint">{note.length}/50</div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
