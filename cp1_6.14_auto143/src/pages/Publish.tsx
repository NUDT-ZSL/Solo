import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, ImagePlus } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { createRecipe, uploadImage } from '@/http'
import type { CuisineType } from '@/types'
import { cn } from '@/lib/utils'

const CUISINE_OPTIONS: { value: CuisineType; label: string }[] = [
  { value: 'chinese', label: '中餐' },
  { value: 'western', label: '西餐' },
  { value: 'japanese', label: '日料' },
  { value: 'korean', label: '韩餐' },
]

export default function Publish() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState('')
  const [cuisine, setCuisine] = useState<CuisineType | ''>('')
  const [coverImage, setCoverImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [ingredients, setIngredients] = useState<{ name: string; isMain: boolean }[]>([])
  const [newIngredient, setNewIngredient] = useState('')
  const [newIngredientMain, setNewIngredientMain] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const res = await uploadImage(file)
      setCoverImage(res.url)
    } catch (err) {
      console.error('上传失败:', err)
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const addIngredient = () => {
    const trimmed = newIngredient.trim()
    if (!trimmed) return
    if (ingredients.some((i) => i.name === trimmed)) return
    setIngredients([...ingredients, { name: trimmed, isMain: newIngredientMain }])
    setNewIngredient('')
  }

  const removeIngredient = (name: string) => {
    setIngredients(ingredients.filter((i) => i.name !== name))
  }

  const handleIngredientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addIngredient()
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !steps.trim() || !cuisine || ingredients.length === 0) {
      alert('请填写完整信息')
      return
    }
    setSubmitting(true)
    try {
      await createRecipe({
        title: title.trim(),
        steps: steps.trim(),
        coverImage: coverImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800',
        cuisine,
        ingredients,
      })
      navigate('/')
    } catch (err) {
      console.error('发布失败:', err)
      alert('发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const coverPreviewStyle: React.CSSProperties = coverImage
    ? {
        width: '400px',
        height: '250px',
        borderRadius: '12px',
        border: 'none',
        background: 'transparent',
        maxWidth: '100%',
      }
    : {
        width: '400px',
        height: '250px',
        borderRadius: '12px',
        borderWidth: '2px',
        borderStyle: 'dashed',
        borderColor: dragOver ? '#f59e0b' : '#64748b',
        background: dragOver ? 'rgba(245, 158, 11, 0.05)' : '#1e293b',
        maxWidth: '100%',
      }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px',
        }}
      >
        <h1 className="text-3xl font-bold text-textMain mb-8">发布菜谱</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              菜谱标题 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                placeholder="给菜谱起个名字..."
                className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] bg-white text-sm outline-none transition-colors focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20"
                maxLength={30}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-textSecondary">
                {title.length}/30
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              制作步骤 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="写下制作步骤，每步一行..."
              rows={6}
              className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] bg-white text-sm outline-none transition-colors focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 resize-y min-h-[120px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              封面图片
            </label>
            <div
              className={cn(
                'relative cursor-pointer overflow-hidden transition-colors',
                dragOver && 'bg-[#f59e0b]/5',
                !coverImage && 'flex flex-col items-center justify-center'
              )}
              style={coverPreviewStyle}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="封面预览"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: '12px' }}
                />
              ) : uploading ? (
                <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                  <Upload size={32} className="animate-pulse mb-2" />
                  <span className="text-sm">上传中...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                  <ImagePlus size={36} className="mb-2" />
                  <span className="text-sm">拖拽或点击上传封面</span>
                  <span className="text-xs mt-1 text-gray-500">建议尺寸 800x500</span>
                </div>
              )}
              {coverImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCoverImage('')
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              菜系 <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {CUISINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCuisine(cuisine === opt.value ? '' : opt.value)}
                  className={cn(
                    'px-5 py-2.5 text-sm font-medium transition-all btn-hover',
                    cuisine === opt.value
                      ? 'bg-[#f59e0b] text-white shadow-md'
                      : 'bg-[#334155] text-white hover:bg-[#475569]'
                  )}
                  style={{ borderRadius: '8px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              食材 <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={handleIngredientKeyDown}
                placeholder="输入食材名称..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm outline-none transition-colors focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20"
              />
              <label className="flex items-center gap-1.5 text-sm text-textSecondary whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIngredientMain}
                  onChange={(e) => setNewIngredientMain(e.target.checked)}
                  className="accent-[#f59e0b]"
                />
                主料
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="px-4 py-2.5 rounded-lg bg-[#f59e0b] text-white text-sm font-medium btn-hover"
              >
                添加
              </button>
            </div>
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing) => (
                  <span
                    key={ing.name}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                      ing.isMain
                        ? 'bg-[#fef3c7] text-[#b45309]'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {ing.isMain && <span className="text-xs">★</span>}
                    {ing.name}
                    <button
                      type="button"
                      onClick={() => removeIngredient(ing.name)}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                'w-full py-3 text-white font-semibold text-base transition-all btn-hover',
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#f59e0b] hover:bg-[#d97706]'
              )}
              style={{ borderRadius: '12px', padding: '12px 32px' }}
            >
              {submitting ? '发布中...' : '发布菜谱'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
