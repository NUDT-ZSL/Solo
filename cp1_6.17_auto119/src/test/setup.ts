import '@testing-library/jest-dom'

if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16)
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: any, options?: any) {
    const ctx = originalGetContext.call(this, contextId, options)
    if (!ctx) return null
    if (contextId === '2d' && !ctx.createImageData) {
      const width = this.width || 300
      const height = this.height || 150
      ;(ctx as any).createImageData = (w: number | ImageData, h?: number) => {
        const tw = typeof w === 'number' ? w : (w as ImageData).width
        const th = typeof w === 'number' ? (h as number) : (w as ImageData).height
        return {
          width: tw,
          height: th,
          data: new Uint8ClampedArray(tw * th * 4)
        } as ImageData
      }
      ;(ctx as any).getImageData = (sx: number, sy: number, sw: number, sh: number) => {
        return {
          width: sw,
          height: sh,
          data: new Uint8ClampedArray(sw * sh * 4)
        } as ImageData
      }
      ;(ctx as any).putImageData = () => {}
    }
    return ctx
  }
}
