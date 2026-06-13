import React, { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入做法步骤...',
  readOnly = false,
  minHeight = 300
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const isInternalChange = useRef(false)

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return

    const container = containerRef.current
    const editorDiv = document.createElement('div')
    container.appendChild(editorDiv)

    const toolbarOptions = [
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'header': [1, 2, 3, false] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ]

    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder,
      readOnly,
      modules: {
        toolbar: {
          container: toolbarOptions,
          handlers: {
            image: function () {
              const input = document.createElement('input')
              input.setAttribute('type', 'file')
              input.setAttribute('accept', 'image/*')
              input.click()

              input.onchange = async function () {
                const file = input.files ? input.files[0] : null
                if (!file) return

                const validation = await import('../../utils/imageCompressor')
                const check = validation.validateImageFile(file)
                if (!check.valid) {
                  alert(check.message)
                  return
                }

                const result = await validation.compressImage(file, {
                  maxWidth: 1200,
                  maxHeight: 900,
                  maxSizeKB: 300
                })

                const range = quill.getSelection(true)
                quill.insertEmbed(range.index, 'image', result.dataUrl)
                quill.setSelection(range.index + 1)
              }
            }
          }
        }
      }
    })

    quill.root.innerHTML = value || ''
    quillRef.current = quill

    quill.on('text-change', () => {
      isInternalChange.current = true
      onChange(quill.root.innerHTML)
      isInternalChange.current = false
    })

    return () => {
      if (container && editorDiv.parentNode === container) {
        container.removeChild(editorDiv)
      }
      quillRef.current = null
    }
  }, [])

  useEffect(() => {
    if (quillRef.current && !isInternalChange.current) {
      const currentHtml = quillRef.current.root.innerHTML
      if (currentHtml !== value) {
        quillRef.current.root.innerHTML = value || ''
      }
    }
  }, [value])

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          minHeight,
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}
      />
      <style>{`
        .ql-container {
          min-height: ${minHeight - 42}px;
          font-size: 14px;
          font-family: inherit;
        }
        .ql-editor {
          min-height: ${minHeight - 42}px;
          line-height: 1.7;
        }
        .ql-editor h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 16px 0 8px;
        }
        .ql-editor h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 14px 0 7px;
        }
        .ql-editor h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 12px 0 6px;
        }
        .ql-editor ol, .ql-editor ul {
          padding-left: 1.5em;
          margin: 8px 0;
        }
        .ql-editor li {
          margin: 4px 0;
        }
        .ql-editor img {
          max-width: 100%;
          border-radius: 8px;
          margin: 12px 0;
        }
        .ql-toolbar {
          background: #fafafa;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px;
        }
        .ql-toolbar .ql-picker-label:hover,
        .ql-toolbar .ql-picker-item:hover {
          color: #f59e0b;
        }
        .ql-toolbar .ql-picker.ql-expanded .ql-picker-options {
          border-color: #e5e7eb;
        }
        .ql-toolbar button:hover,
        .ql-toolbar button.ql-active {
          color: #f59e0b;
        }
        .ql-toolbar button:hover .ql-fill,
        .ql-toolbar button.ql-active .ql-fill {
          fill: #f59e0b;
        }
        .ql-toolbar button:hover .ql-stroke,
        .ql-toolbar button.ql-active .ql-stroke {
          stroke: #f59e0b;
        }
        .ql-container.ql-snow {
          border: none;
        }
        @media (max-width: 768px) {
          .ql-toolbar {
            padding: 4px;
          }
          .ql-toolbar .ql-formats {
            margin-right: 4px;
          }
        }
      `}</style>
    </div>
  )
}

export default RichTextEditor
