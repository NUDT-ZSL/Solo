import React, { useState, useCallback, useEffect } from 'react';
import {
  LyricFragment,
  WorkareaSlot,
  Version,
  createFragment,
  updateFragmentContent,
  createWorkareaSlot,
  reorderSlots,
  createVersion,
  restoreFromVersion,
  getTotalCharCount,
  PRESET_TAGS,
  MAX_CHAR_COUNT,
} from './businessLogic';
import { LyricPool } from './LyricPool';
import { Workarea } from './Workarea';

const STORAGE_KEY = 'lyric-creator-state';

interface AppState {
  fragments: LyricFragment[];
  workareaSlots: WorkareaSlot[];
  versions: Version[];
  songTitle: string;
  activeVersionId: string | null;
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    fragments: [],
    workareaSlots: [],
    versions: [],
    songTitle: '未命名曲目',
    activeVersionId: null,
  };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [inputText, setInputText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const isOverLimit = inputText.length > MAX_CHAR_COUNT;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setInputText(val);
      if (val.length > MAX_CHAR_COUNT && !isShaking) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }
    },
    [isShaking]
  );

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!inputText.trim() || isOverLimit) return;
    const fragment = createFragment(inputText.trim(), selectedTags);
    setState((prev) => ({
      ...prev,
      fragments: [...prev.fragments, fragment],
      activeVersionId: null,
    }));
    setInputText('');
    setSelectedTags([]);
  }, [inputText, selectedTags, isOverLimit]);

  const handleUpdateFragment = useCallback((id: string, newContent: string) => {
    setState((prev) => ({
      ...prev,
      fragments: prev.fragments.map((f) =>
        f.id === id ? updateFragmentContent(f, newContent) : f
      ),
    }));
  }, []);

  const handleDeleteFragment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      fragments: prev.fragments.filter((f) => f.id !== id),
      workareaSlots: prev.workareaSlots.filter((s) => s.fragmentId !== id),
    }));
  }, []);

  const handleAddToWorkarea = useCallback((fragmentId: string) => {
    setState((prev) => {
      const slot = createWorkareaSlot(fragmentId, prev.workareaSlots.length);
      return {
        ...prev,
        workareaSlots: [...prev.workareaSlots, slot],
        activeVersionId: null,
      };
    });
  }, []);

  const handleRemoveFromWorkarea = useCallback((slotId: string) => {
    setState((prev) => ({
      ...prev,
      workareaSlots: prev.workareaSlots
        .filter((s) => s.id !== slotId)
        .map((s, i) => ({ ...s, order: i })),
      activeVersionId: null,
    }));
  }, []);

  const handleReorderSlots = useCallback(
    (fromIndex: number, toIndex: number) => {
      setState((prev) => ({
        ...prev,
        workareaSlots: reorderSlots(prev.workareaSlots, fromIndex, toIndex),
        activeVersionId: null,
      }));
    },
    []
  );

  const handleGenerateDraft = useCallback(() => {
    setState((prev) => {
      if (prev.workareaSlots.length === 0) return prev;
      const version = createVersion(prev.workareaSlots, prev.fragments);
      return {
        ...prev,
        versions: [...prev.versions, version],
        activeVersionId: version.id,
      };
    });
  }, []);

  const handleRestoreVersion = useCallback((versionId: string) => {
    setState((prev) => {
      const version = prev.versions.find((v) => v.id === versionId);
      if (!version) return prev;
      const { slots, restoredFragments } = restoreFromVersion(version);
      const newFragments = [...prev.fragments];
      for (const restored of restoredFragments) {
        const idx = newFragments.findIndex((f) => f.id === restored.id);
        if (idx >= 0) {
          newFragments[idx] = restored;
        } else {
          newFragments.push(restored);
        }
      }
      return {
        ...prev,
        fragments: newFragments,
        workareaSlots: slots,
        activeVersionId: versionId,
      };
    });
  }, []);

  const handleSongTitleChange = useCallback((title: string) => {
    setState((prev) => ({ ...prev, songTitle: title, activeVersionId: null }));
  }, []);

  const totalChars = getTotalCharCount(state.workareaSlots, state.fragments);

  const leftPanel = (
    <div
      style={{
        width: 260,
        minWidth: 260,
        height: '100%',
        background: '#FDFAF3',
        borderRight: '1px solid #E8DFD0',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#2C3E50',
          fontFamily: "'Georgia', 'Noto Serif SC', serif",
          letterSpacing: 1,
        }}
      >
        灵感输入
      </h2>

      <div style={{ position: 'relative' }}>
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="写下一句歌词..."
          className={isShaking ? 'shake-anim' : ''}
          style={{
            width: '100%',
            minHeight: 80,
            padding: 10,
            border: `2px solid ${isOverLimit ? '#FF6B6B' : '#D3C4A5'}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "'Georgia', serif",
            resize: 'vertical',
            outline: 'none',
            background: '#FFFFFF',
            transition: isShaking ? 'none' : 'border-color 0.2s',
            lineHeight: 1.6,
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: isOverLimit ? '#FF6B6B' : '#999',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {inputText.length} / {MAX_CHAR_COUNT}
          {isOverLimit && ' (超出上限)'}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: '#7F8C8D',
            marginBottom: 6,
          }}
        >
          主题标签
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagToggle(tag)}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                background: selectedTags.includes(tag) ? '#5DADE2' : '#E8DFD0',
                color: selectedTags.includes(tag) ? '#FFFFFF' : '#5D6D7E',
                transition: 'all 0.2s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!inputText.trim() || isOverLimit}
        style={{
          padding: '10px 0',
          border: 'none',
          borderRadius: 8,
          background:
            !inputText.trim() || isOverLimit ? '#D3C4A5' : '#2C3E50',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          cursor:
            !inputText.trim() || isOverLimit ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          fontFamily: "'Georgia', serif",
        }}
      >
        添加片段
      </button>

      <div style={{ flex: 1 }} />

      <div
        style={{
          fontSize: 11,
          color: '#B0A090',
          textAlign: 'center',
          paddingTop: 8,
          borderTop: '1px solid #E8DFD0',
        }}
      >
        共 {state.fragments.length} 个片段
      </div>
    </div>
  );

  const versionHistoryPanel = (
    <div
      style={{
        borderTop: '1px solid #E8DFD0',
        flex: '0 0 auto',
        maxHeight: '40%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '12px 16px 8px',
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#2C3E50',
            fontFamily: "'Georgia', serif",
          }}
        >
          版本历史
        </h3>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {state.versions.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#B0A090',
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            暂无版本
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div
              style={{
                position: 'absolute',
                left: 5,
                top: 0,
                bottom: 0,
                width: 2,
                background: '#D3C4A5',
              }}
            />
            {[...state.versions].reverse().map((v) => (
              <div
                key={v.id}
                onClick={() => handleRestoreVersion(v.id)}
                style={{
                  position: 'relative',
                  marginBottom: 16,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: -20,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#5B2C6F',
                    border: '2px solid #FDFAF3',
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: '#2C3E50',
                    fontWeight:
                      state.activeVersionId === v.id ? 700 : 400,
                    background:
                      state.activeVersionId === v.id
                        ? '#F9E79F'
                        : 'transparent',
                    padding: '2px 6px',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}
                >
                  {v.name}
                </div>
                {state.activeVersionId === v.id && (
                  <div
                    style={{
                      fontSize: 10,
                      color: '#B7950B',
                      marginTop: 2,
                      background: '#F9E79F',
                      padding: '1px 6px',
                      borderRadius: 3,
                      display: 'inline-block',
                    }}
                  >
                    历史版本
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#B0A090', marginTop: 2 }}>
                  {v.slots.length} 个片段
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const rightPanel = (
    <div
      style={{
        width: 260,
        minWidth: 260,
        height: '100%',
        background: '#FDFAF3',
        borderLeft: '1px solid #E8DFD0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <LyricPool
        fragments={state.fragments}
        onUpdateFragment={handleUpdateFragment}
        onDeleteFragment={handleDeleteFragment}
        onAddToWorkarea={handleAddToWorkarea}
      />
      {versionHistoryPanel}
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#F5F0E1',
        position: 'relative',
      }}
    >
      {isMobile && (
        <>
          <button
            onClick={() => {
              setLeftPanelOpen(!leftPanelOpen);
              setRightPanelOpen(false);
            }}
            style={{
              position: 'fixed',
              left: 8,
              top: 8,
              zIndex: 1000,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: '#8E44AD',
              color: '#FFFFFF',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            &#9776;
          </button>
          <button
            onClick={() => {
              setRightPanelOpen(!rightPanelOpen);
              setLeftPanelOpen(false);
            }}
            style={{
              position: 'fixed',
              right: 8,
              top: 8,
              zIndex: 1000,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: '#8E44AD',
              color: '#FFFFFF',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            &#9835;
          </button>
        </>
      )}

      <div
        style={
          isMobile
            ? {
                position: 'fixed',
                left: leftPanelOpen ? 0 : -260,
                top: 0,
                zIndex: 999,
                height: '100%',
                transition: 'left 0.3s ease',
                boxShadow: leftPanelOpen
                  ? '4px 0 16px rgba(0,0,0,0.15)'
                  : 'none',
              }
            : {}
        }
      >
        {leftPanel}
      </div>

      <Workarea
        slots={state.workareaSlots}
        fragments={state.fragments}
        songTitle={state.songTitle}
        totalChars={totalChars}
        onSongTitleChange={handleSongTitleChange}
        onRemoveSlot={handleRemoveFromWorkarea}
        onReorderSlots={handleReorderSlots}
        onGenerateDraft={handleGenerateDraft}
        onUpdateFragment={handleUpdateFragment}
        onAddToWorkarea={handleAddToWorkarea}
      />

      <div
        style={
          isMobile
            ? {
                position: 'fixed',
                right: rightPanelOpen ? 0 : -260,
                top: 0,
                zIndex: 999,
                height: '100%',
                transition: 'right 0.3s ease',
                boxShadow: rightPanelOpen
                  ? '-4px 0 16px rgba(0,0,0,0.15)'
                  : 'none',
              }
            : {}
        }
      >
        {rightPanel}
      </div>
    </div>
  );
}
