import { useState, useRef, useCallback } from 'react'
import { Step } from '../services/api'
import { v4 as uuidv4 } from 'uuid'

interface StepEditorProps {
  steps: Step[]
  onChange: (steps: Step[]) => void
}

export default function StepEditor({ steps, onChange }: StepEditorProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const dragStartPos = useRef({ x: 0, y: 0 })

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    const rect = e.currentTarget.getBoundingClientRect()
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
    setDragPosition({ x: e.clientX, y: e.clientY })
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newSteps = [...steps]
      const [removed] = newSteps.splice(draggedIndex, 1)
      newSteps.splice(dragOverIndex, 0, removed)
      onChange(newSteps)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleStepClick = (index: number) => {
    setCurrentStep(index)
  }

  const toggleComplete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const stepId = steps[index].id
    const newCompleted = new Set(completedSteps)
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId)
    } else {
      newCompleted.add(stepId)
    }
    setCompletedSteps(newCompleted)
  }

  const updateStepText = (index: number, text: string) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], text }
    onChange(newSteps)
  }

  const updateStepImage = (index: number, image: string) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], image }
    onChange(newSteps)
  }

  const addStep = () => {
    const newStep: Step = {
      id: uuidv4(),
      text: '',
      image: undefined
    }
    onChange([...steps, newStep])
  }

  const removeStep = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (steps.length <= 1) return
    const newSteps = steps.filter((_, i) => i !== index)
    onChange(newSteps)
    if (currentStep >= newSteps.length) {
      setCurrentStep(newSteps.length - 1)
    }
  }

  return (
    <div className="step-editor">
      <div className="step-editor-header">
        <h3>烹饪步骤</h3>
        <button className="btn-add-step" onClick={addStep}>
          + 添加步骤
        </button>
      </div>
      <div className="steps-container">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id)
          const isCurrent = currentStep === index
          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index && draggedIndex !== index

          return (
            <div
              key={step.id}
              className={`step-item ${isCompleted ? 'completed' : ''} ${
                isCurrent ? 'current' : ''
              } ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleStepClick(index)}
            >
              <div className="step-indicator">
                {isCompleted ? (
                  <button
                    className="step-check completed-check"
                    onClick={(e) => toggleComplete(index, e)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                ) : (
                  <button
                    className={`step-dot ${isCurrent ? 'active' : ''}`}
                    onClick={(e) => toggleComplete(index, e)}
                  ></button>
                )}
                {index < steps.length - 1 && (
                  <div className={`step-line ${isCompleted ? 'completed-line' : ''}`}></div>
                )}
              </div>

              <div className="step-content">
                <div className="step-number">步骤 {index + 1}</div>
                <textarea
                  className="step-textarea"
                  value={step.text}
                  onChange={(e) => updateStepText(index, e.target.value)}
                  placeholder="描述这一步的操作..."
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="step-image-section" onClick={(e) => e.stopPropagation()}>
                  {step.image ? (
                    <div className="step-image-preview">
                      <img src={step.image} alt={`步骤${index + 1}`} />
                      <button
                        className="step-image-remove"
                        onClick={() => updateStepImage(index, '')}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="step-image-upload">
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              updateStepImage(index, ev.target?.result as string)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                      <span>+ 添加图片</span>
                    </label>
                  )}
                </div>
                <div className="step-actions">
                  <button
                    className="step-delete-btn"
                    onClick={(e) => removeStep(index, e)}
                    title="删除步骤"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {draggedIndex !== null && (
        <div
          className="drag-preview"
          style={{
            left: dragPosition.x - dragStartPos.current.x,
            top: dragPosition.y - dragStartPos.current.y
          }}
        >
          <div className="drag-preview-content">
            {steps[draggedIndex]?.text || '步骤'}
          </div>
        </div>
      )}
    </div>
  )
}
