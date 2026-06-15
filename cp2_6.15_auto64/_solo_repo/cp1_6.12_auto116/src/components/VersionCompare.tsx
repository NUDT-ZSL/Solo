import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import { PaletteVersion, ComparisonResult } from '../types'
import { compareVersions } from '../api'
import { formatDate } from '../utils/colorUtils'

interface VersionCompareProps {
  versions: PaletteVersion[]
  baselineId: string | null
  selectedVersionId: string | null
  onSelectVersion: (id: string) => void
}

function getDifferenceInfo(diff: number): { label: string; color: string } {
  if (diff < 5) {
    return { label: '相似', color: '#10B981' }
  } else if (diff <= 15) {
    return { label: '微调', color: '#F59E0B' }
  } else {
    return { label: '差异', color: '#EF4444' }
  }
}

export default function VersionCompare({
  versions,
  baselineId,
  selectedVersionId,
  onSelectVersion
}: VersionCompareProps) {
  const [id1, setId1] = useState<string>('')
  const [id2, setId2] = useState<string>('')
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const compareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (baselineId && !id1) {
      setId1(baselineId)
    }
  }, [baselineId, id1])

  useEffect(() => {
    if (selectedVersionId && selectedVersionId !== id1 && selectedVersionId !== id2) {
      if (!id1) {
        setId1(selectedVersionId)
      } else if (!id2) {
        setId2(selectedVersionId)
      } else {
        setId2(selectedVersionId)
      }
    }
  }, [selectedVersionId, id1, id2])

  useEffect(() => {
    if (id1 && id2 && id1 !== id2) {
      doCompare()
    } else {
      setResult(null)
    }
  }, [id1, id2])

  const doCompare = async () => {
    if (!id1 || !id2 || id1 === id2) return

    setLoading(true)
    try {
      const data = await compareVersions(id1, id2)
      setResult(data)
    } catch (error) {
      console.error('Compare error:', error)
      alert('对比失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleVersion1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    setId1(newId)
    if (newId) onSelectVersion(newId)
  }

  const handleVersion2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    setId2(newId)
    if (newId) onSelectVersion(newId)
  }

  const handleExport = async () => {
    if (!result || !compareRef.current) return

    setExporting(true)
    try {
      const canvas = await html2canvas(compareRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imageDataUrl = canvas.toDataURL('image/png')

      const dateStr = new Date().toISOString().slice(0, 10)
      const fileName = `Palette_Report_${dateStr}.html`

      const htmlContent = generateReportHTML(result, imageDataUrl)

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const generateReportHTML = (data: ComparisonResult, screenshotUrl: string): string => {
    const generateDate = new Date().toLocaleString('zh-CN')

    const colorRows = data.comparisons.map((c, i) => {
      const info = getDifferenceInfo(c.difference)
      return `
      <tr>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;">
          <div style="width:60px;height:60px;border-radius:6px;margin:0 auto;background:${c.color1.hex};"></div>
        </td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;font-family:monospace;">${c.color1.hex.toUpperCase()}</td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;font-size:13px;">RGB(${c.color1.rgb.r}, ${c.color1.rgb.g}, ${c.color1.rgb.b})</td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;">
          <div style="width:60px;height:60px;border-radius:6px;margin:0 auto;background:${c.color2.hex};"></div>
        </td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;font-family:monospace;">${c.color2.hex.toUpperCase()}</td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;font-size:13px;">RGB(${c.color2.rgb.r}, ${c.color2.rgb.g}, ${c.color2.rgb.b})</td>
        <td style="padding:12px;text-align:center;border:1px solid #e5e7eb;font-weight:600;color:${info.color};">${c.difference}% (${info.label})</td>
      </tr>`
    }).join('')

    const overallInfo = getDifferenceInfo(data.overallDifference)

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PaletteFlow 配色方案对比报告</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif; background:#fff; color:#1F2937; padding:40px; line-height:1.6; }
    .header { text-align:center; margin-bottom:32px; padding-bottom:24px; border-bottom:2px solid #4F46E5; }
    .header h1 { font-size:32px; color:#4F46E5; margin-bottom:8px; }
    .header p { color:#6B7280; font-size:14px; }
    .screenshot-container { text-align:center; margin:32px 0; }
    .screenshot-container img { max-width:100%; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
    .info-section { display:flex; gap:24px; margin-bottom:32px; }
    .info-card { flex:1; background:#F9FAFB; padding:20px; border-radius:12px; border:1px solid #e5e7eb; }
    .info-card h3 { font-size:16px; margin-bottom:12px; color:#4F46E5; }
    .info-card p { font-size:14px; color:#4B5563; margin:4px 0; }
    .overall-summary { text-align:center; background:linear-gradient(135deg,#4F46E5,#A78BFA); color:#fff; padding:24px; border-radius:12px; margin-bottom:32px; }
    .overall-summary h2 { font-size:24px; margin-bottom:8px; }
    .overall-summary .diff { font-size:48px; font-weight:700; margin:8px 0; }
    .color-table-section { margin-top:32px; }
    .color-table-section h2 { font-size:20px; margin-bottom:16px; color:#1F2937; }
    table { width:100%; border-collapse:collapse; background:#fff; }
    th { background:#F3F4F6; padding:14px; font-weight:600; font-size:13px; color:#374151; border:1px solid #e5e7eb; }
    footer { margin-top:48px; padding-top:24px; border-top:1px solid #e5e7eb; text-align:center; color:#9CA3AF; font-size:12px; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>PaletteFlow 配色方案对比报告</h1>
    <p>生成日期：${generateDate}</p>
  </div>

  <div class="info-section">
    <div class="info-card">
      <h3>版本 A${baselineId === data.version1.id ? '（基准）' : ''}</h3>
      <p><strong>名称：</strong>${data.version1.name}</p>
      <p><strong>创建时间：</strong>${formatDate(data.version1.createdAt)}</p>
    </div>
    <div class="info-card">
      <h3>版本 B${baselineId === data.version2.id ? '（基准）' : ''}</h3>
      <p><strong>名称：</strong>${data.version2.name}</p>
      <p><strong>创建时间：</strong>${formatDate(data.version2.createdAt)}</p>
    </div>
  </div>

  <div class="overall-summary">
    <h2>整体差异评估</h2>
    <div class="diff">${data.overallDifference}%</div>
    <p style="font-size:18px;font-weight:600;">差异等级：${overallInfo.label}</p>
  </div>

  <div class="screenshot-container">
    <h2 style="font-size:20px;margin-bottom:16px;color:#1F2937;">对比区域截图</h2>
    <img src="${screenshotUrl}" alt="对比截图" />
  </div>

  <div class="color-table-section">
    <h2>详细色值对比表</h2>
    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>版本A色块</th>
          <th>版本A HEX</th>
          <th>版本A RGB</th>
          <th>版本B色块</th>
          <th>版本B HEX</th>
          <th>版本B RGB</th>
          <th>差异</th>
        </tr>
      </thead>
      <tbody>
        ${colorRows}
      </tbody>
    </table>
  </div>

  <footer>
    <p>PaletteFlow - 设计配色方案版本管理与对比工具</p>
    <p>本报告可使用浏览器"打印 → 另存为PDF"功能导出为PDF格式</p>
  </footer>
</body>
</html>`
  }

  return (
    <div className="compare-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>版本对比</h2>
        {result && (
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : '📄 导出报告'}
          </button>
        )}
      </div>

      <div className="compare-selectors">
        <div className="select-wrapper">
          <div className="select-label">选择版本 A {baselineId === id1 ? '（基准）' : ''}</div>
          <select className="version-select" value={id1} onChange={handleVersion1Change}>
            <option value="">请选择版本</option>
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.name}{v.id === baselineId ? ' ★基准' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '24px', color: 'var(--text-color)', opacity: 0.5, alignSelf: 'flex-end', paddingBottom: '10px' }}>
          ⇆
        </div>

        <div className="select-wrapper">
          <div className="select-label">选择版本 B</div>
          <select className="version-select" value={id2} onChange={handleVersion2Change}>
            <option value="">请选择版本</option>
            {versions.filter(v => v.id !== id1).map(v => (
              <option key={v.id} value={v.id}>
                {v.name}{v.id === baselineId ? ' ★基准' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>正在对比配色方案...</div>
        </div>
      )}

      {!id1 || !id2 || id1 === id2 ? (
        !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">
              {versions.length < 2
                ? '请先创建至少2个配色方案版本'
                : '请选择两个不同的版本进行对比'}
            </div>
          </div>
        )
      ) : result && !loading && (
        <div ref={compareRef} style={{ padding: '16px', borderRadius: '12px' }}>
          <div className="compare-rows">
            {result.comparisons.map((item) => {
              const info = getDifferenceInfo(item.difference)

              return (
                <div key={item.index} className="compare-row">
                  <div className="compare-row-colors">
                    <div className="color-swatch" style={{ gap: '6px' }}>
                      <div
                        className="color-block"
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: item.color1.hex,
                          '--glow-color': item.color1.hex + '66'
                        } as React.CSSProperties}
                      />
                      <span className="color-hex">{item.color1.hex.toUpperCase()}</span>
                    </div>
                    <span className="vs-text">VS</span>
                    <div className="color-swatch" style={{ gap: '6px' }}>
                      <div
                        className="color-block"
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: item.color2.hex,
                          '--glow-color': item.color2.hex + '66'
                        } as React.CSSProperties}
                      />
                      <span className="color-hex">{item.color2.hex.toUpperCase()}</span>
                    </div>
                  </div>
                  <span
                    className="difference-badge"
                    style={{ backgroundColor: info.color }}
                  >
                    {item.difference}% · {info.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="overall-summary">
            <div className="overall-label">整体差异</div>
            <div className="overall-value" style={{ color: getDifferenceInfo(result.overallDifference).color }}>
              {result.overallDifference}% · {getDifferenceInfo(result.overallDifference).label}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
