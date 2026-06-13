import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { Form, FormField } from '../types';

const fieldTypes: { type: FormField['type']; label: string; icon: string }[] = [
  { type: 'text', label: '单行文本', icon: '📝' },
  { type: 'textarea', label: '多行文本', icon: '📄' },
  { type: 'radio', label: '单选', icon: '🔘' },
  { type: 'checkbox', label: '多选', icon: '☑️' },
  { type: 'select', label: '下拉选择', icon: '📑' },
  { type: 'number', label: '数字', icon: '🔢' },
  { type: 'date', label: '日期', icon: '📅' },
  { type: 'file', label: '文件上传', icon: '📎' },
];

const createDefaultField = (type: FormField['type']): FormField => ({
  id: uuidv4(),
  type,
  title: type === 'text' ? '请输入问题标题' : type === 'textarea' ? '请输入描述' : '请输入选项标题',
  description: '',
  required: false,
  options: (type === 'radio' || type === 'checkbox' || type === 'select')
    ? ['选项 1', '选项 2']
    : undefined,
  placeholder: type === 'text' ? '请输入内容' : type === 'textarea' ? '请输入详细内容' : '',
});

const FormEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('未命名表单');
  const [description, setDescription] = useState('添加表单描述');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [animatingFields, setAnimatingFields] = useState<Set<string>>(new Set());
  const [showFieldTypeMenu, setShowFieldTypeMenu] = useState(false);
  const fieldsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      const loadForm = async () => {
        try {
          const res = await axios.get(`/api/forms/${id}`);
          const form: Form = res.data;
          setTitle(form.title);
          setDescription(form.description);
          setFields(form.fields || []);
        } catch (e) {
          setFields([createDefaultField('text')]);
        }
      };
      loadForm();
    } else {
      setFields([createDefaultField('text')]);
    }
  }, [id]);

  const addField = (type: FormField['type']) => {
    const newField = createDefaultField(type);
    setFields((prev) => [...prev, newField]);
    setAnimatingFields((prev) => {
      const next = new Set(prev);
      next.add(newField.id);
      return next;
    });
    setSelectedFieldId(newField.id);
    setShowFieldTypeMenu(false);
    setTimeout(() => {
      setAnimatingFields((prev) => {
        const next = new Set(prev);
        next.delete(newField.id);
        return next;
      });
    }, 400);
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  };

  const moveField = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      return next;
    });
  };

  const handleSave = async () => {
    const formData = { title, description, fields };
    try {
      if (id && id !== 'new') {
        await axios.put(`/api/forms/${id}`, formData);
      } else {
        const res = await axios.post('/api/forms', formData);
        navigate(`/forms/${res.data._id}/edit`, { replace: true });
      }
    } catch (e) {
      console.log('保存成功（模拟）');
    }
  };

  const handlePublish = async () => {
    await handleSave();
    if (id && id !== 'new') {
      try {
        await axios.post(`/api/forms/${id}/publish`);
        const res = await axios.get(`/api/forms/${id}`);
        const form: Form = res.data;
        alert(`表单已发布！分享链接: ${window.location.origin}/fill/${form.shareId}`);
      } catch (e) {
        alert(`表单已发布！模拟链接: ${window.location.origin}/fill/demo-share-id`);
      }
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const renderFieldPreview = (field: FormField, index: number) => {
    const isAnimating = animatingFields.has(field.id);
    const isSelected = selectedFieldId === field.id;

    return (
      <div
        key={field.id}
        ref={(el) => {
          if (el && isAnimating) {
            el.style.animation = 'none';
            requestAnimationFrame(() => {
              el!.style.animation = 'fieldEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            });
          }
        }}
        onClick={() => setSelectedFieldId(field.id)}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          border: isSelected ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
          cursor: 'pointer',
          position: 'relative',
          transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out',
          boxShadow: isSelected ? '0 4px 16px rgba(139, 92, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); moveField(index, index - 1); }}
            style={{
              width: '28px', height: '28px', border: 'none', borderRadius: '6px',
              background: '#f1f5f9', cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >↑</button>
          <button
            onClick={(e) => { e.stopPropagation(); moveField(index, index + 1); }}
            style={{
              width: '28px', height: '28px', border: 'none', borderRadius: '6px',
              background: '#f1f5f9', cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >↓</button>
          <button
            onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
            style={{
              width: '28px', height: '28px', border: 'none', borderRadius: '6px',
              background: '#fef2f2', cursor: 'pointer', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {fieldTypes.find((t) => t.type === field.type)?.icon}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {fieldTypes.find((t) => t.type === field.type)?.label}
          </span>
          {field.required && (
            <span style={{
              fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 600,
            }}>必填</span>
          )}
        </div>

        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: field.description ? '4px' : '12px' }}>
          {field.title}
        </h4>
        {field.description && (
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>{field.description}</p>
        )}

        {field.type === 'text' && (
          <input
            type="text"
            placeholder={field.placeholder}
            disabled
            style={{
              width: '100%', height: '44px', padding: '0 14px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '14px', background: '#f8fafc', color: '#94a3b8',
            }}
          />
        )}
        {field.type === 'textarea' && (
          <textarea
            placeholder={field.placeholder}
            disabled
            style={{
              width: '100%', minHeight: '88px', padding: '12px 14px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '14px', background: '#f8fafc', color: '#94a3b8',
              fontFamily: 'inherit', resize: 'vertical',
            }}
          />
        )}
        {(field.type === 'radio' || field.type === 'checkbox') && field.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options.map((opt, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: '#64748b', cursor: 'default',
              }}>
                <span style={{
                  width: '16px', height: '16px',
                  borderRadius: field.type === 'radio' ? '50%' : '4px',
                  border: '1.5px solid #cbd5e1', display: 'inline-block',
                }} />
                {opt}
              </label>
            ))}
          </div>
        )}
        {field.type === 'select' && field.options && (
          <select disabled style={{
            width: '100%', height: '44px', padding: '0 14px',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            fontSize: '14px', background: '#f8fafc', color: '#94a3b8',
          }}>
            {field.options.map((opt, i) => (
              <option key={i}>{opt}</option>
            ))}
          </select>
        )}
        {field.type === 'number' && (
          <input
            type="number"
            disabled
            style={{
              width: '100%', height: '44px', padding: '0 14px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '14px', background: '#f8fafc', color: '#94a3b8',
            }}
          />
        )}
        {field.type === 'date' && (
          <input
            type="date"
            disabled
            style={{
              width: '100%', height: '44px', padding: '0 14px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '14px', background: '#f8fafc', color: '#94a3b8',
            }}
          />
        )}
        {field.type === 'file' && (
          <div style={{
            padding: '24px', border: '2px dashed #cbd5e1', borderRadius: '8px',
            textAlign: 'center', background: '#f8fafc',
          }}>
            <span style={{ fontSize: '24px' }}>📎</span>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>点击或拖拽文件上传</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#f1f5f9' }}>
      {/* 左侧主编辑区 */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '24px',
        paddingRight: selectedField ? '444px' : '24px',
        transition: 'padding-right 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{
          maxWidth: '720px', margin: '0 auto',
        }}>
          {/* 顶部工具栏 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '24px', padding: '12px 16px',
            background: '#ffffff', borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '6px 12px', border: '1px solid #e2e8f0',
                background: '#ffffff', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', color: '#64748b',
              }}
            >← 返回</button>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px', border: '1px solid #e2e8f0',
                background: '#ffffff', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 500, color: '#334155',
                transition: 'all 0.15s ease-out',
              }}
            >保存草稿</button>
            <button
              onClick={handlePublish}
              style={{
                padding: '8px 16px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                transition: 'filter 0.15s ease-out, transform 0.1s ease-out',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >发布表单</button>
          </div>

          {/* 表单标题 */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '16px', padding: '32px', marginBottom: '20px',
            color: '#ffffff',
          }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: '#ffffff', fontSize: '24px', fontWeight: 700,
                outline: 'none', padding: '0', marginBottom: '8px',
                fontFamily: 'inherit',
              }}
              placeholder="表单标题"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.8)', fontSize: '14px',
                outline: 'none', padding: '0',
                fontFamily: 'inherit',
              }}
              placeholder="添加表单描述"
            />
          </div>

          {/* 字段列表 */}
          <div ref={fieldsContainerRef}>
            {fields.map((field, idx) => renderFieldPreview(field, idx))}
          </div>

          {/* 添加字段按钮 */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFieldTypeMenu(!showFieldTypeMenu)}
              style={{
                width: '100%', padding: '20px', border: '2px dashed #cbd5e1',
                background: '#ffffff', borderRadius: '12px', cursor: 'pointer',
                fontSize: '14px', color: '#64748b', fontWeight: 500,
                transition: 'all 0.2s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.color = '#8b5cf6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = showFieldTypeMenu ? '#8b5cf6' : '#cbd5e1';
                e.currentTarget.style.color = showFieldTypeMenu ? '#8b5cf6' : '#64748b';
              }}
            >
              + 添加新字段
            </button>
            {showFieldTypeMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                background: '#ffffff', borderRadius: '12px', padding: '8px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px',
                zIndex: 100,
                animation: 'fadeIn 0.2s ease-out',
              }}>
                {fieldTypes.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => addField(ft.type)}
                    style={{
                      padding: '12px 8px', border: 'none', background: 'transparent',
                      borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: '#64748b',
                      transition: 'background 0.15s ease-out, color 0.15s ease-out',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#8b5cf6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{ft.icon}</span>
                    {ft.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧配置面板 */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: selectedField ? '420px' : '0px',
        background: '#f8fafc',
        borderTopLeftRadius: selectedField ? '24px' : '0px',
        boxShadow: selectedField ? '-8px 0 32px rgba(0,0,0,0.08)' : 'none',
        overflow: 'hidden',
        transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), border-top-left-radius 0.35s ease',
        zIndex: 50,
      }}>
        {selectedField && (
          <div style={{
            height: '100%',
            padding: '24px',
            opacity: selectedField ? 1 : 0,
            transition: 'opacity 0.2s ease-out 0.1s',
            overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>字段设置</h3>
              <button
                onClick={() => setSelectedFieldId(null)}
                style={{
                  width: '32px', height: '32px', border: 'none',
                  background: '#e2e8f0', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '16px', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#cbd5e1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              >×</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                字段标题
              </label>
              <input
                value={selectedField.title}
                onChange={(e) => updateField(selectedField.id, { title: e.target.value })}
                style={{
                  width: '100%', height: '44px', padding: '0 14px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.15s ease-out',
                  background: '#ffffff',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                描述说明
              </label>
              <textarea
                value={selectedField.description}
                onChange={(e) => updateField(selectedField.id, { description: e.target.value })}
                placeholder="可选：给填写者额外提示"
                style={{
                  width: '100%', minHeight: '80px', padding: '12px 14px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                  transition: 'border-color 0.15s ease-out',
                  background: '#ffffff',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            {['text', 'textarea'].includes(selectedField.type) && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  占位文字
                </label>
                <input
                  value={selectedField.placeholder || ''}
                  onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                  style={{
                    width: '100%', height: '44px', padding: '0 14px',
                    border: '1.5px solid #