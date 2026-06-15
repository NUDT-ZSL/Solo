import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sun,
  Droplets,
  Thermometer,
  Soil,
  Calendar,
  Image as ImageIcon,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  MapPin,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import CareCalendar from '../components/CareCalendar';
import ImageModal from '../components/ImageModal';
import type { Plant, CareEvent, GrowthRecord } from '../types';
import { api } from '../utils/api';

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [recordNote, setRecordNote] = useState('');
  const [recordImage, setRecordImage] = useState<File | null>(null);
  const [recordImagePreview, setRecordImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [locations] = useState(['阳台', '客厅', '浴室', '卧室', '厨房', '书房']);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [plantRes, eventsRes, recordsRes] = await Promise.all([
        api.plants.getById(id),
        api.events.getByPlant(id),
        api.records.getByPlant(id),
      ]);

      if (plantRes.success && plantRes.plant) {
        setPlant(plantRes.plant);
        setNewLocation(plantRes.plant.location || '客厅');
      }
      if (eventsRes.success && eventsRes.events) {
        setEvents(eventsRes.events);
      }
      if (recordsRes.success && recordsRes.records) {
        setRecords(recordsRes.records);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlant = async () => {
    if (!id || !confirm('确定要删除这株植物吗？相关的日志和记录也会被删除。')) return;

    try {
      await api.plants.delete(id);
      navigate('/garden');
    } catch (error) {
      console.error('Delete plant error:', error);
    }
  };

  const handleAddRecord = async () => {
    if (!id || !recordDate) return;

    setIsSubmitting(true);
    try {
      await api.records.create(id, {
        date: recordDate,
        note: recordNote,
        image: recordImage || undefined,
      });
      setShowAddRecord(false);
      setRecordNote('');
      setRecordImage(null);
      setRecordImagePreview(null);
      loadData();
    } catch (error) {
      console.error('Add record error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除这条生长记录吗？')) return;

    try {
      await api.records.delete(recordId);
      loadData();
    } catch (error) {
      console.error('Delete record error:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setRecordImage(files[0]);
      const reader = new FileReader();
      reader.onload = (e) => {
        setRecordImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleSaveLocation = async () => {
    if (!plant || !id) return;

    try {
      await api.plants.update(id, {
        ...plant,
        location: newLocation,
      });
      setPlant({ ...plant, location: newLocation });
      setIsEditingLocation(false);
    } catch (error) {
      console.error('Update location error:', error);
    }
  };

  if (isLoading) {
    return (
      <div
        className="page-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Loader2
          size={40}
          className="animate-spin"
          style={{ color: 'var(--color-secondary)' }}
        />
      </div>
    );
  }

  if (!plant) {
    return (
      <div
        className="page-container"
        style={{ textAlign: 'center', padding: '80px' }}
      >
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          植物不存在或已被删除
        </p>
        <button
          className="ripple-button"
          onClick={() => navigate('/garden')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          返回我的植物库
        </button>
      </div>
    );
  }

  const careInfoItems = [
    { icon: Sun, label: '光照', value: plant.light },
    { icon: Droplets, label: '浇水', value: plant.water },
    { icon: Thermometer, label: '温度', value: plant.temperature },
    { icon: Soil, label: '土壤', value: plant.soil },
  ];

  return (
    <div className="page-container">
      <button
        className="ripple-button"
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          transition: 'background-color var(--transition-fast)',
        }}
      >
        <ArrowLeft size={18} />
        返回
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '400px 1fr',
          gap: '32px',
          marginBottom: '32px',
        }}
      >
        <div>
          <img
            src={plant.image}
            alt={plant.name}
            className="plant-detail-image"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedImage(plant.image)}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  marginBottom: '4px',
                }}
              >
                {plant.name}
              </h1>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontStyle: 'italic',
                  marginBottom: '8px',
                }}
              >
                {plant.scientificName}
              </p>
              {isEditingLocation ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '14px',
                    }}
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveLocation}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-secondary)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={16} />
                    保存
                  </button>
                  <button
                    onClick={() => setIsEditingLocation(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <X size={16} />
                    取消
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px',
                  }}
                >
                  <MapPin size={16} />
                  摆放位置：{plant.location}
                  <button
                    onClick={() => setIsEditingLocation(true)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '12px',
                    }}
                  >
                    <Edit3 size={12} />
                    修改
                  </button>
                </div>
              )}
            </div>
            <button
              className="ripple-button"
              onClick={handleDeletePlant}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#ef5350',
                color: '#ffffff',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={16} />
              删除植物
            </button>
          </div>

          <p
            style={{
              color: 'var(--color-text-primary)',
              lineHeight: 1.8,
              marginBottom: '24px',
            }}
          >
            {plant.description}
          </p>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            养护要点
          </h2>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px',
            }}
          >
            {careInfoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div className="care-info-block">
                    <Icon size={20} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                      {item.label}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      marginTop: '8px',
                      color: 'var(--color-text-secondary)',
                      maxWidth: '80px',
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Calendar size={20} style={{ color: 'var(--color-secondary)' }} />
            养护日志
          </h2>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <CareCalendar
              plantId={id!}
              events={events}
              onUpdate={loadData}
            />
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ImageIcon size={20} style={{ color: 'var(--color-secondary)' }} />
            生长记录
          </h2>
          <button
            className="ripple-button"
            onClick={() => setShowAddRecord(!showAddRecord)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            添加记录
          </button>
        </div>

        {showAddRecord && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '24px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                日期
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                照片
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ marginBottom: '8px' }}
              />
              {recordImagePreview && (
                <img
                  src={recordImagePreview}
                  alt="预览"
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                备注
              </label>
              <textarea
                value={recordNote}
                onChange={(e) => setRecordNote(e.target.value)}
                placeholder="记录植物的生长变化..."
                className="record-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="ripple-button"
                onClick={handleAddRecord}
                disabled={isSubmitting || !recordDate}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  fontSize: '14px',
                  opacity: isSubmitting || !recordDate ? 0.6 : 1,
                }}
              >
                {isSubmitting ? '保存中...' : '保存记录'}
              </button>
              <button
                onClick={() => {
                  setShowAddRecord(false);
                  setRecordNote('');
                  setRecordImage(null);
                  setRecordImagePreview(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ImageIcon size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>暂无生长记录</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              点击上方按钮添加第一条生长记录
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {records.map((record) => (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {record.image ? (
                  <img
                    src={record.image}
                    alt={`${plant.name} - ${record.date}`}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedImage(record.image)}
                  />
                ) : (
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon
                      size={24}
                      style={{ color: 'var(--color-text-secondary)' }}
                    />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    {record.date}
                  </p>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {record.note || '无备注'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteRecord(record.id)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef5350',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 83, 80, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt={plant.name}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}
