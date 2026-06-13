import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SnippetFormData, Snippet } from '../types';
import { getSnippetById, addSnippet, updateSnippet } from '../api/snippets';
import SnippetForm from '../components/SnippetForm';

const addPageStyles = `
  .add-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .add-page-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
  }

  .back-btn:hover {
    background: #334155;
  }

  .back-btn:active {
    transform: scale(0.95);
  }

  .add-page-title {
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 12px;
    color: #94a3b8;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #334155;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function AddSnippetPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState<SnippetFormData | undefined>(undefined);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (id) {
      getSnippetById(id)
        .then((snippet) => {
          setInitialData({
            title: snippet.title,
            code: snippet.code,
            language: snippet.language,
            tags: snippet.tags,
          });
        })
        .catch((err) => {
          console.error('Failed to load snippet:', err);
          navigate('/');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const handleSubmit = async (data: SnippetFormData) => {
    try {
      if (isEditing && id) {
        await updateSnippet(id, data);
      } else {
        await addSnippet(data);
      }
      navigate('/');
    } catch (err) {
      console.error('Failed to save snippet:', err);
    }
  };

  return (
    <>
      <style>{addPageStyles}</style>
      <div className="add-page">
        <div className="add-page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="add-page-title">
            {isEditing ? '编辑代码片段' : '添加代码片段'}
          </h1>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            加载中...
          </div>
        ) : (
          <SnippetForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            submitLabel={isEditing ? '更新' : '保存'}
          />
        )}
      </div>
    </>
  );
}
