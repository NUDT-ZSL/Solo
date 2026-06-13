import { useState, useEffect } from 'react';
import { decksApi, cardsApi, Deck, Card } from '../api';
import { useAuth } from '../App';

interface BatchItem {
  id: string;
  word: string;
  meaning: string;
  example: string;
}

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default function CardManager() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [cards, setCards] = useState<Card[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([
    { id: crypto.randomUUID(), word: '', meaning: '', example: '' },
  ]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ word: '', meaning: '', example: '' });
  const [loading, setLoading] = useState(false);
  const { refreshStats } = useAuth();

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const data = await decksApi.getAll();
        setDecks(data);
        if (data.length > 0 && !selectedDeckId) {
          setSelectedDeckId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch decks:', err);
      }
    };

    fetchDecks();
  }, []);

  useEffect(() => {
    if (!selectedDeckId) return;

    const fetchCards = async () => {
      setLoading(true);
      try {
        const data = await cardsApi.getByDeck(selectedDeckId);
        setCards(data);
      } catch (err) {
        console.error('Failed to fetch cards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [selectedDeckId]);

  const addBatchItem = () => {
    if (batchItems.length >= 20) {
      alert('每次最多添加20个单词');
      return;
    }
    setBatchItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), word: '', meaning: '', example: '' },
    ]);
  };

  const removeBatchItem = (id: string) => {
    if (batchItems.length <= 1) return;
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateBatchItem = (id: string, field: keyof BatchItem, value: string) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleBatchSubmit = async () => {
    if (!selectedDeckId) {
      alert('请先选择一个卡片组');
      return;
    }

    const validItems = batchItems.filter((item) => item.word.trim() && item.meaning.trim());
    if (validItems.length === 0) {
      alert('请至少填写一个完整的单词');
      return;
    }

    try {
      for (const item of validItems) {
        await cardsApi.create({
          deckId: selectedDeckId,
          word: item.word.trim(),
          meaning: item.meaning.trim(),
          example: item.example.trim() || undefined,
        });
      }

      const data = await cardsApi.getByDeck(selectedDeckId);
      setCards(data);

      setBatchItems([
        { id: crypto.randomUUID(), word: '', meaning: '', example: '' },
      ]);

      await refreshStats();
    } catch (err) {
      console.error('Failed to add cards:', err);
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      await cardsApi.remove(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      await refreshStats();
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  const startEdit = (card: Card) => {
    setEditingCardId(card.id);
    setEditForm({ word: card.word, meaning: card.meaning, example: card.example || '' });
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setEditForm({ word: '', meaning: '', example: '' });
  };

  const saveEdit = async (cardId: string) => {
    try {
      await cardsApi.update(cardId, {
        word: editForm.word.trim(),
        meaning: editForm.meaning.trim(),
        example: editForm.example.trim() || undefined,
      });

      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, word: editForm.word, meaning: editForm.meaning, example: editForm.example }
            : c
        )
      );
      setEditingCardId(null);
    } catch (err) {
      console.error('Failed to update card:', err);
    }
  };

  const handleDeckChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeckId(e.target.value);
  };

  return (
    <div className="manager-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">单词管理</h1>
          <p className="page-subtitle">批量添加、编辑和删除单词卡片</p>
        </div>
      </div>

      <div className="deck-selector">
        <label className="form-label" style={{ marginRight: 12 }}>选择卡片组</label>
        <select
          className="deck-select"
          value={selectedDeckId}
          onChange={handleDeckChange}
        >
          <option value="">请选择...</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      </div>

      <div className="add-form">
        <h3 className="form-title">批量添加单词（最多20个）</h3>
        {batchItems.map((item, index) => (
          <div key={item.id} className="batch-item">
            <div className="form-group">
              {index === 0 && <label className="form-label">单词（英文）</label>}
              <input
                className="form-input"
                type="text"
                placeholder="word"
                value={item.word}
                onChange={(e) => updateBatchItem(item.id, 'word', e.target.value)}
              />
            </div>
            <div className="form-group">
              {index === 0 && <label className="form-label">释义（中文）</label>}
              <input
                className="form-input"
                type="text"
                placeholder="释义"
                value={item.meaning}
                onChange={(e) => updateBatchItem(item.id, 'meaning', e.target.value)}
              />
            </div>
            <div className="form-group">
              {index === 0 && <label className="form-label">例句（可选）</label>}
              <input
                className="form-input"
                type="text"
                placeholder="例句（可选）"
                value={item.example}
                onChange={(e) => updateBatchItem(item.id, 'example', e.target.value)}
              />
            </div>
            <button
              className="remove-batch-btn"
              onClick={() => removeBatchItem(item.id)}
              title="移除"
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={addBatchItem}>
            + 添加一行
          </button>
          <button className="btn btn-primary" onClick={handleBatchSubmit}>
            提交所有单词
          </button>
        </div>
      </div>

      <div className="cards-table-container">
        <table className="cards-table">
          <thead>
            <tr>
              <th>单词</th>
              <th>释义</th>
              <th>例句</th>
              <th style={{ width: 100 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                  加载中...
                </td>
              </tr>
            ) : cards.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                  暂无单词，请先添加
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <tr key={card.id}>
                  {editingCardId === card.id ? (
                    <>
                      <td>
                        <input
                          className="inline-input"
                          value={editForm.word}
                          onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                          autoFocus
                        />
                      </td>
                      <td>
                        <input
                          className="inline-input"
                          value={editForm.meaning}
                          onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="inline-input"
                          value={editForm.example}
                          onChange={(e) => setEditForm({ ...editForm, example: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="icon-btn edit"
                            onClick={() => saveEdit(card.id)}
                            title="保存"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={cancelEdit}
                            title="取消"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{card.word}</td>
                      <td>{card.meaning}</td>
                      <td>{card.example || '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="icon-btn edit"
                            onClick={() => startEdit(card)}
                            title="编辑"
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={() => handleDelete(card.id)}
                            title="删除"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
