import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Share2, Stethoscope } from 'lucide-react';
import { Timeline } from '../components/Timeline';
import { LineChart } from '../components/LineChart';
import { getHealthRecords, Pet, HealthRecord, shareProfile } from '../utils/api';
import { generatePDF, downloadPDF } from '../utils/pdfGenerator';
import dayjs from 'dayjs';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [shareResult, setShareResult] = useState<{ shareUrl: string; expiresAt: string } | null>(null);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [recordType, setRecordType] = useState<'vaccine' | 'deworm' | 'weight'>('weight');
  const [recordDate, setRecordDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [recordDesc, setRecordDesc] = useState('');
  const [recordWeight, setRecordWeight] = useState('');
  const [recordTemp, setRecordTemp] = useState('');
  const [recordVaccine, setRecordVaccine] = useState('');
  const [recordDeworm, setRecordDeworm] = useState('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [petsData, recordsData] = await Promise.all([
        fetch('/api/pets').then(res => res.json()),
        getHealthRecords(id!)
      ]);
      const foundPet = petsData.find((p: Pet) => p.id === id);
      setPet(foundPet || null);
      setRecords(recordsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!pet) return;
    setGeneratingPDF(true);
    try {
      const blob = await generatePDF(pet, records);
      const fileName = `${pet.name}_体检报告_${dayjs().format('YYYYMMDD')}.pdf`;
      downloadPDF(blob, fileName);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    if (!pet || !hospitalEmail) return;
    try {
      const result = await shareProfile(pet.id, hospitalEmail);
      setShareResult(result);
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet) return;
    
    try {
      const recordData: any = {
        petId: pet.id,
        type: recordType,
        date: recordDate,
        description: recordDesc
      };

      if (recordType === 'weight') {
        if (recordWeight) recordData.weight = parseFloat(recordWeight);
        if (recordTemp) recordData.temperature = parseFloat(recordTemp);
      } else if (recordType === 'vaccine') {
        recordData.vaccineName = recordVaccine || recordDesc;
      } else if (recordType === 'deworm') {
        recordData.dewormType = recordDeworm || recordDesc;
      }

      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      
      if (response.ok) {
        setShowAddRecordModal(false);
        setRecordDesc('');
        setRecordWeight('');
        setRecordTemp('');
        setRecordVaccine('');
        setRecordDeworm('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to add record:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '400px',
        fontSize: '16px',
        color: '#666'
      }}>
        加载中...
      </div>
    );
  }

  if (!pet) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '400px',
        fontSize: '16px',
        color: '#666'
      }}>
        未找到宠物信息
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
          }}
        >
          <ArrowLeft size={20} color="#666" />
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#4e342e', margin: 0, fontFamily: 'Roboto, sans-serif' }}>
          {pet.name}的健康档案
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={handleGeneratePDF}
          disabled={generatingPDF}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#f57c00',
            color: '#fff',
            fontSize: '14px',
            cursor: generatingPDF ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            opacity: generatingPDF ? 0.7 : 1,
            fontFamily: 'Roboto, sans-serif'
          }}
          onMouseEnter={(e) => {
            if (!generatingPDF) {
              e.currentTarget.style.backgroundColor = '#e65100';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(245, 124, 0, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f57c00';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <FileText size={18} />
          {generatingPDF ? '生成中...' : '生成报告'}
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            color: '#666',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Roboto, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#f57c00';
            e.currentTarget.style.color = '#f57c00';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.color = '#666';
          }}
        >
          <Share2 size={18} />
          分享给医院
        </button>

        <button
          onClick={() => setShowAddRecordModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            color: '#666',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Roboto, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#43a047';
            e.currentTarget.style.color = '#43a047';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.color = '#666';
          }}
        >
          <Stethoscope size={18} />
          添加记录
        </button>
      </div>

      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4e342e', margin: '0 0 16px 0', fontFamily: 'Roboto, sans-serif' }}>
          宠物信息
        </h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '3px solid #ffb74d',
              overflow: 'hidden',
              backgroundColor: '#f5f5f5'
            }}
          >
            {pet.avatar ? (
              <img src={pet.avatar} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🐾
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0', fontFamily: 'Roboto, sans-serif' }}>
              <strong>品种：</strong>{pet.breed}
            </p>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0', fontFamily: 'Roboto, sans-serif' }}>
              <strong>出生日期：</strong>{pet.birthDate}
            </p>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0', fontFamily: 'Roboto, sans-serif' }}>
              <strong>健康记录：</strong>{records.length}条
            </p>
          </div>
        </div>
      </div>

      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4e342e', margin: '0 0 16px 0', fontFamily: 'Roboto, sans-serif' }}>
          健康趋势（近30天）
        </h2>
        <LineChart records={records} />
      </div>

      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4e342e', margin: '0 0 20px 0', fontFamily: 'Roboto, sans-serif' }}>
          健康记录时间轴
        </h2>
        <Timeline records={records} />
      </div>

      {showShareModal && (
        <div
          onClick={() => { setShowShareModal(false); setShareResult(null); setHospitalEmail(''); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              width: '420px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h2 
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#4e342e',
                margin: '0 0 16px 0',
                fontFamily: 'Roboto, sans-serif'
              }}
            >
              分享给宠物医院
            </h2>

            {!shareResult ? (
              <>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0', fontFamily: 'Roboto, sans-serif' }}>
                  输入医院邮箱，系统将生成一个有效期7天的档案查看链接。
                </p>
                <div style={{ marginBottom: '20px' }}>
                  <label 
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '6px',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                  >
                    医院邮箱
                  </label>
                  <input
                    type="email"
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                    placeholder="请输入医院邮箱"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      fontFamily: 'Roboto, sans-serif',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#f57c00';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowShareModal(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      backgroundColor: '#fff',
                      color: '#666',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!hospitalEmail}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: hospitalEmail ? '#f57c00' : '#ccc',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: hospitalEmail ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      if (hospitalEmail) {
                        e.currentTarget.style.backgroundColor = '#e65100';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 124, 0, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = hospitalEmail ? '#f57c00' : '#ccc';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    生成链接
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px 0', fontFamily: 'Roboto, sans-serif' }}>
                  分享链接已生成（有效期至：{dayjs(shareResult.expiresAt).format('YYYY年MM月DD日')}）
                </p>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    wordBreak: 'break-all'
                  }}
                >
                  <a
                    href={shareResult.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#1976d2',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                  >
                    {window.location.origin}{shareResult.shareUrl}
                  </a>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => { setShowShareModal(false); setShareResult(null); setHospitalEmail(''); }}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#f57c00',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e65100';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 124, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f57c00';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    完成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddRecordModal && (
        <div
          onClick={() => setShowAddRecordModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              width: '420px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <h2 
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#4e342e',
                margin: '0 0 20px 0',
                fontFamily: 'Roboto, sans-serif'
              }}
            >
              添加健康记录
            </h2>

            <form onSubmit={handleAddRecord}>
              <div style={{ marginBottom: '16px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '8px',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  记录类型
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { value: 'weight', label: '体重体温' },
                    { value: 'vaccine', label: '疫苗接种' },
                    { value: 'deworm', label: '驱虫' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRecordType(option.value as any)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: `2px solid ${recordType === option.value ? '#f57c00' : '#ddd'}`,
                        backgroundColor: recordType === option.value ? '#fff3e0' : '#fff',
                        color: recordType === option.value ? '#f57c00' : '#666',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'Roboto, sans-serif'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '6px',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  日期
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'Roboto, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f57c00';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '6px',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  描述
                </label>
                <input
                  type="text"
                  value={recordDesc}
                  onChange={(e) => setRecordDesc(e.target.value)}
                  required
                  placeholder="请输入记录描述"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'Roboto, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f57c00';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                />
              </div>

              {recordType === 'weight' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label 
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '6px',
                        fontFamily: 'Roboto, sans-serif'
                      }}
                    >
                      体重 (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={recordWeight}
                      onChange={(e) => setRecordWeight(e.target.value)}
                      placeholder="请输入体重"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                        fontFamily: 'Roboto, sans-serif',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f57c00';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label 
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '6px',
                        fontFamily: 'Roboto, sans-serif'
                      }}
                    >
                      体温 (℃)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={recordTemp}
                      onChange={(e) => setRecordTemp(e.target.value)}
                      placeholder="请输入体温"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                        fontFamily: 'Roboto, sans-serif',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f57c00';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    />
                  </div>
                </>
              )}

              {recordType === 'vaccine' && (
                <div style={{ marginBottom: '16px' }}>
                  <label 
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '6px',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                  >
                    疫苗名称
                  </label>
                  <input
                    type="text"
                    value={recordVaccine}
                    onChange={(e) => setRecordVaccine(e.target.value)}
                    placeholder="请输入疫苗名称"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      fontFamily: 'Roboto, sans-serif',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#f57c00';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  />
                </div>
              )}

              {recordType === 'deworm' && (
                <div style={{ marginBottom: '16px' }}>
                  <label 
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '6px',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                  >
                    驱虫类型
                  </label>
                  <input
                    type="text"
                    value={recordDeworm}
                    onChange={(e) => setRecordDeworm(e.target.value)}
                    placeholder="如：体内驱虫、体外驱虫"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      fontFamily: 'Roboto, sans-serif',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#f57c00';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    color: '#666',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#f57c00',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e65100';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 124, 0, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f57c00';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
