import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from './editorStore'

describe('editorStore - 撤销/重做', () => {
  beforeEach(() => {
    useEditorStore.setState({
      shapes: [],
      selectedId: null,
      currentTool: 'select',
      history: [[]],
      historyIndex: 0,
      recentNewId: null,
    })
  })

  it('初始状态：不能撤销也不能重做', () => {
    expect(useEditorStore.getState().canUndo()).toBe(false)
    expect(useEditorStore.getState().canRedo()).toBe(false)
  })

  it('添加图形后可以撤销', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })
    expect(useEditorStore.getState().canUndo()).toBe(true)
    expect(useEditorStore.getState().canRedo()).toBe(false)
  })

  it('撤销后图形被移除', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })
    expect(useEditorStore.getState().shapes).toHaveLength(1)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes).toHaveLength(0)
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('撤销后可以重做', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().canRedo()).toBe(true)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().shapes).toHaveLength(1)
    expect(useEditorStore.getState().shapes[0].x).toBe(10)
    expect(useEditorStore.getState().shapes[0].y).toBe(20)
  })

  it('连续添加多个图形后逐步撤销', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: '#ff0000',
    })
    useEditorStore.getState().addShape({
      type: 'circle',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      rotation: 0,
      fill: '#00ff00',
    })
    useEditorStore.getState().addShape({
      type: 'triangle',
      x: 200,
      y: 200,
      width: 70,
      height: 70,
      rotation: 0,
      fill: '#0000ff',
    })

    expect(useEditorStore.getState().shapes).toHaveLength(3)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes).toHaveLength(2)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes).toHaveLength(1)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes).toHaveLength(0)
  })

  it('新操作后清除重做栈', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: '#ff0000',
    })
    useEditorStore.getState().addShape({
      type: 'circle',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      rotation: 0,
      fill: '#00ff00',
    })

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().canRedo()).toBe(true)

    useEditorStore.getState().addShape({
      type: 'triangle',
      x: 200,
      y: 200,
      width: 70,
      height: 70,
      rotation: 0,
      fill: '#0000ff',
    })
    expect(useEditorStore.getState().canRedo()).toBe(false)
  })

  it('删除图形后可以撤销恢复', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: '#ff0000',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().removeShape(shapeId)
    expect(useEditorStore.getState().shapes).toHaveLength(0)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes).toHaveLength(1)
    expect(useEditorStore.getState().shapes[0].fill).toBe('#ff0000')
  })

  it('修改图形属性后撤销恢复原始值', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().updateShape(shapeId, { x: 200, y: 300 })
    expect(useEditorStore.getState().shapes[0].x).toBe(200)
    expect(useEditorStore.getState().shapes[0].y).toBe(300)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes[0].x).toBe(10)
    expect(useEditorStore.getState().shapes[0].y).toBe(20)
  })

  it('updateShapeWithoutHistory 不记录到历史', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().updateShapeWithoutHistory(shapeId, { x: 200 })
    expect(useEditorStore.getState().shapes[0].x).toBe(200)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes).toHaveLength(0)
  })

  it('commitHistory 将当前状态记录到历史', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().updateShapeWithoutHistory(shapeId, { x: 200 })
    useEditorStore.getState().commitHistory()

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes[0].x).toBe(10)
  })

  it('commitHistory 不重复记录相同状态', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const historyLenBefore = useEditorStore.getState().history.length

    useEditorStore.getState().commitHistory()

    expect(useEditorStore.getState().history.length).toBe(historyLenBefore)
  })

  it('历史栈最多记录50步', () => {
    for (let i = 0; i < 55; i++) {
      useEditorStore.getState().addShape({
        type: 'rect',
        x: i * 10,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        fill: '#42a5f5',
      })
    }

    expect(useEditorStore.getState().history.length).toBeLessThanOrEqual(51)
  })

  it('旋转角度修改后撤销恢复', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().updateShapeWithoutHistory(shapeId, { rotation: 45 })
    useEditorStore.getState().commitHistory()

    expect(useEditorStore.getState().shapes[0].rotation).toBe(45)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes[0].rotation).toBe(0)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().shapes[0].rotation).toBe(45)
  })

  it('颜色修改后撤销恢复', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().updateShape(shapeId, { fill: '#FF0000' })

    expect(useEditorStore.getState().shapes[0].fill).toBe('#FF0000')

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes[0].fill).toBe('#42a5f5')

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().shapes[0].fill).toBe('#FF0000')
  })

  it('selectedId 在撤销/重做时被重置', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })
    expect(useEditorStore.getState().selectedId).not.toBeNull()

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('setTool 切换工具', () => {
    useEditorStore.getState().setTool('rect')
    expect(useEditorStore.getState().currentTool).toBe('rect')

    useEditorStore.getState().setTool('circle')
    expect(useEditorStore.getState().currentTool).toBe('circle')
  })

  it('selectShape 选择图形', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })
    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().selectShape(null)
    expect(useEditorStore.getState().selectedId).toBeNull()

    useEditorStore.getState().selectShape(shapeId)
    expect(useEditorStore.getState().selectedId).toBe(shapeId)
  })

  it('深拷贝验证：修改历史快照不影响当前状态', () => {
    useEditorStore.getState().addShape({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      fill: '#42a5f5',
    })

    const shapeId = useEditorStore.getState().shapes[0].id

    useEditorStore.getState().updateShape(shapeId, { x: 999, fill: '#ABCDEF' })

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().shapes[0].x).toBe(10)
    expect(useEditorStore.getState().shapes[0].fill).toBe('#42a5f5')

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().shapes[0].x).toBe(999)
    expect(useEditorStore.getState().shapes[0].fill).toBe('#ABCDEF')
  })
})
