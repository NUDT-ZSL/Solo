import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = ['JavaScript', 'Python', 'HTML', 'CSS', 'TypeScript', 'Java'];

const LANG_ICONS: Record<string, string> = {
  javascript: 'JS',
  python: 'PY',
  html: '<>',
  css: '#',
  typescript: 'TS',
  java: 'JV',
};

type SaveState = 'idle' | 'saving' | 'saved';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; language: string; code: string; tags: string[] }) => void;
}

export default function CreateModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [code, setCode] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [prevLang, setPrevLang] = useState('JavaScript');
  const [iconKey, setIconKey] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setLanguage('JavaScript');
      setCode('');
      setTagsInput('');
      setSaveState('idle');
      setPrevLang('JavaScript');
      setIconKey((k) => k + 1);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrevLang(language);
    setLanguage(e.target.value);
    setIconKey((k) => k + 1);
  };

  const doSave = useCallback(() => {
    if (!title.trim() || !code.trim()) return;
    setSaveState('saving');
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ title: title.trim(), language, code, tags });
    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 800);
    }, 300);
  }, [title, language, code, tagsInput, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave();
      }
      if (e.key === 'Escape') onClose();
    },
    [doSave, onClose]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSave();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={onClose}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#282840',
              borderRadius: 16,
              padding: 32,
              width: '100%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#cdd6f4' }}>创建新片段</h2>
              <AnimatePresence mode="wait">
                {saveState !== 'idle' && (
                  <motion.div
                    key={saveState}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: saveState === 'saving' ? '#f9e2af' : '#a6e3a1',
                    }}
                  >
                    {saveState === 'saving' ? (
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 }}>⟳</span>
                    ) : (
                      <span style={{ color: '#a6e3a1' }}>✓</span>
                    )}
                    {saveState === 'saving' ? '保存中...' : '已保存'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#a6adc8', marginBottom: 6 }}>标题</label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入片段标题..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#1e1e2e',
                    border: '1px solid #45475a',
                    borderRadius: 8,
                    color: '#cdd6f4',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#a6adc8', marginBottom: 6 }}>语言</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select
                    value={language}
                    onChange={handleLanguageChange}
                    style={{
                      padding: '10px 14px',
                      background: '#1e1e2e',
                      border: '1px solid #45475a',
                      borderRadius: 8,
                      color: '#cdd6f4',
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <div style={{ width: 40, height: 40, position: 'relative', overflow: 'hidden' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={iconKey}
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#89b4fa22',
                          borderRadius: 8,
                          color: '#89b4fa',
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'Fira Code, monospace',
                        }}
                      >
                        {LANG_ICONS[language.toLowerCase()] || '?'}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#a6adc8', marginBottom: 6 }}>代码</label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="粘贴或输入代码..."
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#1e1e2e',
                    border: '1px solid #45475a',
                    borderRadius: 8,
                    color: '#cdd6f4',
                    fontSize: 14,
                    fontFamily: 'Fira Code, monospace',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    outline: 'none',
                    minHeight: 150,
                  }}
                />
                <span style={{ fontSize: 11, color: '#6c7086', marginTop: 4 }}>Ctrl+S 快捷保存</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#a6adc8', marginBottom: 6 }}>标签（逗号分隔）</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="算法, 面试, 工具..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#1e1e2e',
                    border: '1px solid #45475a',
                    borderRadius: 8,
                    color: '#cdd6f4',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 24px',
                    background: 'transparent',
                    border: '1px solid #45475a',
                    borderRadius: 8,
                    color: '#a6adc8',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !code.trim()}
                  style={{
                    padding: '10px 24px',
                    background: '#89b4fa',
                    border: 'none',
                    borderRadius: 8,
                    color: '#1e1e2e',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: title.trim() && code.trim() ? 'pointer' : 'not-allowed',
                    opacity: title.trim() && code.trim() ? 1 : 0.5,
                  }}
                >
                  创建片段
                </button>
              </div>
            </form>

            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @media (max-width: 768px) {
                .modal-overlay { padding: 0 !important; }
                .modal-content { max-width: 100% !important; height: 100vh; max-height: 100vh; border-radius: 0 !important; }
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
