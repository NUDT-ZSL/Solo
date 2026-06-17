import { useStore } from '../store'
import type { FlexContainerProps, GridContainerProps } from '../store'

const flexOptions = {
  flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
  justifyContent: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
  alignItems: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
  flexWrap: ['nowrap', 'wrap', 'wrap-reverse']
}

const gridOptions = {
  justifyItems: ['start', 'end', 'center', 'stretch'],
  alignItems: ['start', 'end', 'center', 'stretch'],
  justifyContent: ['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly'],
  alignContent: ['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch']
}

const flexItemAlignOptions = ['auto', 'flex-start', 'flex-end', 'center', 'stretch', 'baseline']
const gridItemAlignOptions = ['auto', 'start', 'end', 'center', 'stretch']

export function PropertyPanel() {
  const {
    layoutType,
    flexContainer,
    gridContainer,
    items,
    selectedItemId,
    setLayoutType,
    setFlexContainerProp,
    setGridContainerProp,
    setItemProp,
    setSelectedItem
  } = useStore()

  const selectedItem = items.find((item) => item.id === selectedItemId)

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--control-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--control-bg)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--control-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--control-bg)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none'
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    display: 'block'
  }

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: '16px'
  }

  const buttonBaseStyle: React.CSSProperties = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--panel-bg)',
        transition: 'background-color 0.5s ease'
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--panel-bg)',
          zIndex: 10,
          transition: 'background-color 0.5s ease'
        }}
      >
        <button
          onClick={() => setLayoutType('flex')}
          className="ripple-btn"
          style={{
            ...buttonBaseStyle,
            flex: 1,
            backgroundColor: layoutType === 'flex' ? 'var(--accent)' : 'var(--button-inactive-bg)',
            color: layoutType === 'flex' ? 'white' : 'var(--button-inactive-text)'
          }}
        >
          Flexbox
        </button>
        <button
          onClick={() => setLayoutType('grid')}
          className="ripple-btn"
          style={{
            ...buttonBaseStyle,
            flex: 1,
            backgroundColor: layoutType === 'grid' ? 'var(--accent)' : 'var(--button-inactive-bg)',
            color: layoutType === 'grid' ? 'white' : 'var(--button-inactive-text)'
          }}
        >
          Grid
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h3 style={sectionTitleStyle}>容器属性</h3>

          {layoutType === 'flex' ? (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>主轴方向 (flex-direction)</label>
                <select
                  value={flexContainer.flexDirection}
                  onChange={(e) => setFlexContainerProp('flexDirection', e.target.value as FlexContainerProps['flexDirection'])}
                  style={selectStyle}
                >
                  {flexOptions.flexDirection.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>主轴对齐 (justify-content)</label>
                <select
                  value={flexContainer.justifyContent}
                  onChange={(e) => setFlexContainerProp('justifyContent', e.target.value as FlexContainerProps['justifyContent'])}
                  style={selectStyle}
                >
                  {flexOptions.justifyContent.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>交叉轴对齐 (align-items)</label>
                <select
                  value={flexContainer.alignItems}
                  onChange={(e) => setFlexContainerProp('alignItems', e.target.value as FlexContainerProps['alignItems'])}
                  style={selectStyle}
                >
                  {flexOptions.alignItems.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>换行 (flex-wrap)</label>
                <select
                  value={flexContainer.flexWrap}
                  onChange={(e) => setFlexContainerProp('flexWrap', e.target.value as FlexContainerProps['flexWrap'])}
                  style={selectStyle}
                >
                  {flexOptions.flexWrap.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>间距 (gap): {flexContainer.gap}px</label>
                <input
                  type="range"
                  min="0"
                  max="48"
                  value={flexContainer.gap}
                  onChange={(e) => setFlexContainerProp('gap', parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>列模板 (grid-template-columns)</label>
                <input
                  type="text"
                  value={gridContainer.gridTemplateColumns}
                  onChange={(e) => setGridContainerProp('gridTemplateColumns', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>行模板 (grid-template-rows)</label>
                <input
                  type="text"
                  value={gridContainer.gridTemplateRows}
                  onChange={(e) => setGridContainerProp('gridTemplateRows', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>单元格水平对齐 (justify-items)</label>
                <select
                  value={gridContainer.justifyItems}
                  onChange={(e) => setGridContainerProp('justifyItems', e.target.value as GridContainerProps['justifyItems'])}
                  style={selectStyle}
                >
                  {gridOptions.justifyItems.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>单元格垂直对齐 (align-items)</label>
                <select
                  value={gridContainer.alignItems}
                  onChange={(e) => setGridContainerProp('alignItems', e.target.value as GridContainerProps['alignItems'])}
                  style={selectStyle}
                >
                  {gridOptions.alignItems.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>轨道水平对齐 (justify-content)</label>
                <select
                  value={gridContainer.justifyContent}
                  onChange={(e) => setGridContainerProp('justifyContent', e.target.value as GridContainerProps['justifyContent'])}
                  style={selectStyle}
                >
                  {gridOptions.justifyContent.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>轨道垂直对齐 (align-content)</label>
                <select
                  value={gridContainer.alignContent}
                  onChange={(e) => setGridContainerProp('alignContent', e.target.value as GridContainerProps['alignContent'])}
                  style={selectStyle}
                >
                  {gridOptions.alignContent.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>间距 (gap): {gridContainer.gap}px</label>
                <input
                  type="range"
                  min="0"
                  max="48"
                  value={gridContainer.gap}
                  onChange={(e) => setGridContainerProp('gap', parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={sectionTitleStyle}>子元素属性</h3>

          {!selectedItem ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              点击右侧预览区域中的方块以编辑其属性
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                  padding: '12px',
                  backgroundColor: 'var(--selected-item-bg)',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: selectedItem.color,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {selectedItem.id}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    颜色: {selectedItem.color}
                  </div>
                </div>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  宽度 (width): {selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].width}
                  {typeof selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].width === 'number' && 'px'}
                </label>
                <input
                  type="range"
                  min="40"
                  max="300"
                  value={typeof selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].width === 'number' ? selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].width : 120}
                  onChange={(e) => setItemProp(selectedItem.id, layoutType, 'width', parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  高度 (height): {selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].height}
                  {typeof selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].height === 'number' && 'px'}
                </label>
                <input
                  type="range"
                  min="40"
                  max="300"
                  value={typeof selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].height === 'number' ? selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].height : 120}
                  onChange={(e) => setItemProp(selectedItem.id, layoutType, 'height', parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>排序 (order): {selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].order}</label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  value={selectedItem[layoutType === 'flex' ? 'flexProps' : 'gridProps'].order}
                  onChange={(e) => setItemProp(selectedItem.id, layoutType, 'order', parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {layoutType === 'flex' ? (
                <>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>自身对齐 (align-self)</label>
                    <select
                      value={selectedItem.flexProps.alignSelf}
                      onChange={(e) => setItemProp(selectedItem.id, 'flex', 'alignSelf', e.target.value)}
                      style={selectStyle}
                    >
                      {flexItemAlignOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>放大比例 (flex-grow): {selectedItem.flexProps.flexGrow}</label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={selectedItem.flexProps.flexGrow}
                      onChange={(e) => setItemProp(selectedItem.id, 'flex', 'flexGrow', parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>缩小比例 (flex-shrink): {selectedItem.flexProps.flexShrink}</label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={selectedItem.flexProps.flexShrink}
                      onChange={(e) => setItemProp(selectedItem.id, 'flex', 'flexShrink', parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>自身水平对齐 (justify-self)</label>
                    <select
                      value={selectedItem.gridProps.justifySelf}
                      onChange={(e) => setItemProp(selectedItem.id, 'grid', 'justifySelf', e.target.value)}
                      style={selectStyle}
                    >
                      {gridItemAlignOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>自身垂直对齐 (align-self)</label>
                    <select
                      value={selectedItem.gridProps.alignSelf}
                      onChange={(e) => setItemProp(selectedItem.id, 'grid', 'alignSelf', e.target.value)}
                      style={selectStyle}
                    >
                      {gridItemAlignOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>列位置 (grid-column)</label>
                    <input
                      type="text"
                      value={selectedItem.gridProps.gridColumn}
                      onChange={(e) => setItemProp(selectedItem.id, 'grid', 'gridColumn', e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>行位置 (grid-row)</label>
                    <input
                      type="text"
                      value={selectedItem.gridProps.gridRow}
                      onChange={(e) => setItemProp(selectedItem.id, 'grid', 'gridRow', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              <button
                onClick={() => setSelectedItem(null)}
                className="ripple-btn"
                style={{
                  ...buttonBaseStyle,
                  width: '100%',
                  backgroundColor: 'var(--button-inactive-bg)',
                  color: 'var(--button-inactive-text)',
                  marginTop: '8px'
                }}
              >
                取消选择
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
