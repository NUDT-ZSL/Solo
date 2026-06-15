import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useInventory } from '../App';

interface HeatmapArea {
  area: string;
  totalQuantity: number;
  maxCapacity: number;
  itemCount: number;
  ratio: number;
  items: Array<{ id: string; name: string; quantity: number }>;
}

function HeatmapPage() {
  const { items } = useInventory();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedArea, setSelectedArea] = useState<HeatmapArea | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  const areaData: HeatmapArea[] = useMemo(() => {
    const areas = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
    return areas
      .filter((area) => area.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((area) => {
        const areaItems = items.filter((i) => i.storage_area === area);
        const totalQuantity = areaItems.reduce((s, i) => s + i.quantity, 0);
        const maxCapacity = areaItems.reduce((s, i) => s + i.max_capacity, 0);
        const ratio = maxCapacity > 0 ? totalQuantity / maxCapacity : 0;
        return {
          area,
          totalQuantity,
          maxCapacity,
          itemCount: areaItems.length,
          ratio,
          items: areaItems.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
        };
      });
  }, [items, searchTerm]);

  useEffect(() => {
    if (!svgRef.current || areaData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 450;
    const margin = { top: 40, right: 60, bottom: 40, left: 40 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const cols = Math.min(3, areaData.length);
    const rows = Math.ceil(areaData.length / cols);

    const cellWidth = (innerWidth / cols) * zoomLevel;
    const cellHeight = (innerHeight / rows) * zoomLevel;
    const cellPadding = 12;

    const colorScale = d3.scaleLinear<string>()
      .domain([0, 0.5, 1])
      .range(['#22c55e', '#eab308', '#ef4444']);

    const g = svg.attr('width', width).attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left + (innerWidth - (cellWidth * cols + cellPadding * (cols - 1))) / 2}, ${margin.top + (innerHeight - (cellHeight * rows + cellPadding * (rows - 1))) / 2})`);

    const cells = g.selectAll('g.cell')
      .data(areaData, (d: unknown) => (d as HeatmapArea).area)
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('transform', (_d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return `translate(${col * (cellWidth + cellPadding)}, ${row * (cellHeight + cellPadding)})`;
      })
      .style('cursor', 'pointer');

    cells.append('rect')
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d) => colorScale(d.ratio))
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 1)
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 0.85);

    cells.append('text')
      .attr('x', cellWidth / 2)
      .attr('y', cellHeight / 2 - 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '24px')
      .attr('font-weight', '700')
      .style('opacity', 0)
      .text((d) => d.area)
      .transition()
      .delay(200)
      .duration(400)
      .style('opacity', 1);

    cells.append('text')
      .attr('x', cellWidth / 2)
      .attr('y', cellHeight / 2 + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('font-size', '13px')
      .style('opacity', 0)
      .text((d) => `${Math.round(d.ratio * 100)}%`)
      .transition()
      .delay(300)
      .duration(400)
      .style('opacity', 1);

    cells
      .on('mouseover', function(event, d) {
        d3.select(this).select('rect')
          .transition()
          .duration(150)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2.5)
          .style('opacity', 1);

        if (tooltipRef.current) {
          const tooltip = tooltipRef.current;
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.pageX + 15}px`;
          tooltip.style.top = `${event.pageY + 15}px`;
          tooltip.innerHTML = `
            <div style="font-weight:600;font-size:15px;margin-bottom:8px;color:#fff;">存储区 ${d.area}</div>
            <div style="font-size:13px;color:#8899aa;margin:4px 0;">当前库存: <span style="color:#4a9eff;font-weight:600;">${d.totalQuantity}</span></div>
            <div style="font-size:13px;color:#8899aa;margin:4px 0;">最大容量: <span style="color:#8899aa;font-weight:600;">${d.maxCapacity}</span></div>
            <div style="font-size:13px;color:#8899aa;margin:4px 0;">占用占比: <span style="color:${colorScale(d.ratio)};font-weight:600;">${Math.round(d.ratio * 100)}%</span></div>
            <div style="font-size:13px;color:#8899aa;margin:4px 0;">物品数量: <span style="color:#f0f4f8;font-weight:600;">${d.itemCount}</span></div>
          `;
        }
      })
      .on('mousemove', function(event) {
        if (tooltipRef.current) {
          tooltipRef.current.style.left = `${event.pageX + 15}px`;
          tooltipRef.current.style.top = `${event.pageY + 15}px`;
        }
      })
      .on('mouseout', function() {
        d3.select(this).select('rect')
          .transition()
          .duration(150)
          .attr('stroke', 'rgba(255,255,255,0.15)')
          .attr('stroke-width', 1)
          .style('opacity', 0.85);

        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      })
      .on('click', function(_event, d) {
        setSelectedArea(d);
      });

    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - margin.right - legendWidth;
    const legendY = 15;

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmapGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#22c55e');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#eab308');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#ef4444');

    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 4)
      .attr('fill', 'url(#heatmapGradient)');

    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .attr('fill', '#8899aa')
      .attr('font-size', '11px')
      .text('库存密度 (低 → 高)');

    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY + legendHeight + 16)
      .attr('fill', '#6b7f94')
      .attr('font-size', '10px')
      .text('0%');

    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY + legendHeight + 16)
      .attr('fill', '#6b7f94')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end')
      .text('100%');

  }, [areaData, zoomLevel]);

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 700, color: '#fff' }}>仓库热力图</h2>

      <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 13, color: '#8899aa', whiteSpace: 'nowrap' }}>搜索区域:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="输入区域名称..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#f0f4f8',
              fontSize: 13,
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#4a9eff'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#8899aa', whiteSpace: 'nowrap' }}>缩放:</label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            style={{ width: 120, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: '#4a9eff', minWidth: 32 }}>{Math.round(zoomLevel * 100)}%</span>
        </div>
        <div style={{ fontSize: 12, color: '#6b7f94' }}>点击矩形可下钻查看物品详情</div>
      </div>

      <div className="glass-card" style={{ padding: 20, overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block', minHeight: 450 }} />
      </div>

      {selectedArea && (
        <div className="modal-overlay" onClick={() => setSelectedArea(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                存储区 {selectedArea.area} - 物品列表
              </h3>
              <button
                onClick={() => setSelectedArea(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8899aa',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            {selectedArea.items.length === 0 ? (
              <div style={{ color: '#8899aa', textAlign: 'center', padding: 24 }}>该区域暂无物品</div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {selectedArea.items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ color: '#f0f4f8', fontSize: 14 }}>{item.name}</span>
                    <span style={{ color: '#4a9eff', fontSize: 14, fontWeight: 600 }}>{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#8899aa' }}>区域容量占比</span>
              <span style={{ color: selectedArea.ratio > 0.8 ? '#ef4444' : selectedArea.ratio > 0.5 ? '#eab308' : '#22c55e', fontWeight: 600 }}>
                {Math.round(selectedArea.ratio * 100)}% ({selectedArea.totalQuantity}/{selectedArea.maxCapacity})
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'fixed',
          pointerEvents: 'none',
          background: 'rgba(20, 35, 55, 0.98)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(74, 158, 255, 0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          minWidth: 180,
          zIndex: 1500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}

export default HeatmapPage;
