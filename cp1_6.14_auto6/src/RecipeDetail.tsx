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

const SHOPPING_LS_PREFIX = 'recipescout_shopping_full_';

const EMOJI_CATEGORIES: Record<string, string[]> = {
  '表情': ['😊', '�', '🥰', '😋', '🤤', '�👍', '�', '�🔥'],
  '食物': ['🍳', '🥘', '🍲', '🥗', '🍜', '🥟', '🍱', '🥞'],
  '厨具': ['🧂', '🫙', '🥄', '�', '🔪', '🥣', '🧊', '🔥'],
  '符号': ['⭐', '❤️', '💡', '📝', '✅', '❗', '⚠️', '🎉']
};

type EditorRangeInfo = { anchorOffset: number; focusOffset: number; container: HTMLElement | null } | null;

function getFullShoppingLS(recipeId: string): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(SHOPPING_LS_PREFIX + recipeId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFullShoppingLS(recipeId: string, items: ShoppingItem[]) {
  localStorage.setItem(SHOPPING_LS_PREFIX + recipeId, JSON.stringify(items));
}

function preserveSelection(): EditorRangeInfo {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return {
    anchorOffset: range.startOffset,
    focusOffset: range.endOffset,
    container: range.startContainer.nodeType === 1
      ? (range.startContainer as HTMLElement)
      : (range.startContainer.parentElement as HTMLElement)
  };
}

function restoreSelection(editor: HTMLElement, savedRange: EditorRangeInfo) {
  if (!savedRange) return;
  const sel = window.getSelection();
  if (!sel) return;

  let textNode: Text | null = null;
  let charIndex = 0;
  const targetOffset = savedRange.anchorOffset;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const nextLen = charIndex + node.length;
    if (targetOffset <= nextLen) {
      textNode = node;
      const localOffset = targetOffset - charIndex;
      const range = document.createRange();
      range.setStart(node, Math.min(localOffset, node.length));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      break;
    }
    charIndex = nextLen;
  }

  if (!textNode && editor.firstChild) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function getEditorTextLength(editor: HTMLElement): number {
  return (editor.innerText || '').length;
}

export default function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingGenerated, setShoppingGenerated] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>('表情');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<EditorRangeInfo>(null);
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

    const fullLS = getFullShoppingLS(recipeId);
    if (fullLS.length > 0) {
      setShoppingItems(fullLS);
      setShoppingGenerated(true);
    } else {
      getShoppingList(recipeId).then(items => {
        if (items && items.length > 0) {
          setShoppingItems(items);
          setShoppingGenerated(true);
        }
      });
    }
  }, [recipeId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-wrapper')) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleFavorite = useCallback(async () => {
    if (favorited) {
      await removeFavorite(recipeId);
    } else {
      await addFavorite(recipeId);
    }
    setFavorited(!favorited);
  }, [favorited, recipeId]);

  const applyBold = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;

    const textLen = getEditorTextLength(editor);
    const offset = (() => {
      const pre = document.createRange();
      pre.selectNodeContents(editor);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    })();

    const bold = document.createElement('strong');
    try {
      bold.appendChild(range.extractContents());
      range.insertNode(bold);
    } catch {
      return;
    }

    const restored: EditorRangeInfo = {
      anchorOffset: offset + selectedText.length,
      focusOffset: offset + selectedText.length,
      container: editor
    };
    setTimeout(() => restoreSelection(editor, restored), 0);
  }, []);

  const applyList = useCallback((ordered: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    let lineText = '';

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        lineText = range.toString();
      } else {
        const range2 = sel.getRangeAt(0);
        const container = range2.startContainer.nodeType === 3
          ? range2.startContainer
          : range2.startContainer.lastChild || range2.startContainer;
        if (container.nodeType === 3) {
          lineText = container.textContent || '';
        }
      }
    }

    const cursorOffset = getEditorTextLength(editor) + 2;
    const list = document.createElement(ordered ? 'ol' : 'ul');
    if (lineText.trim()) {
      const li = document.createElement('li');
      li.textContent = lineText.trim();
      list.appendChild(li);
    } else {
      ['', '', ''].forEach(() => {
        const li = document.createElement('li');
        li.textContent = '条目';
        list.appendChild(li);
      });
    }

    const savedRange: EditorRangeInfo = {
      anchorOffset: cursorOffset,
      focusOffset: cursorOffset,
      container: editor
    };

    editor.appendChild(document.createElement('br'));
    editor.appendChild(list);
    editor.appendChild(document.createElement('br'));

    setTimeout(() => restoreSelection(editor, savedRange), 0);
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      const offset = getEditorTextLength(editor);
      editor.appendChild(document.createTextNode(emoji));
      const restored: EditorRangeInfo = {
        anchorOffset: offset + emoji.length,
        focusOffset: offset + emoji.length,
        container: editor
      };
      restoreSelection(editor, restored);
    } else {
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.startContainer)) {
        const offset = getEditorTextLength(editor);
        editor.appendChild(document.createTextNode(emoji));
        const restored: EditorRangeInfo = {
          anchorOffset: offset + emoji.length,
          focusOffset: offset + emoji.length,
          container: editor
        };
        restoreSelection(editor, restored);
      } else {
        const offset = (() => {
          const pre = document.createRange();
          pre.selectNodeContents(editor);
          pre.setEnd(range.startContainer, range.startOffset);
          return pre.toString().length;
        })();
        range.deleteContents();
        range.insertNode(document.createTextNode(emoji));
        const restored: EditorRangeInfo = {
          anchorOffset: offset + emoji.length,
          focusOffset: offset + emoji.length,
          container: editor
        };
        setTimeout(() => restoreSelection(editor, restored), 0);
      }
    }

    setShowEmojiPicker(false);
  }, []);

  const handleEditorBeforeInput = useCallback(() => {
    savedSelectionRef.current = preserveSelection();
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

  const persistShopping = useCallback((items: ShoppingItem[]) => {
    setFullShoppingLS(recipeId, items);
    saveShoppingList(recipeId, items);
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
    persistShopping(items);
  }, [recipe, recipeId, persistShopping]);

  const toggleCheck = useCallback((idx: number) => {
    setShoppingItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], checked: !next[idx].checked };
      persistShopping(next);
      return next;
    });
  }, [persistShopping]);

  const deleteItem = useCallback((idx: number) => {
    setShoppingItems(prev => {
      const next = prev.filter((_, i) => i !== idx);
      persistShopping(next);
      return next;
    });
  }, [persistShopping]);

  const addCustomItem = useCallback(() => {
    if (!newItemName.trim()) return;
    const newItem: ShoppingItem = {
      name: newItemName.trim(),
      amount: newItemAmount.trim() || '适量',
      checked: false
    };
    setShoppingItems(prev => {
      const next = [...prev, newItem];
      persistShopping(next);
      return next;
    });
    setNewItemName('');
    setNewItemAmount('');
  }, [newItemName, newItemAmount, persistShopping]);

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
            onClick={applyBold}
            title="加粗选中文字"
          >
            <strong>B</strong>
          </button>
          <button
            className="toolbar-btn"
            onClick={() => applyList(false)}
            title="无序列表"
          >
            • 列表
          </button>
          <button
            className="toolbar-btn"
            onClick={() => applyList(true)}
            title="有序列表"
          >
            1. 列表
          </button>
          <div className="emoji-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="toolbar-btn"
              onClick={e => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
              }}
              title="插入表情"
            >
              😊 表情 ▾
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker" onClick={e => e.stopPropagation()}>
                <div className="emoji-category-tabs">
                  {Object.keys(EMOJI_CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      className={`emoji-category-tab ${activeEmojiCategory === cat ? 'active' : ''}`}
                      onClick={() => setActiveEmojiCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="emoji-grid">
                  {EMOJI_CATEGORIES[activeEmojiCategory].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-item"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          ref={editorRef}
          className="rich-editor"
          contentEditable
          suppressContentEditableWarning
          onBeforeInput={handleEditorBeforeInput}
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
          <>
            <ul className="shopping-list">
              {shoppingItems.map((item, idx) => (
                <li
                  key={`${item.name}-${idx}`}
                  className={`shopping-item ${item.checked ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(idx)}
                  />
                  <span className="shopping-item-name">{item.name}</span>
                  <span className="shopping-item-amount">{item.amount}</span>
                  <button
                    className="shopping-item-delete"
                    onClick={() => deleteItem(idx)}
                    title="删除此项"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="shopping-add-row">
              <input
                className="shopping-add-input"
                type="text"
                placeholder="添加食材名..."
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); }}
              />
              <input
                className="shopping-add-input shopping-add-amount"
                type="text"
                placeholder="数量(可选)"
                value={newItemAmount}
                onChange={e => setNewItemAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); }}
              />
              <button className="shopping-add-btn" onClick={addCustomItem}>
                + 添加
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
