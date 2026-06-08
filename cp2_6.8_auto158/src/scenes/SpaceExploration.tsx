import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Star {
  x: number
  y: number
  r: number
  baseOpacity: number
  phase: number
}

interface TrailPoint {
  x: number
  y: number
  age: number
}

const SpaceExploration: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (!ref.current) return

    const container = ref.current
    const width = container.clientWidth
    const height = container.clientHeight
    const cx = width / 2
    const cy = height / 2

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

    const stars: Star[] = []
    const numStars = 200

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2,
        baseOpacity: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const starCircles = svg
      .selectAll('.star')
      .data(stars)
      .enter()
      .append('circle')
      .attr('class', 'star')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', '#FFFFFF')

    const trail: TrailPoint[] = []
    const maxTrailLength = 30

    for (let i = 0; i < maxTrailLength; i++) {
      trail.push({ x: cx, y: cy, age: i })
    }

    const trailCircles = svg
      .selectAll('.trail')
      .data(trail)
      .enter()
      .append('circle')
      .attr('class', 'trail')
      .attr('fill', '#E17055')

    const ship = svg
      .append('polygon')
      .attr('points', '0,-12 12,0 0,12 -12,0')
      .attr('fill', '#E17055')
      .attr('stroke', '#FDCB6E')
      .attr('stroke-width', 1)

    const coordLabel = svg
      .append('g')
      .attr('transform', 'translate(15, 15)')

    coordLabel
      .append('rect')
      .attr('width', 130)
      .attr('height', 28)
      .attr('rx', 6)
      .attr('fill', '#2D3436')
      .attr('opacity', 0.7)

    const coordText = coordLabel
      .append('text')
      .attr('x', 10)
      .attr('y', 19)
      .attr('fill', '#DFE6E9')
      .attr('font-size', '13px')
      .attr('font-family', 'inherit')
      .attr('font-weight', '600')

    const timeScale = d3.scaleTime().domain([0, 1000]).range([0, 1])
    let lastTime = performance.now()
    let angle = 0
    let spiralPhase = 0
    let spiralIncreasing = true

    const animate = () => {
      const currentTime = performance.now()
      const deltaTime = Math.min(currentTime - lastTime, 50)
      lastTime = currentTime
      const dt = deltaTime / 16.67

      timeScale.domain([0, deltaTime])

      stars.forEach(s => {
        s.phase += 0.02 * dt
      })

      starCircles.attr('opacity', d => {
        const flicker = Math.sin(d.phase) * 0.3
        return Math.max(0.3, Math.min(1, d.baseOpacity + flicker))
      })

      angle += 0.03 * dt

      if (spiralIncreasing) {
        spiralPhase += 0.004 * dt
        if (spiralPhase >= 1) {
          spiralPhase = 1
          spiralIncreasing = false
        }
      } else {
        spiralPhase -= 0.004 * dt
        if (spiralPhase <= 0) {
          spiralPhase = 0
          spiralIncreasing = true
        }
      }

      const radius = 50 + spiralPhase * 150
      const shipX = cx + Math.cos(angle) * radius
      const shipY = cy + Math.sin(angle) * radius * 0.7

      trail.forEach((tp, i) => {
        if (i === trail.length - 1) {
          tp.x = shipX
          tp.y = shipY
          tp.age = 0
        } else {
          tp.x = trail[i + 1].x
          tp.y = trail[i + 1].y
          tp.age = trail[i + 1].age + 1
        }
      })

      trailCircles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', (_, i) => 4 - (i / maxTrailLength) * 3)
        .attr('opacity', (_, i) => 0.8 * (1 - i / maxTrailLength))

      const shipAngle = angle * (180 / Math.PI) + 90
      ship.attr('transform', `translate(${shipX}, ${shipY}) rotate(${shipAngle})`)

      const relX = Math.round(shipX - cx)
      const relY = Math.round(shipY - cy)
      const xSign = relX >= 0 ? '+' : ''
      const ySign = relY >= 0 ? '+' : ''
      coordText.text(`X: ${xSign}${relX}, Y: ${ySign}${relY}`)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
      svg.remove()
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}

export default SpaceExploration
