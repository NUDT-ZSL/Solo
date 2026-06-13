import React, { useState, useCallback, useRef } from 'react';
import { questionApi, paperApi } from '../api';
import type { Question, Difficulty, QuestionType } from '../types';

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选',
  multiple: '多选',
  fill: '填空',
  essay: '简答',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#2ecc71',
  medium: '#f39c12',
  hard: '#e74c3c',
};

interface QuizEditorProps {
  onPaperCreated: (paperId: string) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ onPaperCreated, onToast }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([]);
  const [filterKp, setFilterKp] = useState('');
  const [filterDiff, setFilterDiff] = useState<Difficulty | ''>('');
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [paperTitle, setPaperTitle] = useState('');
  const [paperDuration, setPaperDuration] = useState(60);
  const [diffRatio, setDiffRatio] = useState({ easy: 3, medium: 4, hard: 3 });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<Partial<Question>[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const [addForm, setAddForm] = useState({
    type: 'single' as QuestionType,
    content: '',
    options: ['', '', '', ''],
    answer: '',
    keywords: [{ word: '', weight: 1 }, { word: '', weight: 1 }, { word: '', weight: 1 }],
    knowledgePoint: '',
    difficulty: 'easy' as Difficulty,
  });

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, string> = {};
      if (filterKp) filter.knowledgePoint = filterKp;
      if (filterDiff) filter.difficulty = filterDiff;
      if (filterType) filter.type = filterType;
      const data = await questionApi.list(filter as any);
      setQuestions(data);
    } catch (e) {
      onToast('加载题目失败', 'error');
    }
    setLoading(false);
  }, [filterKp, filterDiff, filterType, onToast]);

  const loadKnowledgePoints = useCallback(async () => {
    try {
      const kps = await questionApi.getKnowledgePoints();
      setKnowledgePoints(kps);
    } catch {}
  }, []);

  React.useEffect(() => {
    loadQuestions();
    loadKnowledgePoints();
  }, [loadQuestions, loadKnowledgePoints]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([]);

  React.useEffect(() => {
    setOrderedQuestions(selectedQuestions);
  }, [selectedIds]);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const items = [...orderedQuestions];
    const [dragged] = items.splice(dragIdx, 1);
    items.splice(idx, 0, dragged);
    setOrderedQuestions(items);
    setSelectedIds(new Set(items.map((q) => q.id)));
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleGeneratePaper = async () => {
    if (orderedQuestions.length === 0) {
      onToast('请至少选择一道题目', 'error');
      return;
    }
    if (!paperTitle.trim()) {
      onToast('请输入试卷标题', 'error');
      return;
    }
    setLoading(true);
    try {
      const paper = await paperApi.generate({
        title: paperTitle,
        selectedQuestionIds: orderedQuestions.map((q) => q.id),
        duration: paperDuration,
        difficultyRatio: diffRatio,
      });
      onToast(`试卷生成成功！ID: ${paper.id}`, 'success');
      onPaperCreated(paper.id);
    } catch (e) {
      onToast('试卷生成失败', 'error');
    }
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    if (!addForm.content.trim() || !addForm.knowledgePoint.trim()) {
      onToast('请填写题干和知识点', 'error');
      return;
    }
    try {
      const input: any = {
        type: addForm.type,
        content: addForm.content,
        answer: addForm.type === 'multiple' ? addForm.answer.split(',').map((s: string) => s.trim()) : addForm.answer,
        knowledgePoint: addForm.knowledgePoint,
        difficulty: addForm.difficulty,
      };
      if (addForm.type === 'single' || addForm.type === 'multiple') {
        input.options = addForm.options.filter((o) => o.trim());
      }
      if (addForm.type === 'essay') {
        input.keywords = addForm.keywords.filter((k) => k.word.trim());
      }
      await questionApi.create(input);
      onToast('添加成功', 'success');
      setShowAddForm(false);
      loadQuestions();
      loadKnowledgePoints();
      setAddForm({
        type: 'single',
        content: '',
        options: ['', '', '', ''],
        answer: '',
        keywords: [{ word: '', weight: 1 }, { word: '', weight: 1 }, { word: '', weight: 1 }],
        knowledgePoint: '',
        difficulty: 'easy',
      });
    } catch {
      onToast('添加失败', 'error');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await questionApi.delete(id);
      onToast('删除成功', 'success');
      loadQuestions();
    } catch {
      onToast('删除失败', 'error');
    }
  };

  const parseCSV = (text: string): Partial<Question>[] => {
    const lines = text.split('\n').filter((l) => l.trim());
    return lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      const [type, kp, diff, content, optA, optB, optC, optD, answer] = parts;
      const q: Partial<Question> = {
        type: type as QuestionType,
        knowledgePoint: kp,
        difficulty: diff as Difficulty,
        content,
        answer: answer || '',
      };
      if (type === 'single' || type === 'multiple') {
        q.options = [optA, optB, optC, optD].filter((o) => o);
      }
      return q;
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    const validData = csvData.filter((q) => q.type && q.content && q.knowledgePoint && q.difficulty) as Omit<Question, 'id' | 'createdAt'>[];
    if (validData.length === 0) {
      onToast('没有有效数据可导入', 'error');
      return;
    }
    setImportProgress(0);
    try {
      const totalSteps = 20;
      for (let i = 0; i < totalSteps; i++) {
        await new Promise((r) => setTimeout(r, 100));
        setImportProgress(Math.round(((i + 1) / totalSteps) * 100));
      }
      await questionApi.bulkCreate(validData);
      onToast(`成功导入 ${validData.length} 道题目`, 'success');
      setShowCsvPreview(false);
      setCsvData([]);
      setImportProgress(0);
      loadQuestions();
      loadKnowledgePoints();
    } catch {
      onToast('导入失败', 'error');
      setImportProgress(0);
    }
  };

  const renderFilterPanel = () => (
    <div style={{
      width: 320,
      minWidth: 320,
      background: '#2c3e50',
      padding: 20,
      overflowY: 'auto',
      height: 'calc(100vh - 56px)',
      position: 'relative' as const,
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#ecf0f1' }}>题库管理</h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 14, color: '#bdc3c7', display: 'block', marginBottom: 4 }}>知识点</label>
        <select
          value={filterKp}
          onChange={(e) => setFilterKp(e.target.value)}
          style={{
            width: '100%',
            background: '#34495e',
            color: '#ecf0f1',
            border: '2px solid transparent',
            borderRadius: 6,
            padding: 8,
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <option value="">全部知识点</option>
          {knowledgePoints.map((kp) => <option key={kp} value={kp}>{kp}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 14, color: '#bdc3c7', display: 'block', marginBottom: 4 }}>难度</label>
        <select
          value={filterDiff}
          onChange={(e) => setFilterDiff(e.target.value as Difficulty | '')}
          style={{
            width: '100%',
            background: '#34495e',
            color: '#ecf0f1',
            border: '2px solid transparent',
            borderRadius: 6,
            padding: 8,
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <option value="">全部难度</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14, color: '#bdc3c7', display: 'block', marginBottom: 4 }}>题型</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as QuestionType | '')}
          style={{
            width: '100%',
            background: '#34495e',
            color: '#ecf0f1',
            border: '2px solid transparent',
            borderRadius: 6,
            padding: 8,
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <option value="">全部题型</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <button
        onClick={() => setShowAddForm(!showAddForm)}
        style={{
          width: '100%',
          height: 40,
          borderRadius: 8,
          border: 'none',
          background: '#3498db',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
          transition: 'background 0.2s, transform 0.1s',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseOver={(e) => e.currentTarget.style.background = '#2980b9'}
        onMouseOut={(e) => { e.currentTarget.style.background = '#3498db'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        + 添加题目
      </button>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #7f8c8d',
          borderRadius: 8,
          background: isDragOver ? '#bdc3c7' : '#ecf0f1',
          padding: 20,
          textAlign: 'center' as const,
          cursor: 'pointer',
          transition: 'background 0.2s',
          marginBottom: 12,
        }}
      >
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />
        <div style={{ fontSize: 14, color: '#2c3e50' }}>拖拽CSV文件到此处</div>
        <div style={{ fontSize: 12, color: '#7f8c8d', marginTop: 4 }}>或点击选择文件</div>
      </div>

      {showAddForm && (
        <div style={{ background: '#34495e', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#ecf0f1' }}>添加题目</h4>

          <div style={{ marginBottom: 8 }}>
            <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value as QuestionType })} style={{ width: '100%', background: '#2c3e50', color: '#ecf0f1', border: 'none', borderRadius: 6, padding: 8, fontSize: 14 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <textarea
            value={addForm.content}
            onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
            placeholder="题干"
            rows={3}
            style={{ width: '100%', background: '#2c3e50', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 8, resize: 'vertical', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
          />

          {(addForm.type === 'single' || addForm.type === 'multiple') && addForm.options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => {
                const newOpts = [...addForm.options];
                newOpts[i] = e.target.value;
                setAddForm({ ...addForm, options: newOpts });
              }}
              placeholder={`选项${String.fromCharCode(65 + i)}`}
              style={{ width: '100%', background: '#2c3e50', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 6, outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
          ))}

          <input
            value={addForm.answer}
            onChange={(e) => setAddForm({ ...addForm, answer: e.target.value })}
            placeholder={addForm.type === 'multiple' ? '正确答案（逗号分隔，如A,B）' : '正确答案'}
            style={{ width: '100%', background: '#2c3e50', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 8, outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
          />

          {addForm.type === 'essay' && addForm.keywords.map((kw, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                value={kw.word}
                onChange={(e) => {
                  const newKws = [...addForm.keywords];
                  newKws[i] = { ...newKws[i], word: e.target.value };
                  setAddForm({ ...addForm, keywords: newKws });
                }}
                placeholder={`关键词${i + 1}`}
                style={{ flex: 1, background: '#2c3e50', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
              />
              <input
                type="number"
                value={kw.weight}
                onChange={(e) => {
                  const newKws = [...addForm.keywords];
                  newKws[i] = { ...newKws[i], weight: Number(e.target.value) };
                  setAddForm({ ...addForm, keywords: newKws });
                }}
                placeholder="权重"
                style={{ width: 60, background: '#2c3e50', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
              />
            </div>
          ))}

          {addForm.type === 'essay' && addForm.keywords.length < 5 && (
            <button
              onClick={() => setAddForm({ ...addForm, keywords: [...addForm.keywords, { word: '', weight: 1 }] })}
              style={{ background: 'none', border: '1px dashed #7f8c8d', color: '#bdc3c7', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}
            >
              + 添加关键词
            </button>
          )}

          <input
            value={addForm.knowledgePoint}
            onChange={(e) => setAddForm({ ...addForm, knowledgePoint: e.target.value })}
            placeholder="知识点"
            style={{ width: '100%', background: '#2c3e50', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 8, outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
          />

          <select value={addForm.difficulty} onChange={(e) => setAddForm({ ...addForm, difficulty: e.target.value as Difficulty })} style={{ width: '100%', background: '#2c3e50', color: '#ecf0f1', border: 'none', borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 12 }}>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <button
            onClick={handleAddQuestion}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: '#2ecc71',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.1s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={(e) => e.currentTarget.style.background = '#27ae60'}
            onMouseOut={(e) => { e.currentTarget.style.background = '#2ecc71'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            确认添加
          </button>
        </div>
      )}

      {showCsvPreview && (
        <div style={{ background: '#34495e', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#ecf0f1' }}>CSV预览</h4>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#2c3e50' }}>
                  <th style={{ padding: 4, textAlign: 'left', color: '#bdc3c7' }}>题型</th>
                  <th style={{ padding: 4, textAlign: 'left', color: '#bdc3c7' }}>知识点</th>
                  <th style={{ padding: 4, textAlign: 'left', color: '#bdc3c7' }}>难度</th>
                  <th style={{ padding: 4, textAlign: 'left', color: '#bdc3c7' }}>题干</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 10).map((q, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#2c3e50' : '#34495e' }}>
                    <td style={{ padding: 4, color: '#ecf0f1' }}>{q.type}</td>
                    <td style={{ padding: 4, color: '#ecf0f1' }}>{q.knowledgePoint}</td>
                    <td style={{ padding: 4, color: '#ecf0f1' }}>{q.difficulty}</td>
                    <td style={{ padding: 4, color: '#ecf0f1', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importProgress > 0 && (
            <div style={{ background: '#2c3e50', borderRadius: 4, height: 8, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ background: '#3498db', height: '100%', width: `${importProgress}%`, transition: 'width 0.1s' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleConfirmImport}
              disabled={importProgress > 0}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: importProgress > 0 ? '#7f8c8d' : '#2ecc71',
                color: '#fff',
                fontSize: 14,
                cursor: importProgress > 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {importProgress > 0 ? `导入中 ${importProgress}%` : '确认导入'}
            </button>
            <button
              onClick={() => { setShowCsvPreview(false); setCsvData([]); }}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: '1px solid #e74c3c',
                background: 'transparent',
                color: '#e74c3c',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      <div className="sidebar-panel" style={{
        position: 'relative',
        transition: 'transform 0.3s',
      }}>
        {renderFilterPanel()}
      </div>

      {panelOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setPanelOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#00000080',
            zIndex: 998,
          }}
        />
      )}

      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#ecf0f1' }}>题目列表</h2>
          <span style={{ color: '#bdc3c7', fontSize: 14 }}>已选 {selectedIds.size} 题</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#bdc3c7' }}>加载中...</div>
        ) : questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#7f8c8d' }}>暂无题目，请先添加</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {questions.map((q, i) => (
              <div
                key={q.id}
                style={{
                  height: 60,
                  background: selectedIds.has(q.id) ? '#3d566e' : '#34495e',
                  borderRadius: 8,
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  borderLeft: `3px solid ${DIFFICULTY_COLORS[q.difficulty]}`,
                }}
                onMouseEnter={(e) => { if (!selectedIds.has(q.id)) e.currentTarget.style.background = '#3d566e'; }}
                onMouseLeave={(e) => { if (!selectedIds.has(q.id)) e.currentTarget.style.background = '#34495e'; }}
                onClick={() => toggleSelect(q.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 18, height: 18, accentColor: '#3498db', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: DIFFICULTY_COLORS[q.difficulty], fontWeight: 600, minWidth: 40 }}>
                  {DIFFICULTY_LABELS[q.difficulty]}
                </span>
                <span style={{ fontSize: 12, color: '#3498db', minWidth: 40 }}>{TYPE_LABELS[q.type]}</span>
                <span style={{ flex: 1, color: '#ecf0f1', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.content}
                </span>
                <span style={{ fontSize: 12, color: '#bdc3c7' }}>{q.knowledgePoint}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, padding: 4 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {orderedQuestions.length > 0 && (
          <div style={{ marginTop: 32, borderTop: '1px solid #34495e', paddingTop: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ecf0f1', marginBottom: 16 }}>
              已选题目（拖拽排序）
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {orderedQuestions.map((q, i) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  style={{
                    background: dragOverIdx === i ? '#3498db30' : '#2c3e50',
                    borderRadius: 8,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'grab',
                    borderLeft: `3px solid ${DIFFICULTY_COLORS[q.difficulty]}`,
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ color: '#7f8c8d', fontSize: 14, minWidth: 24 }}>☰ {i + 1}</span>
                  <span style={{ fontSize: 12, color: DIFFICULTY_COLORS[q.difficulty], fontWeight: 600 }}>
                    {DIFFICULTY_LABELS[q.difficulty]}
                  </span>
                  <span style={{ flex: 1, color: '#ecf0f1', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.content}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, background: '#2c3e50', borderRadius: 8, padding: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#ecf0f1', marginBottom: 16 }}>生成试卷</h4>

              <div style={{ marginBottom: 12 }}>
                <input
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="试卷标题"
                  style={{ width: '100%', background: '#34495e', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 14, color: '#bdc3c7', display: 'block', marginBottom: 4 }}>
                  考试时长（分钟）
                </label>
                <input
                  type="number"
                  value={paperDuration}
                  onChange={(e) => setPaperDuration(Number(e.target.value))}
                  style={{ width: 120, background: '#34495e', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 8, fontSize: 14, outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, color: '#bdc3c7', display: 'block', marginBottom: 8 }}>
                  难度比例（简单 : 中等 : 困难）
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#2ecc71' }}>简单</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={diffRatio.easy}
                      onChange={(e) => setDiffRatio({ ...diffRatio, easy: Number(e.target.value) })}
                      style={{ width: 60, marginLeft: 4, background: '#34495e', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 6, fontSize: 14, textAlign: 'center', outline: 'none' }}
                    />
                  </div>
                  <span style={{ color: '#7f8c8d' }}>:</span>
                  <div>
                    <span style={{ fontSize: 12, color: '#f39c12' }}>中等</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={diffRatio.medium}
                      onChange={(e) => setDiffRatio({ ...diffRatio, medium: Number(e.target.value) })}
                      style={{ width: 60, marginLeft: 4, background: '#34495e', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 6, fontSize: 14, textAlign: 'center', outline: 'none' }}
                    />
                  </div>
                  <span style={{ color: '#7f8c8d' }}>:</span>
                  <div>
                    <span style={{ fontSize: 12, color: '#e74c3c' }}>困难</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={diffRatio.hard}
                      onChange={(e) => setDiffRatio({ ...diffRatio, hard: Number(e.target.value) })}
                      style={{ width: 60, marginLeft: 4, background: '#34495e', color: '#ecf0f1', border: '2px solid transparent', borderRadius: 6, padding: 6, fontSize: 14, textAlign: 'center', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleGeneratePaper}
                disabled={loading}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  border: 'none',
                  background: loading ? '#7f8c8d' : '#3498db',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, transform 0.1s',
                }}
                onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2980b9')}
                onMouseOut={(e) => { e.currentTarget.style.background = loading ? '#7f8c8d' : '#3498db'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                生成试卷
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
