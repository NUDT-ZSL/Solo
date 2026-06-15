import React, { useState, useRef } from 'react'
import { useSpring, animated } from 'react-spring'

export interface MessageData {
  id: string
  content: string
  author: string
  emotion: 'happy' | 'sad' | 'angry' | 'neutral'
  timestamp: string
}

interface BubbleProps {
  message: MessageData
  x: number
  y: number
  onClick: (message: MessageData) => void
  isNew?: boolean
  index?: number
}

const emotionColors: Record<string, string> = {
  happy: '#FDE047',
  sad: '#60A5FA',
  angry: '#F87171',
  neutral: '#D1D5DB',
}

const getBubbleSize = (content: string): number => {
  const base = 60
  const perChar = 0.6
  const size = base + Math.min(content.length * perChar, 80)
  return Math.min(size, 160)
}

const Bubble: React.FC<BubbleProps> = ({ message, x, y, onClick, isNew, index = 0 }) => {
  const size = getBubbleSize(message.content)
  const color = emotionColors[message.emotion] || emotionColors.neutral
  const [pressed, setPressed] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const float = useSpring({
    from: { yOffset: 0 },
    to: async (next) => {
      while (true) {
        await next({ yOffset: -6 })
        await next({ yOffset: 0 })
      }
    },
    config: {
      mass: 1,
      tension: 120,
      friction: 14,
    },
    loop: true,
    delay: index * 50,
  })

  const enter = useSpring({
    from: isNew
      ? { scale: 0, opacity: 0, xOffset: -x + 60, yOffset: -y + 60 }
      : { scale: 1, opacity: 1, xOffset: 0, yOffset: 0 },
    to: { scale: 1, opacity: 1, xOffset: 0, yOffset: 0 },
    config: { duration: 300, easing: (t) => 1 - Math.pow(1 - t, 3) },
  })

  const [hovered, setHovered] = useState(false)

  const handleClick = () => {
    onClick(message)
  }

  const handleTouchStart = () => {
    setPressed(true)
    pressTimer.current = setTimeout(() => {
      setHovered(true)
    }, 300)
  }

  const handleTouchEnd = () => {
    setPressed(false)
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
    }
    setTimeout(() => setHovered(false), 500)
  }

  const displayText = message.content.length > 20
    ? message.content.slice(0, 18) + '…'
    : message.content

  return (
    <animated.div
      className="bubble"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        transform: enter.xOffset.to(
          (xO) =>
            enter.yOffset.to(
              (yO) =>
                float.yOffset.to(
                  (fO) =>
                    `translate(${xO}px, ${yO + fO}px) scale(${
                      hovered ? 1.15 : 1
                    })`,
                ),
            ),
        ),
        opacity: enter.opacity,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span className="bubble-text">{displayText}</span>
    </animated.div>
  )
}

export default Bubble
