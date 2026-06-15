import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react'
import * as d3 from 'd3'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { SankeyData, FilteredLink, HighlightState } from '../App'

interface SankeyChartProps {
  data: SankeyData
  selectedNodeId: string | null
  highlight: HighlightState
  filteredLinks: FilteredLink[]
  onNodeClick: (nodeId: string) => void
  onLinkClick: (sourceId: string, targetId: string) => void
  onBackgroundClick: () => void
  onLinkFilter: (source: string, target: string, value: number) => void
}

interface ProcessedNode extends d3.SankeyNode<{}, {}> {
  id: string
  label: string
  x0: number
  x1: number
  y0: number
  y1: number
  depth: number
}

interface ProcessedLink extends d3.SankeyLink<{}, {}> {
  source: ProcessedNode
  target: ProcessedNode
  value: number
  width: number
}

const SankeyChart = forwardRef<{ exportPNG: () => void }, SankeyChartProps>(({
  data,
  highlight,
  filteredLinks,
  onNodeClick,
  onLinkClick,
  onBackgroundClick,
  onLinkFilter,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef({ width: 0, height: 0 })

  const colorScale = useMemo(() => {
    const colorRange = ['#0F3460', '#1B4D7A', '#276590', '#E94560']
    return d3.scaleLinear<string>()
      .domain([0, 0.33, 0.66, 1])
      .range(colorRange)
  }, [])

  const filteredLinksSet = useMemo(() => {
    return new Set(filteredLinks.map(l => `${l.source}->${l.target}`))
  }, [filteredLinks])

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const svg = svgRef.current
      if (!svg) return

      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        canvas.width = dimensionsRef.current.width * 2
        canvas.height = dimensionsRef.current.height * 2
        ctx.scale(2, 2)
        ctx.fillStyle = '#1A1A2E'
        ctx.fillRect(0, 0, dimensionsRef.current.width, dimensionsRef.current.height)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)

        const link = document.createElement('a')
        link.download = `sankey-diagram-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = url
    }
  }))

  useEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!svg || !container) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        dimensionsRef.current = { width, height }
        renderChart()
      }
    })
    resizeObserver.observe(container)

    renderChart()

    return () => {
      resizeObserver.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, highlight, filteredLinks])

  const renderChart = () => {
    const svg = svgRef.current
    if (!svg) return

    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    const margin = { top: 30, right: 30, bottom: 30, left: 30 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const activeLinks = data.links.filter(l => !filteredLinksSet.has(`${l.source}->${l.target}`))

    const nodesCopy = data.nodes.map(n => ({ ...n }))
    const linksCopy = activeLinks.map(l => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }))

    const sankeyGenerator = d3Sankey<{}, {}>()
      .nodeWidth(20)
      .nodePadding(16)
      .extent([[margin.left, margin.top], [innerWidth, innerHeight]])

    let graph: { nodes: ProcessedNode[]; links: ProcessedLink[] }
    try {
      graph = sankeyGenerator({
        nodes: nodesCopy as any,
        links: linksCopy as any,
      }) as any
    } catch {
      return
    }

    d3.select(svg).selectAll('*').remove()

    const root = d3.select(svg)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    const defs = root.append('defs')

    graph.links.forEach((link, i) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0)
        .attr('y1', (link.source.y0 + link.source.y1) / 2)
        .attr('y2', (link.target.y0 + link.target.y1) / 2)

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(link.source.depth / Math.max(1, d3.max(graph.nodes, d => d.depth) || 1)))

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(link.target.depth / Math.max(1, d3.max(graph.nodes, d => d.depth) || 1)))
    })

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    root.call(zoom as any)
      .on('click', (event) => {
        if (event.target === svg || event.target.tagName === 'rect' && event.target.getAttribute('class')?.includes('bg-rect')) {
          onBackgroundClick()
        }
      })

    root.append('rect')
      .attr('class', 'bg-rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')

    const g = root.append('g')

    const isLinkHighlighted = (link: ProcessedLink) => {
      if (!highlight.type) return true
      if (highlight.type === 'link') {
        return `${(link.source as any).id}->${(link.target as any).id}` === highlight.id
      }
      if (highlight.type === 'node') {
        return (link.source as any).id === highlight.id || (link.target as any).id === highlight.id
      }
      return true
    }

    const isNodeHighlighted = (node: ProcessedNode) => {
      if (!highlight.type) return true
      if (highlight.type === 'node') return node.id === highlight.id
      if (highlight.type === 'link') {
        return graph.links.some(l =>
          `${(l.source as any).id}->${(l.target as any).id}` === highlight.id &&
          ((l.source as any).id === node.id || (l.target as any).id === node.id)
        )
      }
      return true
    }

    const linkGroup = g.append('g').attr('class', 'links')

    const linkSelection = linkGroup.selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal() as any)
      .attr('fill', 'none')
      .attr('stroke', (_, i: number) => `url(#gradient-${i})`)
      .attr('stroke-opacity', d => isLinkHighlighted(d) ? 0.6 : 0.1)
      .attr('stroke-width', d => Math.max(1, d.width))
      .style('cursor', 'pointer')
      .style('transition', 'stroke-width 0.3s ease, stroke-opacity 0.2s ease')

    linkSelection
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('stroke-width', Math.max(1, d.width * 1.2))
          .attr('stroke-opacity', 0.9)

        const [x, y] = d3.pointer(event, svg)
        const valueLabel = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${x}, ${y - 15})`)

        valueLabel.append('rect')
          .attr('x', -30)
          .attr('y', -22)
          .attr('width', 60)
          .attr('height', 22)
          .attr('rx', 4)
          .attr('fill', 'rgba(0, 0, 0, 0.8)')

        valueLabel.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -6)
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('font-family', 'Consolas, Monaco, monospace')
          .text(d.value.toLocaleString())
      })
      .on('mousemove', function(event) {
        const [x, y] = d3.pointer(event, svg)
        g.select('.tooltip').attr('transform', `translate(${x}, ${y - 15})`)
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke-width', (d: any) => Math.max(1, d.width))
          .attr('stroke-opacity', (d: any) => isLinkHighlighted(d) ? 0.6 : 0.1)
        g.select('.tooltip').remove()
      })
      .on('click', function(event, d: any) {
        event.stopPropagation()
        onLinkClick(d.source.id, d.target.id)
      })
      .on('dblclick', function(_event, d: any) {
        onLinkFilter(d.source.id, d.target.id, d.value)
      })

    const nodeGroup = g.append('g').attr('class', 'nodes')

    const nodeSelection = nodeGroup.selectAll('g')
      .data(graph.nodes)
      .join('g')
      .attr('cursor', 'move')
      .style('transition', 'transform 0.3s ease')

    nodeSelection.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => Math.max(1, (d as any).y1 - (d as any).y0))
      .attr('fill', (d: any) => {
        const maxDepth = d3.max(graph.nodes, n => n.depth) || 1
        return colorScale(d.depth / Math.max(1, maxDepth))
      })
      .attr('stroke', '#16213E')
      .attr('stroke-width', 1.5)
      .attr('rx', 3)
      .attr('opacity', (d: any) => isNodeHighlighted(d) ? 1 : 0.2)
      .style('transition', 'opacity 0.2s ease')
      .on('click', function(event, d: any) {
        event.stopPropagation()
        onNodeClick(d.id)
      })

    nodeSelection.append('text')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
      .attr('y', (d: any) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
      .attr('fill', (d: any) => isNodeHighlighted(d) ? 'white' : 'rgba(255,255,255,0.3)')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .text((d: any) => d.label)

    const drag = d3.drag<SVGGElement, ProcessedNode>()
      .on('start', function(_event, d) {
        d3.select(this).style('transition', 'none')
      })
      .on('drag', function(event, d) {
        const dy = event.dy
        d.y0 = Math.max(margin.top, d.y0 + dy)
        d.y1 = Math.max(margin.top, d.y1 + dy)

        d3.select(this).select('rect')
          .attr('y', d.y0)
          .attr('height', Math.max(1, d.y1 - d.y0))

        d3.select(this).select('text')
          .attr('y', (d.y0 + d.y1) / 2)

        linkSelection.attr('d', sankeyLinkHorizontal() as any)
      })
      .on('end', function() {
        d3.select(this).style('transition', 'transform 0.3s ease')
      })

    nodeSelection.call(drag as any)
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
})

SankeyChart.displayName = 'SankeyChart'

export default SankeyChart
