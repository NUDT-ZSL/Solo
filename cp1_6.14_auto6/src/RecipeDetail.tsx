import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getRecipe,
  getNote,
  saveNote,
  getShoppingList,
  saveShoppingList,
  addFavorite,
  removeFavorite,
  checkFavorite,
  type Recipe,
  type ShoppingItem
} from './utils/api';

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
}

const SHOPPING_LS_PREFIX = 'recipescout_shopping_';

const EMOJI_LIST = ['😊', '👍', '🔥', '⭐', '❤️', '🎉', '💡', '📝', '✅', '🧂', '🍳', '🥘'];

function getLSChecked(recipeId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SHOPPING_LS_PREFIX + recipeId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLSChecked(recipeId: string, checked: Record<string, boolean>) {
  localStorage.setItem(SHOPPING_LS_PREFIX + recipeId, JSON.stringify(checked));
}

export default function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingGenerated, setShoppingGenerated] = useState(false);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getRecipe(recipeId).then(setRecipe);
    checkFavorite(recipeId).then(res => setFavorited(res.favorited));
    getNote(recipeId).then(content => {
      if (editorRef.current) {
        editorRef.current.innerHTML = content || '';
      }
      setNoteLoaded(true);
    });
    getShoppingList(recipeId).then(items => {
      if (items && items.length > 0) {
        setShoppingItems(items);
        setShoppingGenerated(true);
      }
    });
    setCheckedMap(getLSChecked(recipeId));
  }, [recipeId]);

  const toggleFavorite = useCallback(async () => {
    if (favorited) {
      await removeFavorite(recipeId);
    } else {
      await addFavorite(recipeId);
    }
    setFavorited(!favorited);
  }, [favorited, recipeId]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    document.execCommand('insertText', false, emoji);
    setShowEmojiPicker(false);
    editorRef.current?.focus();
  }, []);

  const handleEditorInput = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (editorRef.current) {
        const content = editorRef.current.innerHTML;
        await saveNote(recipeId, content);
        setSaveStatus('已自动保存');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    }, 800);
  }, [recipeId]);

  const handleGenerateShoppingList = useCallback(() => {
    if (!recipe) return;
    const items: ShoppingItem[] = recipe.ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      checked: false
    }));
    setShoppingItems(items);
    setShoppingGenerated(true);
    saveShoppingList(recipeId, items);
  }, [recipe, recipeId]);

  const toggleCheck = useCallback((itemName: string) => {
    setCheckedMap(prev => {
      const next = { ...prev, [itemName]: !prev[itemName] };
      setLSChecked(recipeId, next);
      return next;
    });
  }, [recipeId]);

  if (!recipe) {
    return <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">加载中...</div></div>;
  }

  return (
    <div className="detail-container">
      <button className="back-button" onClick={onBack}>← 返回搜索</button>

      <div className="detail-header">
        <div className="recipe-placeholder">🍽️</div>
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 className="detail-title" style={{ marginBottom: 0 }}>{recipe.name}</h2>
            <button
              className={`favorite-btn ${favorited ? 'favorited' : ''}`}
              onClick={toggleFavorite}
              style={{ fontSize: '1.8rem' }}
            >
              {favorited ? '★' : '☆'}
            </button>
          </div>
          <div className="detail-ingredients">
            {recipe.ingredients.map(ing => (
              <span key={ing.name} className="detail-ingredient-item">
                {ing.name} {ing.amount}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="steps-section">
        <h3 className="section-title">烹饪步骤</h3>
        <div className="steps-list">
          {recipe.steps.map((step, i) => (
            <div key={i} className="step-item">{i + 1}. {step}</div>
          ))}
        </div>
      </div>

      <div className="notes-section">
        <h3 className="section-title">个人笔记</h3>
        <div className="note-toolbar">
          <button
            className="toolbar-btn"
            onClick={() => execCommand('bold')}
            title="加粗"
          >
            <strong>B</strong>
          </button>
          <button
            className="toolbar-btn"
            onClick={() => execCommand('insertUnorderedList')}
            title="无序列表"
          >
            • 列表
          </button>
          <button
            className="toolbar-btn"
            onClick={() => execCommand('insertOrderedList')}
            title="有序列表"
          >
            1. 列表
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="toolbar-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="插入表情"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-item"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div
          ref={editorRef}
          className="rich-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
        />
        {saveStatus && <div className="save-status">{saveStatus}</div>}
      </div>

      <div className="shopping-section">
        <h3 className="section-title">购物清单</h3>
        {!shoppingGenerated ? (
          <button className="generate-btn" onClick={handleGenerateShoppingList}>
            🛒 生成购物清单
          </button>
        ) : (
          <ul className="shopping-list">
            {shoppingItems.map(item => (
              <li
                key={item.name}
                className={`shopping-item ${checkedMap[item.name] ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={!!checkedMap[item.name]}
                  onChange={() => toggleCheck(item.name)}
                />
                <span>{item.name}</span>
                <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '0.85rem' }}>
                  {item.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
