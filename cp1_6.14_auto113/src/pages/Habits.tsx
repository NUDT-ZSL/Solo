import { useStore, type Habit } from '@/store'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'

const tagOptions: Array<{ value: Habit['tag']; label: string; color: string }> = [
  { value: 'health', label: '健康', color: '#00b894' },
  { value: 'study', label: '学习', color: '#6c5ce7' },
  { value: 'creative', label: '创作', color: '#fdcb6e' },
  { value: 'life', label: '生活', color: '#74b9ff' },
]

interface FormState {
  name: string
  tag: Habit['tag']
  dailyGoal: number
}

export default function Habits() {
  const { habits, fetchHabits, addHabit, updateHabit, deleteHabit } = useStore()
  const [form, setForm] = useState<FormState>({ name: '', tag: 'health', dailyGoal: 1 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ name: '', tag: 'health', dailyGoal: 1 })

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    await addHabit(form)
    setForm({ name: '', tag: 'health', dailyGoal: 1 })
  }

  const handleStartEdit = (habit: Habit) => {
    setEditingId(habit.id)
    setEditForm({ name: habit.name, tag: habit.tag, dailyGoal: habit.dailyGoal })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return
    await updateHabit(editingId, editForm)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteHabit(id)
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#6c5ce7] to-[#00b894]" />
        习惯配置
      </h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">添加新习惯</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-500 mb-1 block">名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="输入习惯名称"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">标签</label>
            <select
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value as Habit['tag'] })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#6c5ce7] transition-colors"
            >
              {tagOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="text-xs text-gray-500 mb-1 block">每日目标</label>
            <input
              type="number"
              min={1}
              value={form.dailyGoal}
              onChange={(e) => setForm({ ...form, dailyGoal: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#6c5ce7] transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 transition-all hover:shadow-md active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6c5ce7, #00b894)' }}
          >
            <Plus size={14} />
            添加
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {habits.map((habit) => {
          const tagOpt = tagOptions.find((t) => t.value === habit.tag)
          const isEditing = editingId === habit.id

          return (
            <div
              key={habit.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md"
            >
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#6c5ce7]"
                  />
                  <select
                    value={editForm.tag}
                    onChange={(e) => setEditForm({ ...editForm, tag: e.target.value as Habit['tag'] })}
                    className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  >
                    {tagOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={editForm.dailyGoal}
                    onChange={(e) => setEditForm({ ...editForm, dailyGoal: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#00b894' }}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ background: tagOpt?.color || '#74b9ff' }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{habit.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {tagOpt?.label} · 每日目标 {habit.dailyGoal}次
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartEdit(habit)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Pencil size={14} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(habit.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} className="text-red-300 hover:text-red-500" />
                  </button>
                </>
              )}
            </div>
          )
        })}

        {habits.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            还没有习惯，添加你的第一个习惯吧！
          </div>
        )}
      </div>
    </div>
  )
}
