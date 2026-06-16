import React, { useState, useEffect } from 'react';
import useApi, { Play } from '../hooks/useApi';
import './TroupeModule.css';

interface TroupeModuleProps {
  user?: { role: string };
}

const TroupeModule: React.FC<TroupeModuleProps> = ({ user }) => {
  const { getPlays, createPlay, updatePlay, deletePlay } = useApi();
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlay, setEditingPlay] = useState<Play | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '话剧',
    duration: 120,
    cast: '',
    posterUrl: '',
    description: ''
  });

  const loadPlays = async () => {
    setLoading(true);
    try {
      const data = await getPlays(filterType, keyword);
      setPlays(data);
    } catch (err) {
      console.error('加载剧目失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlays();
  }, [filterType, keyword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const playData = {
      ...formData,
      cast: formData.cast.split(',').map(c => c.trim()).filter(Boolean)
    };

    try {
      if (editingPlay) {
        await updatePlay(editingPlay.id, playData);
      } else {
        await createPlay(playData);
      }
      setShowForm(false);
      setEditingPlay(null);
      resetForm();
      loadPlays();
    } catch (err) {
      console.error('保存失败', err);
    }
  };

  const handleEdit = (play: Play) => {
    setEditingPlay(play);
    setFormData({
      name: play.name,
      type: play.type,
      duration: play.duration,
      cast: play.cast.join(', '),
      posterUrl: play.posterUrl,
      description: play.description
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个剧目吗？')) {
      try {
        await deletePlay(id);
        loadPlays();
      } catch (err) {
        console.error('删除失败', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '话剧',
      duration: 120,
      cast: '',
      posterUrl: '',
      description: ''
    });
  };

  return (
    <div className="troupe-module">
      <div className="module-header">
        <h2>剧目管理</h2>
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + 新增剧目
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="filter-types">
          {['全部', '话剧', '戏曲', '儿童剧'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索剧目名称、演员..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="plays-grid">
          {plays.map(play => (
            <div className="play-card" key={play.id}>
              <div className="play-poster">
                <img src={play.posterUrl} alt={play.name} />
                <div className="play-type-badge">{play.type}</div>
              </div>
              <div className="play-info">
                <h3 className="play-name">{play.name}</h3>
                <p className="play-duration">时长：{play.duration} 分钟</p>
                <p className="play-cast">
                  主演：{play.cast.slice(0, 3).join('、')}{play.cast.length > 3 ? '...' : ''}
                </p>
                <p className="play-desc">{play.description}</p>
              </div>
              {user?.role === 'admin' && (
                <div className="play-actions">
                  <button className="btn-edit" onClick={() => handleEdit(play)}>编辑</button>
                  <button className="btn-delete" onClick={() => handleDelete(play.id)}>删除</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingPlay ? '编辑剧目' : '新增剧目'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>剧目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>类型</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="话剧">话剧</option>
                  <option value="戏曲">戏曲</option>
                  <option value="儿童剧">儿童剧</option>
                </select>
              </div>
              <div className="form-group">
                <label>时长（分钟）</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="form-group">
                <label>演员阵容（逗号分隔）</label>
                <input
                  type="text"
                  value={formData.cast}
                  onChange={e => setFormData({...formData, cast: e.target.value})}
                  placeholder="演员1, 演员2, 演员3"
                />
              </div>
              <div className="form-group">
                <label>海报图片URL</label>
                <input
                  type="text"
                  value={formData.posterUrl}
                  onChange={e => setFormData({...formData, posterUrl: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>简介</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setShowForm(false);
                  setEditingPlay(null);
                  resetForm();
                }}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingPlay ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TroupeModule;
