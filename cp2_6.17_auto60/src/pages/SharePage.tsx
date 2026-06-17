import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Timeline } from '../components/Timeline';
import { LineChart } from '../components/LineChart';
import { getShareProfile, addVetAdvice, HealthRecord, Pet } from '../utils/api';
import dayjs from 'dayjs';

export const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [vetAdvice, setVetAdvice] = useState<string>('');
  const [newAdvice, setNewAdvice] = useState('');
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adviceSubmitted, setAdviceSubmitted] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (token) {
      loadShareData();
    }
  }, [token]);

  const loadShareData = async () => {
    try {
      const data = await getShareProfile(token!);
      setPet(data.pet);
      setRecords(data.records);
      setVetAdvice(data.vetAdvice || '');
      setExpiresAt(data.expiresAt);
    } catch (error: any) {
      if (error.message.includes('403') || error.message.includes('expired')) {
        setExpired(true);
      }
      console.error('Failed to load share data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvice.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const result = await addVetAdvice(token!, newAdvice.trim());
      setVetAdvice(result.advice);
      setNewAdvice('');
      setAdviceSubmitted(true);
    } catch (error) {
      console.error('Failed to submit advice:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666',
        backgroundColor: '#fafafa'
      }}>
        加载中...
      </div>
    );
  }

  if (expired || !pet) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666',
        backgroundColor: '#fafafa',
        fontFamily: 'Roboto, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <p style={{ fontSize: '18px', color: '#333', margin: '0 0 8px 0' }}>
          链接已失效
        </p>
        <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
          该分享链接已过期或不存在
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '900px', 
      margin: '0 auto',
      backgroundColor: '#fafafa',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f57c00'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#4e342e', 
          margin: '0 0 8px 0', 
          fontFamily: 'Roboto, sans-serif' 
        }}>
          {pet.name}的健康档案
        </h1>
        <p style={{ fontSize: '14px', color: '#8d6e63', margin: 0, fontFamily: 'Roboto, sans-serif' }}>
          {pet.breed} · 出生于 {pet.birthDate}
        </p>
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
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4e342e', margin: '0 0 20px 0', fontFamily: 'Roboto, sans-serif' }}>
          健康记录
        </h2>
        <Timeline records={records} />
      </div>

      {vetAdvice && (
        <div 
          style={{
            backgroundColor: '#e3f2fd',
            borderLeft: '4px solid #1976d2',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#1565c0', 
            marginBottom: '8px',
            fontFamily: 'Roboto, sans-serif'
          }}>
            👨‍⚕️ 医生建议
          </div>
          <p style={{ 
            fontSize: '14px', 
            color: '#333', 
            margin: 0, 
            lineHeight: 1.6,
            fontFamily: 'Roboto, sans-serif' 
          }}>
            {vetAdvice}
          </p>
        </div>
      )}

      {!vetAdvice && (
        <div 
          style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4e342e', margin: '0 0 16px 0', fontFamily: 'Roboto, sans-serif' }}>
            添加医生建议
          </h2>
          
          {adviceSubmitted ? (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#e8f5e9', 
              borderRadius: '8px',
              textAlign: 'center',
              color: '#2e7d32',
              fontSize: '14px',
              fontFamily: 'Roboto, sans-serif'
            }}>
              ✓ 建议已提交
            </div>
          ) : (
            <form onSubmit={handleSubmitAdvice}>
              <textarea
                value={newAdvice}
                onChange={(e) => setNewAdvice(e.target.value)}
                placeholder="请输入您的专业建议（最多200字）"
                maxLength={200}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'Roboto, sans-serif',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1976d2';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '12px'
              }}>
                <span style={{ fontSize: '12px', color: '#999', fontFamily: 'Roboto, sans-serif' }}>
                  {newAdvice.length}/200
                </span>
                <button
                  type="submit"
                  disabled={!newAdvice.trim() || submitting}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: newAdvice.trim() && !submitting ? '#1976d2' : '#bdbdbd',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: newAdvice.trim() && !submitting ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    if (newAdvice.trim() && !submitting) {
                      e.currentTarget.style.backgroundColor = '#1565c0';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = newAdvice.trim() && !submitting ? '#1976d2' : '#bdbdbd';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {submitting ? '提交中...' : '提交建议'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px', 
        fontSize: '12px', 
        color: '#aaa',
        fontFamily: 'Roboto, sans-serif'
      }}>
        该分享链接有效期至 {dayjs(expiresAt).format('YYYY年MM月DD日 HH:mm')}
      </div>
    </div>
  );
};
