import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Vehicle {
  path: d3.Path
  progress: number
  speed: number
  color: string
}

interface Route {
  points: [number, number][]
  path: d3.Path
  color: string
  strokeWidth: number
}

const CityTraffic: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
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

    svgRef.current = svg.node()

    const routes: Route[] = []
    const numRoutes = 30

    for (let i = 0; i < numRoutes; i++) {
      const numPoints = Math.floor(Math.random() * 4) + 5
      const points: [number, number][] = []

      for (let j = 0; j < numPoints; j++) {
        points.push([
          Math.random() * width,
          Math.random() * height,
        ])
      }

      const lineGenerator = d3
        .line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis)

      const path = lineGenerator(points)!
      const pathObj = d3.path()
      pathObj.moveTo(points[0][0], points[0][1])
      for (let j = 1; j < points.length; j++) {
        pathObj.lineTo(points[j][0], points[j][1])
      }

      const t = i / (numRoutes - 1)
      const color = d3.interpolate('#FF7675', '#FDCB6E')(t)

      routes.push({
        points,
        path: pathObj,
        color,
        strokeWidth: 2 + Math.random() * 2,
      })
    }

    routes.forEach(route => {
      const lineGenerator = d3
        .line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis)

      svg
        .append('path')
        .attr('d', lineGenerator(route.points))
        .attr('stroke', route.color)
        .attr('stroke-width', route.strokeWidth)
        .attr('fill', 'none')
        .attr('opacity', 0.6)
    })

    const vehicles: Vehicle[] = []
    const numVehicles = 30

    for (let i = 0; i < numVehicles; i++) {
      const routeIdx = Math.floor(Math.random() * routes.length)
      const route = routes[routeIdx]

      vehicles.push({
        path: route.path,
        progress: Math.random(),
        speed: 0.001 + Math.random() * 0.002,
        color: route.color,
      })
    }

    const vehicleCircles = svg
      .selectAll('.vehicle')
      .data(vehicles)
      .enter()
      .append('circle')
      .attr('class', 'vehicle')
      .attr('r', 4)
      .attr('fill', d => d.color)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1)

    const densityLabel = svg
      .append('g')
      .attr('transform', `translate(${width - 140}, ${height - 40})`)

    densityLabel
      .append('rect')
      .attr('width', 130)
      .attr('height', 30)
      .attr('rx', 6)
      .attr('fill', '#2D3436')
      .attr('opacity', 0.7)

    const densityText = densityLabel
      .append('text')
      .attr('x', 65)
      .attr('y', 20)
      .attr('fill', '#DFE6E9')
      .attr('font-size', '14px')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'inherit')

    const timeScale = d3.scaleTime().domain([0, 1000]).range([0, 1])
    let lastTime = performance.now()
    let densityValue = 78

    const animate = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      timeScale.domain([0, deltaTime])

      vehicles.forEach(v => {
        v.progress += v.speed * deltaTime * 0.06
        if (v.progress > 1) v.progress -= 1
      })

      vehicleCircles.each(function (d) {
        const len = (width + height) * 0.5
        const dist = d.progress * len
        const routePoints = routes.find(r => {
          const lineGen = d3.line<[number, number]>().x(p => p[0]).y(p => p[1]).curve(d3.curveBasis)
          return lineGen(r.points) && true
        })?.points || routes[0].points

        const totalSegments = routePoints.length - 1
        const segProgress = d.progress * totalSegments
        const segIdx = Math.min(Math.floor(segProgress), totalSegments - 1)
        const localT = segProgress - segIdx

        const p0 = routePoints[segIdx]
        const p1 = routePoints[Math.min(segIdx + 1, routePoints.length - 1)]
        const x = p0[0] + (p1[0] - p0[0]) * localT
        const y = p0[1] + (p1[1] - p0[1]) * localT

        d3.select(this)
          .attr('cx', x)
          .attr('cy', y)
      })

      densityValue = Math.max(60, Math.min(95, densityValue + (Math.random() - 0.5) * 3))
      densityText.text(`交通密度: ${Math.round(densityValue)}%`)

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

export default CityTraffic
