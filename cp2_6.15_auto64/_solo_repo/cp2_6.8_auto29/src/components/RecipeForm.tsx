import React, { useState } from 'react';

interface RecipeFormProps {
  onSubmit: (data: {
    title: string;
    imageUrl: string;
    description: string;
    ingredients: string[];
    steps: string;
  }) => Promise<boolean>;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('请输入食谱标题');
      return;
    }
    if (!imageUrl.trim()) {
      setError('请输入封面图片URL');
      return;
    }
    if (description.length > 200) {
      setError('描述不能超过200字');
      return;
    }

    const validIngredients = ingredients
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    if (validIngredients.length === 0) {
      setError('请至少输入一个材料');
      return;
    }

    setSubmitting(true);
    const ok = await onSubmit({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      description: description.trim(),
      ingredients: validIngredients,
      steps: steps.trim(),
    });
    setSubmitting(false);

    if (ok) {
      setSuccess('食谱上传成功！');
      setTitle('');
      setImageUrl('');
      setDescription('');
      setIngredients(['']);
      setSteps('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('上传失败，请稍后重试');
    }
  };

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>食谱标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：番茄炒蛋"
          maxLength={50}
        />
      </div>

      <div className="form-group">
        <label>封面图片URL *</label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="form-group">
        <label>描述（最多200字）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简单介绍一下这道菜..."
          maxLength={200}
          rows={3}
        />
        <div className="char-count">{description.length}/200</div>
      </div>

      <div className="form-group">
        <label>材料列表 *（至少一个）</label>
        {ingredients.map((ing, index) => (
          <div className="ingredient-row" key={index}>
            <input
              type="text"
              value={ing}
              onChange={(e) => handleIngredientChange(index, e.target.value)}
              placeholder={`材料 ${index + 1}`}
            />
            {ingredients.length > 1 && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleRemoveIngredient(index)}
              >
                删除
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-add"
          onClick={handleAddIngredient}
        >
          + 添加材料
        </button>
      </div>

      <div className="form-group">
        <label>步骤描述</label>
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="详细描述制作步骤..."
          rows={5}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? '上传中...' : '提交食谱'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setTitle('');
            setImageUrl('');
            setDescription('');
            setIngredients(['']);
            setSteps('');
            setError('');
            setSuccess('');
          }}
        >
          重置
        </button>
      </div>
    </form>
  );
};

export default RecipeForm;
