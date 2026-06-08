import { useStore } from '@/store'
import { poems } from '@/utils/poems'

export default function PoemDisplay() {
  const { activeWord, selectedPoemId, inputText, keywords } = useStore()

  const poem = selectedPoemId ? poems.find(p => p.id === selectedPoemId) : null

  const displayLines = poem
    ? poem.lines
    : inputText
        .split(/[。！？\n]/)
        .map(l => l.trim())
        .filter(Boolean)

  const relevantKeywords = activeWord
    ? keywords.filter(k => k.word === activeWord)
    : keywords.slice(0, 5)

  if (displayLines.length === 0 && !activeWord) {
    return (
      <div id="poem-display" className="flex min-h-[200px] items-center justify-center py-8">
        <p className="font-serif text-sm text-amber-400/40">点击词云中的词条查看相关诗句</p>
      </div>
    )
  }

  const highlightWord = (line: string, word: string | null) => {
    if (!word) return line
    const parts = line.split(word)
    if (parts.length === 1) return line
    return parts.reduce((acc: (string | JSX.Element)[], part, i) => {
      acc.push(part)
      if (i < parts.length - 1) {
        acc.push(
          <span key={i} className="rounded bg-amber-200/60 px-0.5 font-bold text-amber-900">
            {word}
          </span>,
        )
      }
      return acc
    }, [])
  }

  return (
    <div id="poem-display" className="py-4">
      {poem && (
        <div className="mb-4">
          <h3 className="font-serif text-lg font-bold text-amber-900">{poem.title}</h3>
          <p className="font-serif text-sm text-amber-700/70">
            〔{poem.dynasty}〕{poem.author}
          </p>
        </div>
      )}

      {activeWord && (
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-amber-100/60 px-3 py-1 font-serif text-sm font-medium text-amber-800">
            「{activeWord}」
          </span>
          <span className="text-xs text-amber-600/60">相关诗句</span>
        </div>
      )}

      <div className="space-y-2">
        {displayLines.map((line, i) => {
          const containsActiveWord = activeWord && line.includes(activeWord)
          return (
            <div
              key={i}
              className="rounded-lg border border-amber-100/30 px-4 py-2.5 transition-all"
              style={{
                background: containsActiveWord
                  ? 'rgba(255, 248, 225, 0.6)'
                  : 'rgba(255, 252, 245, 0.4)',
                boxShadow: containsActiveWord
                  ? '0 2px 12px rgba(184, 134, 11, 0.1)'
                  : 'none',
              }}
            >
              <p className="font-serif text-base leading-relaxed text-gray-700">
                {highlightWord(line, activeWord)}
              </p>
              {poem && !selectedPoemId && (
                <p className="mt-1 text-xs text-amber-600/50">
                  —— {poem.author}《{poem.title}》
                </p>
              )}
            </div>
          )
        })}
      </div>

      {!activeWord && relevantKeywords.length > 0 && (
        <div className="mt-4 border-t border-amber-100/30 pt-4">
          <p className="mb-2 text-xs text-amber-600/60">关键词</p>
          <div className="flex flex-wrap gap-1.5">
            {relevantKeywords.map(kw => (
              <span
                key={kw.word}
                className="rounded-full bg-amber-50/60 px-2.5 py-1 font-serif text-xs text-amber-700"
              >
                {kw.word}
                <span className="ml-1 text-amber-500/50">×{kw.frequency}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
