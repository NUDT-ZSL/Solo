export function createRipple(event: React.MouseEvent<HTMLElement>, color: string = 'rgba(255, 255, 255, 0.4)'): void {
  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const ripple = document.createElement('span')
  const diameter = 40
  const radius = diameter / 2

  ripple.style.width = ripple.style.height = `${diameter}px`
  ripple.style.left = `${x - radius}px`
  ripple.style.top = `${y - radius}px`
  ripple.style.backgroundColor = color
  ripple.className = 'ripple'

  element.style.position = 'relative'
  element.style.overflow = 'hidden'
  element.appendChild(ripple)

  setTimeout(() => {
    ripple.remove()
  }, 400)
}
