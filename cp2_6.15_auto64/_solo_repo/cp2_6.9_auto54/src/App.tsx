import { useState, useCallback, useEffect } from 'react'
import WordCloud from './components/WordCloud'
import ControlPanel from './components/ControlPanel'

export interface WordItem {
  text: string
  count: number
  size: number
  x: number
  y: number
  rotate: number
  color: string
  width: number
  height: number
  locked: boolean
}

export type ColorTheme = 'rainbow' | 'warmCool' | 'deepBlue' | 'neon'
export type BgColor = 'white' | 'lightGray' | 'dark' | 'starry'
export type FontFamily = 'SimSun' | 'Microsoft YaHei' | 'Arial' | 'Georgia'

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '这个', '那个', '什么', '怎么', '为什么', '但是', '因为',
  '所以', '如果', '可以', '可能', '应该', '已经', '现在', '然后', '还是', '或者',
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
  'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'if', 'about', 'up',
  'down', 'what', 'which', 'who', 'whom', 's', 't', 'am'
])

const tokenize = (text: string): string[] => {
  const tokens: string[] = []
  const chineseRegex = /[\u4e00-\u9fa5]/
  let i = 0
  while (i < text.length) {
    const char = text[i]
    if (chineseRegex.test(char)) {
      let word = char
      let j = i + 1
      while (j < text.length && j < i + 4 && chineseRegex.test(text[j])) {
        word += text[j]
        j++
      }
      tokens.push(word)
      for (let k = i + 1; k < j; k++) {
        tokens.push(text.slice(i, k + 1))
      }
      i++
    } else if (/[a-zA-Z]/.test(char)) {
      let word = ''
      while (i < text.length && /[a-zA-Z]/.test(text[i])) {
        word += text[i]
        i++
      }
      if (word.length > 1) {
        tokens.push(word.toLowerCase())
      }
    } else {
      i++
    }
  }
  return tokens
}

const countWords = (text: string): Map<string, number> => {
  const tokens = tokenize(text)
  const counts = new Map<string, number>()
  for (const token of tokens) {
    const t = token.trim().toLowerCase()
    if (t.length < 2 || STOP_WORDS.has(t)) continue
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  return counts
}

function App() {
  const [text, setText] = useState('')
  const [words, setWords] = useState<WordItem[]>([])
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null)
  const [fontFamily, setFontFamily] = useState<FontFamily>('Microsoft YaHei')
  const [colorTheme, setColorTheme] = useState<ColorTheme>('rainbow')
  const [bgColor, setBgColor] = useState<BgColor>('lightGray')
  const [wordSpacing, setWordSpacing] = useState(5)
  const [scale, setScale] = useState(1)

  const generateWordCloud = useCallback(() => {
    if (!text.trim()) return
    const counts = countWords(text.slice(0, 500))
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
    if (sorted.length === 0) return

    const maxCount = sorted[0][1]
    const minCount = sorted[sorted.length - 1][1]
    const minSize = 14
    const maxSize = 72

    const result: WordItem[] = sorted.map(([word, count], index) => {
      const normalized = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount)
      const size = Math.round(minSize + normalized * (maxSize - minSize))
      return {
        text: word,
        count,
        size,
        x: 0,
        y: 0,
        rotate: Math.random() > 0.7 ? (Math.random() > 0.5 ? 90 : -90) : 0,
        color: '',
        width: 0,
        height: 0,
        locked: false
      }
    })
    setWords(result)
    setSelectedWord(null)
  }, [text])

  const updateWordPosition = useCallback((index: number, x: number, y: number) => {
    setWords(prev => {
      const newWords = [...prev]
      newWords[index] = { ...newWords[index], x, y }
      return newWords
    })
  }, [])

  const updateWordColor = useCallback((index: number, color: string) => {
    setWords(prev => {
      const newWords = [...prev]
      newWords[index] = { ...newWords[index], color }
      return newWords
    })
  }, [])

  const updateWordSize = useCallback((index: number, width: number, height: number) => {
    setWords(prev => {
      const newWords = [...prev]
      newWords[index] = { ...newWords[index], width, height }
      return newWords
    })
  }, [])

  const toggleWordLock = useCallback((index: number) => {
    setWords(prev => {
      const newWords = [...prev]
      newWords[index] = { ...newWords[index], locked: !newWords[index].locked }
      return newWords
    })
    if (selectedWord) {
      setSelectedWord(prev => prev ? { ...prev, locked: !prev.locked } : null)
    }
  }, [selectedWord])

  const handleSelectWord = useCallback((word: WordItem) => {
    setSelectedWord(word)
  }, [])

  useEffect(() => {
    if (selectedWord) {
      const updated = words.find(w => w.text === selectedWord.text)
      if (updated && (updated.x !== selectedWord.x || updated.y !== selectedWord.y || updated.locked !== selectedWord.locked)) {
        setSelectedWord(updated)
      }
    }
  }, [words, selectedWord])

  return (
    <div style={styles.appContainer}>
      <div style={styles.header}>
        <h1 style={styles.title}>交互式词云生成器</h1>
      </div>
      <div className="main-layout" style={styles.mainLayout}>
        <div className="canvas-section" style={styles.canvasSection}>
          <WordCloud
            words={words}
            selectedWord={selectedWord}
            fontFamily={fontFamily}
            colorTheme={colorTheme}
            bgColor={bgColor}
            wordSpacing={wordSpacing}
            scale={scale}
            setScale={setScale}
            onSelectWord={handleSelectWord}
            onUpdatePosition={updateWordPosition}
            onUpdateColor={updateWordColor}
            onUpdateSize={updateWordSize}
          />
        </div>
        <div className="control-section" style={styles.controlSection}>
          <ControlPanel
            text={text}
            setText={setText}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            colorTheme={colorTheme}
            setColorTheme={setColorTheme}
            bgColor={bgColor}
            setBgColor={setBgColor}
            wordSpacing={wordSpacing}
            setWordSpacing={setWordSpacing}
            selectedWord={selectedWord}
            onGenerate={generateWordCloud}
            onToggleLock={() => {
              if (selectedWord) {
                const idx = words.findIndex(w => w.text === selectedWord.text)
                if (idx !== -1) toggleWordLock(idx)
              }
            }}
            onExportPNG={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#2c3e50',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    color: '#ecf0f1',
    fontSize: '28px',
    fontWeight: 600,
    textAlign: 'center',
  },
  mainLayout: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  canvasSection: {
    display: 'flex',
    justifyContent: 'center',
    minWidth: 0,
  },
  controlSection: {
    minWidth: 0,
  },
}

export default App
