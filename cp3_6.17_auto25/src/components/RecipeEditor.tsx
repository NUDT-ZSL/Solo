import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import type { Ingredient, Step, Version } from '../types';

interface RecipeEditorProps {
  version: Version | null;
  onSave: (data: {
    name: string;
    ingredients: Ingredient[];
    steps: Step[];
    notes: string;
    commitMessage: string;
    branch: string;
  }) => void;
  saving: boolean;
}

const RecipeEditor: React.FC<RecipeEditorProps> = ({ version, onSave, saving }) => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [notes, setNotes] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [branch, setBranch] = useState('main');

  useEffect(() => {
    if (version) {
      setName(version.name);
      setIngredients(version.ingredients.length > 0 ? version.ingredients : [{ name: '', quantity: '', unit: '' }]);
      setSteps(version.steps.length > 0 ? version.steps : [{ order: 1, description: '' }]);
      setNotes(version.notes);
      setBranch(version.branch);
    } else {
      setName('');
      setIngredients([{ name: '', quantity: '', unit: '' }]);
      setSteps([{ order: 1, description: '' }]);
      setNotes('');
      setCommitMessage('');
      setBranch('main');
    }
  }, [version]);

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleStepChange = (index: number, description: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], description };
      return next;
    });
  };

  const addStep = () => {
    setSteps(prev => [...prev, { order: prev.length + 1, description: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        return filtered.map((s, i) => ({ ...s, order: i + 1 }));
      });
    }
  };

  const handleSave = () => {
    const validIngredients = ingredients.filter(i => i.name.trim());
    const validSteps = steps.filter(s => s.description.trim());
    onSave({
      name,
      ingredients: validIngredients,
      steps: validSteps,
      notes,
      commitMessage,
      branch,
    });
  };

  return (
    <div className="recipe-editor" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px' }}>食谱编辑器</h2>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={18} />
          {saving ? '保存中...' : '保存新版本'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>食谱名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入食谱名称..."
              style={{ width: '100%', padding: '12px', fontSize: '16px' }}
            />
          </div>
          <div style={{ minWidth: '160px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>当前分支</label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              style={{ width: '100%', padding: '12px' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>提交信息</label>
            <input
              type="text"
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              placeholder="描述本次修改..."
              style={{ width: '100%', padding: '12px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px' }}>食材清单</h3>
              <button className="btn-outline" onClick={addIngredient} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={16} /> 添加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 40px', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="食材名称"
                    value={ing.name}
                    onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
                    style={{ padding: '8px' }}
                  />
                  <input
                    type="text"
                    placeholder="数量"
                    value={ing.quantity}
                    onChange={e => handleIngredientChange(idx, 'quantity', e.target.value)}
                    style={{ padding: '8px' }}
                  />
                  <input
                    type="text"
                    placeholder="单位"
                    value={ing.unit}
                    onChange={e => handleIngredientChange(idx, 'unit', e.target.value)}
                    style={{ padding: '8px' }}
                  />
                  <button
                    onClick={() => removeIngredient(idx)}
                    style={{ color: '#e57373', padding: '8px', display: 'flex', justifyContent: 'center' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px' }}>操作步骤</h3>
              <button className="btn-outline" onClick={addStep} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={16} /> 添加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: '8px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <textarea
                    placeholder="描述这一步..."
                    value={step.description}
                    onChange={e => handleStepChange(idx, e.target.value)}
                    style={{ padding: '8px', minHeight: '60px', resize: 'vertical' }}
                  />
                  <button
                    onClick={() => removeStep(idx)}
                    style={{ color: '#e57373', padding: '8px', display: 'flex', justifyContent: 'center', marginTop: '4px' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '18px' }}>备注</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="添加烹饪技巧、替代食材、注意事项等..."
            style={{ width: '100%', minHeight: '100px', padding: '12px', resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
};

export default RecipeEditor;
