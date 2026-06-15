import { useEffect, useRef, useCallback } from 'react'
import type { YearNode } from './data'

interface TimelineProps {
  years: YearNode[]
  activeYear: string
  setActiveYear: (year: string) => void
}

export default function Timeline({ years, activeYear, setActiveYear }: TimelineProps) {
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  const handleNodeClick = useCallback((year: string) => {
    setActiveYear(year)
  }, [setActiveYear])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('timeline-node--visible')
          }
        })
      },
      { threshold: 0.3 }
    )

    nodeRefs.current.forEach((node) => {
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [years])

  useEffect(() => {
    const activeIndex = years.findIndex((y) => y.year === activeYear)
    if (activeIndex >= 0 && nodeRefs.current[activeIndex]) {
      nodeRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [activeYear, years])

  return (
    <aside className="timeline">
      <div className="timeline__line" />
      {years.map((node, index) => {
        const isActive = node.year === activeYear
        return (
          <div
            key={node.year}
            ref={(el) => { nodeRefs.current[index] = el }}
            className={`timeline-node ${isActive ? 'timeline-node--active' : ''}`}
            onClick={() => handleNodeClick(node.year)}
          >
            <div className="timeline-node__dot" />
            <div className="timeline-node__content">
              <span className="timeline-node__year">{node.year}</span>
              <span className="timeline-node__title">{node.title}</span>
            </div>
          </div>
        )
      })}
    </aside>
  )
}
