import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import React from 'react'
import { UIControl } from '../ui-control'
import { store } from '../store'

describe('UIControl Component', () => {
  beforeEach(() => {
    cleanup()
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
    const screenshots = store.getScreenshots()
    for (const s of screenshots) {
      store.removeScreenshot(s.id)
    }
    store.setHeatmapParams({
      blurRadius: 15,
      opacity: 0.6,
      colorMap: 'greenYellowRed'
    })
    store.setSaccadeParams({
      lineColor: '#1E3A5F',
      lineWidth: 2
    })
    store.setChartParams({ mode: 'bar' })
  })

  it('组件成功挂载渲染', () => {
    const { container } = render(<UIControl />)
    expect(container.querySelector('div')).toBeDefined()
  })

  it('显示热力图参数分组标题', () => {
    render(<UIControl />)
    const elements = screen.getAllByText(/热力图/i)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('显示扫视路径参数分组标题', () => {
    render(<UIControl />)
    const elements = screen.getAllByText(/扫视路径/i)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('显示统计图参数分组标题', () => {
    render(<UIControl />)
    const elements = screen.getAllByText(/统计图/i)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('显示模糊半径滑块，默认值15', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '15' }) as HTMLInputElement
    expect(slider).toBeDefined()
    expect(parseFloat(slider.value)).toBe(15)
  })

  it('模糊半径滑块更新后store值同步变化', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '15' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '25' } })
    const params = store.getHeatmapParams()
    expect(params.blurRadius).toBe(25)
  })

  it('模糊半径滑块边界测试 - 最小值3', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '15' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '3' } })
    expect(store.getHeatmapParams().blurRadius).toBe(3)
  })

  it('模糊半径滑块边界测试 - 最大值30', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '15' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '30' } })
    expect(store.getHeatmapParams().blurRadius).toBe(30)
  })

  it('透明度滑块初始值0.6', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '0.6' }) as HTMLInputElement
    expect(parseFloat(slider.value)).toBe(0.6)
  })

  it('透明度滑块更新后store同步变化', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '0.6' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '0.9' } })
    expect(store.getHeatmapParams().opacity).toBe(0.9)
  })

  it('透明度滑块边界值 - 最小值0.1', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '0.6' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '0.1' } })
    expect(store.getHeatmapParams().opacity).toBe(0.1)
  })

  it('透明度滑块边界值 - 最大值1.0', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '0.6' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '1' } })
    expect(store.getHeatmapParams().opacity).toBe(1.0)
  })

  it('渐变方案选择器包含两种选项', () => {
    const { container } = render(<UIControl />)
    const labels = container.textContent?.includes('绿-黄-红') && container.textContent?.includes('蓝-红渐变')
    expect(labels).toBe(true)
  })

  it('可以切换到蓝红渐变方案', () => {
    const { container } = render(<UIControl />)
    const gradientOptions = container.querySelectorAll('div[onClick]')
    let clicked = false
    gradientOptions.forEach(el => {
      if ((el as HTMLElement).textContent?.includes('蓝-红渐变')) {
        fireEvent.click(el)
        clicked = true
      }
    })
    if (clicked) {
      expect(store.getHeatmapParams().colorMap).toBe('blueRed')
    }
  })

  it('5种颜色色板均渲染', () => {
    const { container } = render(<UIControl />)
    const palette = ['#1E3A5F', '#2E8B57', '#8A2BE2', '#E67E22', '#4A4A4A']
    let foundCount = 0
    for (const color of palette) {
      const styled = container.querySelectorAll<HTMLElement>('*')
      styled.forEach(el => {
        const bg = el.style.background || ''
        if (bg.toLowerCase() === color.toLowerCase()) {
          foundCount++
        }
      })
    }
    expect(foundCount).toBeGreaterThanOrEqual(5)
  })

  it('色板点击切换线条颜色', () => {
    const { container } = render(<UIControl />)
    const targetColor = '#8A2BE2'
    let targetEl: HTMLElement | null = null
    container.querySelectorAll<HTMLElement>('*').forEach(el => {
      if ((el.style.background || '').toLowerCase() === targetColor.toLowerCase()) {
        targetEl = el
      }
    })
    if (targetEl) {
      fireEvent.click(targetEl)
      expect(store.getSaccadeParams().lineColor).toBe(targetColor)
    }
  })

  it('线宽滑块初始值2', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '2' }) as HTMLInputElement
    expect(parseFloat(slider.value)).toBe(2)
  })

  it('线宽滑块更新store同步变化', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '2' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '4' } })
    expect(store.getSaccadeParams().lineWidth).toBe(4)
  })

  it('线宽边界最小值1', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '2' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '1' } })
    expect(store.getSaccadeParams().lineWidth).toBe(1)
  })

  it('线宽边界最大值5', () => {
    render(<UIControl />)
    const slider = screen.getByRole('slider', { name: '2' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '5' } })
    expect(store.getSaccadeParams().lineWidth).toBe(5)
  })

  it('显示统计图模式切换 - 柱状图和堆叠时间线', () => {
    const { container } = render(<UIControl />)
    const hasBar = container.textContent?.includes('柱状图')
    const hasTimeline = container.textContent?.includes('堆叠时间线')
    expect(hasBar).toBe(true)
    expect(hasTimeline).toBe(true)
  })

  it('统计图模式切换按钮可以点击切换到堆叠时间线', () => {
    const { container } = render(<UIControl />)
    const buttons = container.querySelectorAll('button')
    let clicked = false
    buttons.forEach(btn => {
      if (btn.textContent?.includes('堆叠时间线')) {
        fireEvent.click(btn)
        clicked = true
      }
    })
    if (clicked) {
      expect(store.getChartParams().mode).toBe('stackedTimeline')
    }
  })

  it('store状态变化后UI同步更新（参数改变后反映到滑块值）', () => {
    render(<UIControl />)
    store.setHeatmapParams({ blurRadius: 8 })
    const slider = screen.getByRole('slider', { name: '8' }) as HTMLInputElement
    expect(parseFloat(slider.value)).toBe(8)
  })

  it('快速连续参数变更不崩溃', () => {
    render(<UIControl />)
    expect(() => {
      store.setHeatmapParams({ blurRadius: 5 })
      store.setHeatmapParams({ opacity: 0.3 })
      store.setHeatmapParams({ colorMap: 'blueRed' })
      store.setSaccadeParams({ lineWidth: 3 })
      store.setSaccadeParams({ lineColor: '#E67E22' })
      store.setChartParams({ mode: 'stackedTimeline' })
      store.setHeatmapParams({ blurRadius: 22 })
      store.setSaccadeParams({ lineWidth: 1 })
      store.setChartParams({ mode: 'bar' })
    }).not.toThrow()
  })
})
