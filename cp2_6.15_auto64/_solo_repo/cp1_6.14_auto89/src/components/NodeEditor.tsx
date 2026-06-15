import React, { useState, useEffect } from 'react';
import type { SkillNode, MasteryLevel } from '../types';
import { skillsApi } from '../utils/http';

interface NodeEditorProps {
  nodes: SkillNode[];
  selectedId: string | null;
  onRefresh: () => void;
  onAddChild: (parentId: string) => void;
}

const MASTERY_OPTIONS: { value: MasteryLevel; label: string }[] = [
  { value: 'unlearned', label: '未学习' },
  { value: 'learning', label: '学习中' },
  { value: 'mastered', label: '已掌握' },
];

const NodeEditor: React.FC<NodeEditorProps> = ({ nodes, selectedId, onRefresh, onAddChild }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<MasteryLevel>('unlearned');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [newDomainName, setNewDomainName] = useState('');
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const selectedNode = selectedId ? nodeMap.get(selectedId) || null : null;

  useEffect(() => {
    if (selectedNode) {
      setName(selectedNode.name);
      setDescription(selectedNode.description);
      setLevel(selectedNode.level);
      setEstimatedHours(selectedNode.estimatedHours);
      setSelectedPrereqs([...selectedNode.prerequisites]);
      setValidationError(null);
    } else {
      setName('');
      setDescription('');
      setLevel('unlearned');
      setEstimatedHours(0);
      setSelectedPrereqs([]);
      setValidationError(null);
    }
  }, [selectedNode]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setValidationError(null);
    try {
      await skillsApi.update(selectedId, {
        name,
        description,
        level,
        estimatedHours,
      });
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '保存失败';
      setValidationError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrerequisite = async (prereqId: string) => {
    if (!selectedId || selectedPrereqs.includes(prereqId)) return;
    setValidationError(null);

    try {
      const result = await skillsApi.validateDependency(selectedId, prereqId);
      if (!result.valid) {
        setValidationError(result.reason || '依赖关系不合法');
        return;
      }

      const newPrereqs = [...selectedPrereqs, prereqId];
      await skillsApi.setPrerequisites(selectedId, newPrereqs);
      setSelectedPrereqs(newPrereqs);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '添加依赖失败';
      setValidationError(msg);
    }
  };

  const handleRemovePrerequisite = async (prereqId: string) => {
    if (!selectedId) return;
    setValidationError(null);
    const newPrereqs = selectedPrereqs.filter(p => p !== prereqId);
    try {
      await skillsApi.setPrerequisites(selectedId, newPrereqs);
      setSelectedPrereqs(newPrereqs);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '移除依赖失败';
      setValidationError(msg);
    }
  };

  const handleCreateDomain = async () => {
    if (!newDomainName.trim()) return;
    setSaving(true);
    setValidationError(null);
    try {
      await skillsApi.create({
        name: newDomainName.trim(),
        level: 'unlearned',
        estimatedHours: 0,
        parentId: null,
      });
      setNewDomainName('');
      onRefresh();
    } catch (err: any) {
      setValidationError('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSaving(true);
    setValidationError(null);
    try {
      await skillsApi.remove(selectedId);
      onRefresh();
    } catch {
      setValidationError('删除失败');
    } finally {
      setSaving(false);
    }
  };

  const availablePrereqs = nodes.filter(
    n => n.id !== selectedId && !selectedPrereqs.includes(n.id)
  );

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#2c3e50' }}>
        技能节点编辑
      </h3>

      {validationError && (
        <div
          style={{
            background: '#fff3e0',
            border: '1px solid #ffb74d',
            color: '#e65100',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          ⚠️ {validationError}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
          添加顶级技能领域
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newDomainName}
            onChange={(e) => setNewDomainName(e.target.value)}
            placeholder="输入领域名称..."
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #cfd8dc',
              borderRadius: 6,
              fontSize: 13,
              outline: 'none',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateDomain()}
          />
          <button
            onClick={handleCreateDomain}
            disabled={saving || !newDomainName.trim()}
            style={{
              padding: '8px 16px',
              background: '#2c3e50',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13,
              opacity: saving ? 0.6 : 1,
            }}
          >
            创建
          </button>
        </div>
      </div>

      {selectedNode ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
              名称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cfd8dc',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cfd8dc',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
                掌握程度
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as MasteryLevel)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cfd8dc',
                  borderRadius: 6,
                  fontSize: 13,
                  outline: 'none',
                }}
              >
                {MASTERY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
                预计学习时长（小时）
              </label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value) || 0)}
                min={0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cfd8dc',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
              添加子技能
            </label>
            <button
              onClick={() => onAddChild(selectedId)}
              style={{
                padding: '6px 14px',
                background: '#eceff1',
                border: '1px solid #cfd8dc',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                color: '#37474f',
              }}
            >
              + 添加子节点
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#78909c', display: 'block', marginBottom: 4 }}>
              前置依赖关系
            </label>

            {selectedPrereqs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {selectedPrereqs.map(preId => {
                  const preNode = nodeMap.get(preId);
                  return (
                    <span
                      key={preId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#e3f2fd',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#1565c0',
                      }}
                    >
                      {preNode?.name || preId}
                      <button
                        onClick={() => handleRemovePrerequisite(preId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#e53935',
                          fontSize: 14,
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {availablePrereqs.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) handleAddPrerequisite(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cfd8dc',
                  borderRadius: 6,
                  fontSize: 13,
                  outline: 'none',
                  color: '#546e7a',
                }}
              >
                <option value="" disabled>
                  选择前置依赖...
                </option>
                {availablePrereqs.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#2c3e50',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              style={{
                padding: '10px 16px',
                background: '#fff',
                color: '#e53935',
                border: '1px solid #e53935',
                borderRadius: 6,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                opacity: saving ? 0.6 : 1,
              }}
            >
              删除
            </button>
          </div>
        </>
      ) : (
        <div
          style={{
            color: '#90a4ae',
            fontSize: 13,
            textAlign: 'center',
            padding: '32px 16px',
            background: '#fafafa',
            borderRadius: 8,
            border: '1px dashed #cfd8dc',
          }}
        >
          ← 点击左侧技能树节点进行编辑
        </div>
      )}
    </div>
  );
};

export default NodeEditor;
