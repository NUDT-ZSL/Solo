interface RippleOptions {
  color?: string
  diameter?: number
  duration?: number
  startOpacity?: number
  endOpacity?: number
}

export function createRipple(event: React.MouseEvent<Element>, colorOrOptions?: string | RippleOptions): void {
  let options: RippleOptions = {}
  if (typeof colorOrOptions === 'string') {
    options.color = colorOrOptions
  } else if (colorOrOptions) {
    options = colorOrOptions
  }

  const {
    color = 'rgba(255, 255, 255, 0.4)',
    diameter = 40,
    duration = 0.4,
    startOpacity = 0.4,
    endOpacity = 0
  } = options

  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const ripple = document.createElement('span')
  const radius = diameter / 2

  ripple.style.width = `${diameter}px`
  ripple.style.height = `${diameter}px`
  ripple.style.left = `${x - radius}px`
  ripple.style.top = `${y - radius}px`
  ripple.style.backgroundColor = color
  ripple.style.position = 'absolute'
  ripple.style.borderRadius = '50%'
  ripple.style.pointerEvents = 'none'
  ripple.style.opacity = `${startOpacity}`
  ripple.style.transform = 'scale(0)'
  ripple.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`
  ripple.style.zIndex = '1'

  const computedStyle = window.getComputedStyle(element)
  if (computedStyle.position === 'static') {
    element.style.position = 'relative'
  }
  if (computedStyle.overflow === 'visible') {
    element.style.overflow = 'hidden'
  }

  element.appendChild(ripple)

  requestAnimationFrame(() => {
    ripple.style.transform = 'scale(1)'
    ripple.style.opacity = `${endOpacity}`
  })

  const removeTimeout = setTimeout(() => {
    if (ripple.parentNode) {
      ripple.remove()
    }
  }, duration * 1000)

  ripple.addEventListener('transitionend', () => {
    clearTimeout(removeTimeout)
    if (ripple.parentNode) {
      ripple.remove()
    }
  })
}
