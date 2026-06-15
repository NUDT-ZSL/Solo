import { useState } from 'react'
import { addBook } from '../api'
import type { BookInput } from '../types'

const categories = ['文学', '科普', '少儿', '历史', '其他']

const initialForm: BookInput = {
  title: '',
  author: '',
  isbn: '',
  category: '文学',
  donor: '',
  入库Date: new Date().toISOString().split('T')[0],
}

export default function AdminPage() {
  const [form, setForm] = useState<BookInput>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof BookInput, string>>>({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BookInput, string>> = {}
    if (!form.title.trim()) newErrors.title = '书名不能为空'
    if (!form.author.trim()) newErrors.author = '作者不能为空'
    if (!form.isbn.trim()) {
      newErrors.isbn = 'ISBN不能为空'
    } else if (!/^\d{13}$/.test(form.isbn)) {
      newErrors.isbn = 'ISBN格式必须为13位数字'
    }
    if (!form.category) newErrors.category = '请选择分类'
    if (!form.donor.trim()) newErrors.donor = '捐赠人不能为空'
    if (!form.入库Date) newErrors.入库Date = '请选择入库日期'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await addBook(form)
      showMsg('图书录入成功！')
      setForm(initialForm)
      setErrors({})
    } catch (err: any) {
      showMsg(err.message || '录入失败', 'error')
    }
  }

  const handleChange = (field: keyof BookInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const fieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: `1px solid ${hasError ? '#ef4444' : '#d6d3d1'}`,
    fontSize: '15px',
    outline: 'none',
    backgroundColor: 'white',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#78350f', marginBottom: '24px' }}>
        图书录入
      </h1>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            backgroundColor: messageType === 'success' ? '#dcfce7' : '#fee2e2',
            color: messageType === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          maxWidth: '600px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {([
            { key: 'title', label: '书名 *', type: 'text', placeholder: '请输入书名' },
            { key: 'author', label: '作者 *', type: 'text', placeholder: '请输入作者' },
            { key: 'isbn', label: 'ISBN *（13位数字）', type: 'text', placeholder: '例如：9787506365437' },
            { key: 'donor', label: '捐赠人 *', type: 'text', placeholder: '请输入捐赠人姓名' },
          ] as const).map((field) => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.type}
                value={form[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={fieldStyle(!!errors[field.key])}
              />
              {errors[field.key] && (
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                  {errors[field.key]}
                </div>
              )}
            </div>
          ))}

          <div>
            <label style={labelStyle}>分类 *</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              style={fieldStyle(!!errors.category)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                {errors.category}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>入库日期 *</label>
            <input
              type="date"
              value={form.入库Date}
              onChange={(e) => handleChange('入库Date', e.target.value)}
              style={fieldStyle(!!errors.入库Date)}
            />
            {errors.入库Date && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                {errors.入库Date}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#c2410c',
              color: 'white',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9a3412')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
          >
            提交录入
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#44403c',
}
