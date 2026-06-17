import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Recipe, Version, RecipeDiff } from '../types';
import { useApi } from '../hooks/useApi';
import dayjs from 'dayjs';

interface VersionGraphProps {
  recipe: Recipe;
}

interface GraphNode {
  id: string;
  version: Version;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

function VersionGraph({ recipe }: VersionGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getDiff } = useApi();
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diff, setDiff] = useState<RecipeDiff | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 300,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const versions = recipe.versions || [];

  const buildGraphData = useCallback(() => {
    const nodes: GraphNode[] = versions.map((v) => ({
      id: v.id,
      version: v,
    }));

    const links: GraphLink[] = [];
    versions.forEach((v) => {
      v.parentIds.forEach((parentId) => {
        if (versions.find((ver) => ver.id === parentId)) {
          links.push({ source: parentId, target: v.id });
        }
      });
    });

    return { nodes, links };
  }, [versions]);

  useEffect(() => {
    if (!svgRef.current || versions.length === 0) return;

    const { width, height } = dimensions;
    const { nodes, links } = buildGraphData();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const arrow = defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto');
    arrow.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#9e9e9e');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels');

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, d3.SimulationLinkDatum<GraphNode>>(links as any)
          .id((d: any) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    const linkElements = linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#bdbdbd')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');

    const nodeElements = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 12)
      .attr('fill', (d) => {
        if (d.version.isMerge) return '#9c27b0';
        if (d.version.branch === 'main') return '#4caf50';
        return '#ff9800';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => handleNodeClick(d.id));

    const labelElements = labelGroup
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.version.versionNumber)
      .attr('text-anchor', 'middle')
      .attr('dy', -20)
      .attr('font-size', '11px')
      .attr('fill', '#5d4037')
      .style('pointer-events', 'none')
      .style('font-weight', '600');

    const drag = d3
      .drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(drag);

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeElements.attr('cx', (d) => d.x || 0).attr('cy', (d) => d.y || 0);

      labelElements.attr('x', (d) => d.x || 0).attr('y', (d) => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [versions, dimensions, buildGraphData]);

  const handleNodeClick = async (versionId: string) => {
    if (selectedVersions.length === 0) {
      setSelectedVersions([versionId]);
      setShowDiff(false);
      return;
    }

    if (selectedVersions.length === 1) {
      if (selectedVersions[0] === versionId) {
        setSelectedVersions([]);
        setShowDiff(false);
        return;
      }
      setSelectedVersions([...selectedVersions, versionId]);
      try {
        const diffData = await getDiff(selectedVersions[0], versionId);
        setDiff(diffData as RecipeDiff);
        setShowDiff(true);
      } catch (err) {
        console.error('获取差异失败', err);
      }
      return;
    }

    setSelectedVersions([versionId]);
    setShowDiff(false);
  };

  const getVersionById = (id: string) => versions.find((v) => v.id === id);

  const renderDiffPart = (changes: { type: string; value: string }[]) => {
    return changes.map((part, index) => (
      <span
        key={index}
        className={`diff-${part.type}`}
      >
        {part.value}
      </span>
    ));
  };

  return (
    <div className="version-graph-section">
      <div className="section-header">
        <h3>🌲 版本历史图</h3>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot main" /> 主分支
          </span>
          <span className="legend-item">
            <span className="legend-dot branch" /> 分支
          </span>
          <span className="legend-item">
            <span className="legend-dot merge" /> 合并
          </span>
        </div>
      </div>
      <p className="graph-hint">点击节点选择两个版本查看差异，可拖拽节点调整位置</p>

      <div ref={containerRef} className="graph-container">
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      </div>

      {selectedVersions.length > 0 && (
        <div className="selected-info">
          <span>已选择: </span>
          {selectedVersions.map((id) => {
            const v = getVersionById(id);
            return (
              <span key={id} className="selected-tag">
                {v?.versionNumber}
              </span>
            );
          })}
          {selectedVersions.length === 2 && showDiff && (
            <button
              className="btn-clear"
              onClick={() => {
                setSelectedVersions([]);
                setShowDiff(false);
              }}
            >
              清除选择
            </button>
          )}
        </div>
      )}

      {showDiff && diff && (
        <div className="diff-panel">
          <h4>📊 版本差异对比</h4>
          
          <div className="diff-section">
            <h5>食谱名称</h5>
            <div className="diff-content">{renderDiffPart(diff.name)}</div>
          </div>

          <div className="diff-section">
            <h5>食材变更</h5>
            {diff.ingredients.added.length > 0 && (
              <div className="diff-added">
                <strong>新增:</strong>
                <ul>
                  {diff.ingredients.added.map((ing, i) => (
                    <li key={i}>
                      + {ing.name} ({ing.amount} {ing.unit})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.ingredients.removed.length > 0 && (
              <div className="diff-removed">
                <strong>删除:</strong>
                <ul>
                  {diff.ingredients.removed.map((ing, i) => (
                    <li key={i}>
                      - {ing.name} ({ing.amount} {ing.unit})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.ingredients.modified.length > 0 && (
              <div className="diff-modified">
                <strong>修改:</strong>
                <ul>
                  {diff.ingredients.modified.map((mod, i) => (
                    <li key={i}>
                      {mod.old.name}: {mod.old.amount} {mod.old.unit} →{' '}
                      {mod.new.amount} {mod.new.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.ingredients.added.length === 0 &&
              diff.ingredients.removed.length === 0 &&
              diff.ingredients.modified.length === 0 && (
                <p className="diff-no-change">无变更</p>
              )}
          </div>

          <div className="diff-section">
            <h5>步骤变更</h5>
            {diff.steps.added.length > 0 && (
              <div className="diff-added">
                <strong>新增步骤:</strong>
                <ul>
                  {diff.steps.added.map((step, i) => (
                    <li key={i}>+ 步骤{step.order}: {step.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {diff.steps.removed.length > 0 && (
              <div className="diff-removed">
                <strong>删除步骤:</strong>
                <ul>
                  {diff.steps.removed.map((step, i) => (
                    <li key={i}>- 步骤{step.order}: {step.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {diff.steps.added.length === 0 && diff.steps.removed.length === 0 && (
              <p className="diff-no-change">无变更</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .version-graph-section {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .section-header h3 {
          color: #8b4513;
          font-size: 16px;
        }

        .legend {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #6d4c41;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-dot.main {
          background: #4caf50;
        }

        .legend-dot.branch {
          background: #ff9800;
        }

        .legend-dot.merge {
          background: #9c27b0;
        }

        .graph-hint {
          font-size: 12px;
          color: #8d6e63;
          margin-bottom: 12px;
        }

        .graph-container {
          background: #fafafa;
          border-radius: 8px;
          border: 1px solid #eee;
          overflow: hidden;
        }

        .selected-info {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #5d4037;
        }

        .selected-tag {
          background: #f5deb3;
          color: #8b4513;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-clear {
          background: none;
          color: #8d6e63;
          text-decoration: underline;
          font-size: 12px;
          padding: 0;
        }

        .diff-panel {
          margin-top: 16px;
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
        }

        .diff-panel h4 {
          color: #8b4513;
          margin-bottom: 12px;
        }

        .diff-section {
          margin-bottom: 14px;
        }

        .diff-section h5 {
          font-size: 13px;
          color: #6d4c41;
          margin-bottom: 8px;
        }

        .diff-content {
          padding: 8px;
          background: #fff;
          border-radius: 4px;
          font-size: 14px;
        }

        .diff-added {
          color: #2e7d32;
        }

        .diff-added ul {
          list-style: none;
          padding-left: 8px;
        }

        .diff-removed {
          color: #c62828;
        }

        .diff-removed ul {
          list-style: none;
          padding-left: 8px;
        }

        .diff-modified {
          color: #e65100;
        }

        .diff-modified ul {
          list-style: none;
          padding-left: 8px;
        }

        .diff-no-change {
          color: #9e9e9e;
          font-size: 13px;
        }

        .diff-unchanged {
          color: #424242;
        }

        .diff-added > strong,
        .diff-removed > strong,
        .diff-modified > strong {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

export default VersionGraph;
