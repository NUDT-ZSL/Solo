import React, { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type { Idea, ClusterResult } from '../api'

interface ClusterGraphProps {
  ideas: Idea[]
  clusterResult: ClusterResult
  onClose: () => void
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  content: string
  clusterLabel: string
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  strength: number
}

const CLUSTER_COLORS = [
  '#6c63ff', '#4a90d9', '#4ad9a0', '#d94a7a',
  '#d9a04a', '#9b59b6', '#1abc9c', '#e74c3c',
  '#f39c12', '#2ecc71',
]

const ClusterGraph: React.FC<ClusterGraphProps> = ({ ideas, clusterResult, onClose }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || ideas.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = 400

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const ideaMap = new Map(ideas.map((idea) => [idea.id, idea]))
    const clusterColorMap = new Map<string, string>()
    clusterResult.clusters.forEach((cluster, i) => {
      clusterColorMap.set(cluster.id, CLUSTER_COLORS[i % CLUSTER_COLORS.length])
      cluster.ideaIds.forEach((id) => {
        clusterColorMap.set(id, CLUSTER_COLORS[i % CLUSTER_COLORS.length])
      })
    })

    const nodes: SimNode[] = ideas.map((idea) => {
      const cluster = clusterResult.clusters.find((c) =>
        c.ideaIds.includes(idea.id)
      )
      return {
        id: idea.id,
        content: idea.content,
        clusterLabel: cluster?.label || '未分类',
      }
    })

    const links: SimLink[] = clusterResult.links.map((link) => ({
      source: link.source,
      target: link.target,
      strength: link.strength,
    }))

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(120)
          .strength((d) => d.strength * 0.8)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    const g = svg.append('g')

    const linkElements = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#6c63ff66')
      .attr('stroke-width', 1.5)

    const nodeGroups = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'grab')

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeGroups.call(drag)

    nodeGroups
      .append('rect')
      .attr('width', 60)
      .attr('height', 60)
      .attr('x', -30)
      .attr('y', -30)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d) => clusterColorMap.get(d.id) || '#252540')
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#6c63ff44')
      .attr('stroke-width', 1)

    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#e0e0e0')
      .attr('font-size', 10)
      .text((d) => {
        const txt = d.content
        return txt.length > 6 ? txt.substring(0, 6) + '…' : txt
      })
      .style('pointer-events', 'none')

    nodeGroups
      .append('title')
      .text((d) => `${d.clusterLabel}\n${d.content}`)

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)

      nodeGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [ideas, clusterResult])

  useEffect(() => {
    const cleanup = renderGraph()
    return () => {
      cleanup?.()
    }
  }, [renderGraph])

  useEffect(() => {
    const handleResize = () => renderGraph()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderGraph])

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>🔗 聚类图谱</span>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>
      <svg ref={svgRef} style={styles.svg} />
      {clusterResult.clusters.length > 0 && (
        <div style={styles.legend}>
          {clusterResult.clusters.map((cluster, i) => (
            <div key={cluster.id} style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendDot,
                  background: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                }}
              />
              <span style={styles.legendLabel}>
                {cluster.label} ({cluster.ideaIds.length})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: 400,
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6a6a8e',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'color 0.2s ease',
  },
  svg: {
    flex: 1,
    overflow: 'hidden',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTop: '1px solid #2a2a3e',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendLabel: {
    color: '#8a8aae',
    fontSize: 12,
  },
}

export default ClusterGraph
