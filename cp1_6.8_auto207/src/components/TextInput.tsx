import { useState, useCallback } from 'react'
import { useStore } from '@/store'
import { poems } from '@/utils/poems'

export default function TextInput() {
  const { inputText, setInputText, setSelectedPoemId } = useStore()
  const [localText, setLocalText] = useState(inputText)

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalText(e.target.value)
      setInputText(e.target.value)
      setSelectedPoemId(null)
    },
    [setInputText, setSelectedPoemId],
  )

  const handlePoemSelect = useCallback(
    (poemId: string) => {
      const poem = poems.find(p => p.id === poemId)
      if (poem) {
        setLocalText(poem.fullText)
        setInputText(poem.fullText)
        setSelectedPoemId(poemId)
      }
    },
    [setInputText, setSelectedPoemId],
  )

  return (
    <div className="w-full">
      <div
        className="mb-4 rounded-xl border border-amber-200/50 p-4"
        style={{
          background: 'rgba(255, 252, 245, 0.6)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(184, 134, 11, 0.08)',
        }}
      >
        <label className="mb-2 block font-serif text-sm font-medium text-amber-900">
          输入文本
        </label>
        <textarea
          value={localText}
          onChange={handleTextChange}
          placeholder="在此输入诗词或任意中文文本..."
          className="h-24 w-full resize-none rounded-lg border border-amber-200/40 bg-white/60 p-3 font-serif text-sm leading-relaxed text-gray-800 outline-none transition-all focus:border-amber-400/60 focus:shadow-[0_0_0_3px_rgba(184,134,11,0.1)]"
        />
      </div>

      <div
        className="rounded-xl border border-amber-200/50 p-4"
        style={{
          background: 'rgba(255, 252, 245, 0.6)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(184, 134, 11, 0.08)',
        }}
      >
        <p className="mb-3 font-serif text-sm font-medium text-amber-900">预设诗词</p>
        <div className="flex flex-wrap gap-2">
          {poems.map(poem => (
            <button
              key={poem.id}
              onClick={() => handlePoemSelect(poem.id)}
              className="group rounded-lg border border-amber-200/40 px-3 py-1.5 font-serif text-sm text-amber-800 transition-all hover:border-amber-400/60 hover:bg-amber-50/80 hover:shadow-[0_2px_8px_rgba(184,134,11,0.12)] active:scale-95"
              style={{
                background: 'rgba(255, 252, 245, 0.5)',
              }}
            >
              <span className="transition-colors group-hover:text-amber-900">{poem.title}</span>
              <span className="ml-1 text-xs text-amber-600/60 transition-colors group-hover:text-amber-700/80">
                {poem.author}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
