import { useState, useEffect } from 'react';
import type { Recipe, User, RecipeContent, Ingredient, Step, Version } from '../types';
import { useApi } from '../hooks/useApi';
import dayjs from 'dayjs';

interface RecipeEditorProps {
  recipe: Recipe;
  user: User;
  onUpdate: (recipe: Recipe) => void;
}

function RecipeEditor({ recipe, user, onUpdate }: RecipeEditorProps) {
  const { saveVersion, createBranch, mergeVersions, getRecipe } = useApi();
  const [content, setContent] = useState<RecipeContent>({
    name: '',
    ingredients: [],
    steps: [],
    notes: '',
  });
  const [commitMessage, setCommitMessage] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [branchName, setBranchName] = useState('');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');

  useEffect(() => {
    if (recipe.versions && recipe.versions.length > 0) {
      const latest = recipe.versions.find(
        (v) => v.id === recipe.currentVersionId
      ) || recipe.versions[recipe.versions.length - 1];
      setContent({ ...latest.content });
      setCurrentBranch(latest.branch);
      setCurrentVersion(latest);
    }
  }, [recipe]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent({ ...content, name: e.target.value });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent({ ...content, notes: e.target.value });
  };

  const handleIngredientChange = (
    index: number,
    field: keyof Ingredient,
    value: string
  ) => {
    const newIngredients = [...content.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setContent({ ...content, ingredients: newIngredients });
  };

  const addIngredient = () => {
    setContent({
      ...content,
      ingredients: [...content.ingredients, { name: '', amount: '', unit: '克' }],
    });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = content.ingredients.filter((_, i) => i !== index);
    setContent({ ...content, ingredients: newIngredients });
  };

  const handleStepChange = (index: number, description: string) => {
    const newSteps = [...content.steps];
    newSteps[index] = { ...newSteps[index], description };
    setContent({ ...content, steps: newSteps });
  };

  const addStep = () => {
    setContent({
      ...content,
      steps: [...content.steps, { order: content.steps.length + 1, description: '' }],
    });
  };

  const removeStep = (index: number) => {
    const newSteps = content.steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, order: i + 1 }));
    setContent({ ...content, steps: newSteps });
  };

  const handleSave = async () => {
    if (!currentVersion) return;
    try {
      const message = commitMessage || '更新食谱';
      const newVersion = await saveVersion(
        recipe.id,
        content,
        message,
        currentBranch,
        [currentVersion.id]
      );
      setCommitMessage('');
      setCurrentVersion(newVersion as Version);
      
      const updatedRecipe = await getRecipe(recipe.id);
      onUpdate(updatedRecipe as Recipe);
    } catch (err) {
      console.error('保存失败', err);
    }
  };

  const handleCreateBranch = async () => {
    if (!currentVersion || !branchName) return;
    try {
      const newVersion = await createBranch(
        recipe.id,
        currentVersion.id,
        branchName
      );
      setCurrentVersion(newVersion as Version);
      setCurrentBranch((newVersion as Version).branch);
      setContent({ ...(newVersion as Version).content });
      setShowBranchModal(false);
      setBranchName('');
      
      const updatedRecipe = await getRecipe(recipe.id);
      onUpdate(updatedRecipe as Recipe);
    } catch (err) {
      console.error('创建分支失败', err);
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId) return;
    try {
      const mergedVersion = await mergeVersions(
        recipe.id,
        'main',
        mergeSourceId,
        `合并到主分支`
      );
      setCurrentVersion(mergedVersion as Version);
      setCurrentBranch('main');
      setContent({ ...(mergedVersion as Version).content });
      setShowMergeModal(false);
      setMergeSourceId('');
      
      const updatedRecipe = await getRecipe(recipe.id);
      onUpdate(updatedRecipe as Recipe);
    } catch (err) {
      console.error('合并失败', err);
    }
  };

  const switchToVersion = (version: Version) => {
    setCurrentVersion(version);
    setCurrentBranch(version.branch);
    setContent({ ...version.content });
  };

  const branches = Array.from(new Set(recipe.versions?.map((v) => v.branch) || ['main']));
  const otherBranchVersions = recipe.versions?.filter(
    (v) => v.branch !== 'main' && v.branch === currentBranch
  ) || [];

  return (
    <div className="recipe-editor">
      <div className="editor-header">
        <div className="branch-info">
          <span className="branch-label">分支:</span>
          <span className="branch-name">{currentBranch}</span>
          <span className="version-label">
            当前版本: {currentVersion?.versionNumber || 'v1'}
          </span>
        </div>
        <div className="editor-actions">
          <button className="btn-secondary" onClick={() => setShowBranchModal(true)}>
            🌿 创建分支
          </button>
          {currentBranch !== 'main' && (
            <button className="btn-secondary" onClick={() => setShowMergeModal(true)}>
              🔀 合并到主分支
            </button>
          )}
        </div>
      </div>

      <div className="commit-section">
        <input
          type="text"
          placeholder="提交信息..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          className="commit-input"
        />
        <button className="btn-primary" onClick={handleSave}>
          💾 保存新版本
        </button>
      </div>

      <div className="editor-body">
        <div className="editor-column ingredients-column">
          <h3>🥗 食材清单</h3>
          <div className="ingredients-list">
            {content.ingredients.map((ing, index) => (
              <div key={index} className="ingredient-row">
                <input
                  type="text"
                  placeholder="食材名称"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="ing-name"
                />
                <input
                  type="text"
                  placeholder="数量"
                  value={ing.amount}
                  onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                  className="ing-amount"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className="ing-unit"
                >
                  <option value="克">克</option>
                  <option value="毫升">毫升</option>
                  <option value="个">个</option>
                  <option value="勺">勺</option>
                  <option value="茶匙">茶匙</option>
                  <option value="汤匙">汤匙</option>
                  <option value="适量">适量</option>
                </select>
                <button
                  className="btn-remove"
                  onClick={() => removeIngredient(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addIngredient}>
            + 添加食材
          </button>
        </div>

        <div className="editor-column steps-column">
          <h3>📝 操作步骤</h3>
          <div className="steps-list">
            {content.steps.map((step, index) => (
              <div key={index} className="step-row">
                <span className="step-number">{step.order}</span>
                <textarea
                  placeholder="描述这一步..."
                  value={step.description}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  className="step-textarea"
                  rows={2}
                />
                <button
                  className="btn-remove"
                  onClick={() => removeStep(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addStep}>
            + 添加步骤
          </button>
        </div>
      </div>

      <div className="notes-section">
        <h3>📒 备注</h3>
        <textarea
          placeholder="添加备注信息..."
          value={content.notes}
          onChange={handleNotesChange}
          className="notes-textarea"
          rows={3}
        />
      </div>

      {showBranchModal && (
        <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>创建新分支</h3>
            <input
              type="text"
              placeholder="分支名称"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
            <p className="modal-hint">
              从 {currentVersion?.versionNumber} 创建新分支
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBranchModal(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleCreateBranch}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showMergeModal && (
        <div className="modal-overlay" onClick={() => setShowMergeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>合并到主分支</h3>
            <p className="modal-hint">选择要合并的版本:</p>
            <select
              value={mergeSourceId}
              onChange={(e) => setMergeSourceId(e.target.value)}
              className="merge-select"
            >
              <option value="">请选择...</option>
              {recipe.versions
                ?.filter((v) => v.branch === currentBranch)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionNumber} - {v.message} ({dayjs(v.timestamp).format('MM-DD HH:mm')})
                  </option>
                ))}
            </select>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowMergeModal(false)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleMerge}
                disabled={!mergeSourceId}
              >
                合并
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .recipe-editor {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f5f0e1;
        }

        .branch-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .branch-label {
          font-size: 14px;
          color: #8d6e63;
        }

        .branch-name {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
        }

        .version-label {
          font-size: 13px;
          color: #a1887f;
          margin-left: 12px;
        }

        .editor-actions {
          display: flex;
          gap: 8px;
        }

        .commit-section {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .commit-input {
          flex: 1;
          padding: 10px 14px;
        }

        .btn-primary {
          background: #8b4513;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
        }

        .btn-secondary {
          background: #f5deb3;
          color: #8b4513;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .editor-body {
          display: flex;
          gap: 20px;
        }

        .editor-column {
          flex: 1;
        }

        .editor-column h3 {
          color: #8b4513;
          margin-bottom: 12px;
          font-size: 16px;
        }

        .ingredient-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          align-items: center;
        }

        .ing-name {
          flex: 2;
        }

        .ing-amount {
          flex: 1;
        }

        .ing-unit {
          width: 80px;
          padding: 8px;
          border: 1px solid #d7ccc8;
          border-radius: 6px;
          background: #fff;
        }

        .step-row {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          align-items: flex-start;
        }

        .step-number {
          width: 28px;
          height: 28px;
          background: #f5deb3;
          color: #8b4513;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .step-textarea {
          flex: 1;
          resize: vertical;
          min-height: 50px;
        }

        .btn-remove {
          background: #ffebee;
          color: #c62828;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 18px;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 6px;
        }

        .btn-add {
          background: #e8f5e9;
          color: #2e7d32;
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          margin-top: 8px;
          font-size: 14px;
        }

        .notes-section {
          margin-top: 20px;
        }

        .notes-section h3 {
          color: #8b4513;
          margin-bottom: 10px;
          font-size: 16px;
        }

        .notes-textarea {
          width: 100%;
          resize: vertical;
          min-height: 60px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          min-width: 320px;
          max-width: 400px;
        }

        .modal h3 {
          color: #8b4513;
          margin-bottom: 16px;
        }

        .modal input,
        .modal select {
          width: 100%;
          padding: 10px 12px;
          margin-bottom: 12px;
        }

        .modal-hint {
          font-size: 13px;
          color: #8d6e63;
          margin-bottom: 12px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }

        .merge-select {
          width: 100%;
          padding: 10px;
          border: 1px solid #d7ccc8;
          border-radius: 6px;
        }

        @media (max-width: 768px) {
          .editor-body {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default RecipeEditor;
