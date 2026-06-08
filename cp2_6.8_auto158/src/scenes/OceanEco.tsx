import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Fish {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
}

interface Seaweed {
  x: number
  baseY: number
  height: number
  segments: { x: number; y: number }[]
  phase: number
}

const OceanEco: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (!ref.current) return

    const container = ref.current
    const width = container.clientWidth
    const height = container.clientHeight

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

    const separation = 1.5
    const alignment = 0.8
    const cohesion = 1.0
    const maxSpeed = 2.5
    const perception = 50

    const fishes: Fish[] = []
    const numFishes = 60

    for (let i = 0; i < numFishes; i++) {
      const t = i / (numFishes - 1)
      fishes.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.7),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: d3.interpolate('#00B894', '#00CEC9')(t),
        size: 6 + Math.random() * 4,
      })
    }

    const seaweeds: Seaweed[] = []
    const numSeaweeds = 15

    for (let i = 0; i < numSeaweeds; i++) {
      const h = 40 + Math.random() * 60
      const segments: { x: number; y: number }[] = []
      const segs = 8
      for (let j = 0; j <= segs; j++) {
        segments.push({ x: 0, y: -(h * j) / segs })
      }
      seaweeds.push({
        x: (width / (numSeaweeds + 1)) * (i + 1) + (Math.random() - 0.5) * 20,
        baseY: height - 5,
        height: h,
        segments,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const seaweedGroups = svg
      .selectAll('.seaweed')
      .data(seaweeds)
      .enter()
      .append('g')
      .attr('class', 'seaweed')
      .attr('transform', d => `translate(${d.x}, ${d.baseY})`)

    const seaweedPaths = seaweedGroups
      .append('path')
      .attr('stroke', '#00A86B')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')

    const fishGroups = svg
      .selectAll('.fish')
      .data(fishes)
      .enter()
      .append('g')
      .attr('class', 'fish')

    fishGroups
      .append('polygon')
      .attr('fill', d => d.color)
      .attr('points', d => {
        const s = d.size
        return `${s},0 ${-s * 0.7},${s * 0.5} ${-s * 0.7},${-s * 0.5}`
      })

    let globalDirectionChangeTime = 0
    let globalTargetX = width / 2
    let globalTargetY = height / 2
    let isScattering = false
    let scatterTime = 0

    const timeScale = d3.scaleTime().domain([0, 1000]).range([0, 1])
    let lastTime = performance.now()

    const animate = () => {
      const currentTime = performance.now()
      const deltaTime = Math.min(currentTime - lastTime, 50)
      lastTime = currentTime
      const dt = deltaTime / 16.67

      timeScale.domain([0, deltaTime])
      globalDirectionChangeTime += deltaTime

      if (globalDirectionChangeTime > 10000) {
        globalDirectionChangeTime = 0
        isScattering = true
        scatterTime = 0
      }

      if (isScattering) {
        scatterTime += deltaTime
        if (scatterTime < 2000) {
          const angle = Math.random() * Math.PI * 2
          globalTargetX = width / 2 + Math.cos(angle) * width * 0.6
          globalTargetY = height / 2 + Math.sin(angle) * height * 0.6
        } else if (scatterTime < 4000) {
          globalTargetX = width / 2
          globalTargetY = height / 2
        } else {
          isScattering = false
          globalTargetX = Math.random() * width
          globalTargetY = Math.random() * (height * 0.6) + height * 0.1
        }
      }

      fishes.forEach((fish, i) => {
        let sepX = 0, sepY = 0
        let aliX = 0, aliY = 0
        let cohX = 0, cohY = 0
        let sepCount = 0, aliCount = 0, cohCount = 0

        fishes.forEach((other, j) => {
          if (i === j) return
          const dx = other.x - fish.x
          const dy = other.y - fish.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < perception * 0.6 && dist > 0) {
            sepX -= dx / dist
            sepY -= dy / dist
            sepCount++
          }
          if (dist < perception) {
            aliX += other.vx
            aliY += other.vy
            aliCount++
            cohX += other.x
            cohY += other.y
            cohCount++
          }
        })

        if (sepCount > 0) {
          sepX /= sepCount
          sepY /= sepCount
        }
        if (aliCount > 0) {
          aliX /= aliCount
          aliY /= aliCount
        }
        if (cohCount > 0) {
          cohX = (cohX / cohCount - fish.x) * 0.01
          cohY = (cohY / cohCount - fish.y) * 0.01
        }

        let targetX = globalTargetX - fish.x
        let targetY = globalTargetY - fish.y
        const targetDist = Math.sqrt(targetX * targetX + targetY * targetY)
        if (targetDist > 0) {
          targetX = (targetX / targetDist) * 0.3
          targetY = (targetY / targetDist) * 0.3
        }

        fish.vx += (sepX * separation + aliX * alignment + cohX * cohesion + targetX) * dt
        fish.vy += (sepY * separation + aliY * alignment + cohY * cohesion + targetY) * dt

        const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)
        if (speed > maxSpeed) {
          fish.vx = (fish.vx / speed) * maxSpeed
          fish.vy = (fish.vy / speed) * maxSpeed
        }
        if (speed < 0.5) {
          fish.vx += (Math.random() - 0.5) * 0.2
          fish.vy += (Math.random() - 0.5) * 0.2
        }

        fish.x += fish.vx * dt
        fish.y += fish.vy * dt

        if (fish.x < 10) { fish.x = 10; fish.vx *= -0.8 }
        if (fish.x > width - 10) { fish.x = width - 10; fish.vx *= -0.8 }
        if (fish.y < 10) { fish.y = 10; fish.vy *= -0.8 }
        if (fish.y > height - 80) { fish.y = height - 80; fish.vy *= -0.8 }
      })

      fishGroups.each(function (d) {
        const angle = Math.atan2(d.vy, d.vx) * (180 / Math.PI)
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y}) rotate(${angle})`)
      })

      seaweeds.forEach(sw => {
        sw.phase += 0.03 * dt
        sw.segments.forEach((seg, idx) => {
          const t = idx / (sw.segments.length - 1)
          const sway = Math.sin(sw.phase + idx * 0.3) * t * 15
          seg.x = sway
        })
      })

      seaweedPaths.attr('d', (d, i) => {
        const sw = seaweeds[i]
        const line = d3.line<{ x: number; y: number }>()
          .x(s => s.x)
          .y(s => s.y)
          .curve(d3.curveBasis)
        return line(sw.segments) || ''
      })

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

export default OceanEco
