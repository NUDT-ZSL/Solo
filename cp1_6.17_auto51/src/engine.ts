import type {
  FlexContainerProps,
  GridContainerProps,
  LayoutItem,
  FlexItemProps,
  GridItemProps
} from './store'

export function calcFlexCSS(
  containerProps: FlexContainerProps,
  items: LayoutItem[]
): { containerCSS: string; itemsCSS: string[] } {
  const containerCSS = `
.container {
  display: flex;
  flex-direction: ${containerProps.flexDirection};
  justify-content: ${containerProps.justifyContent};
  align-items: ${containerProps.alignItems};
  flex-wrap: ${containerProps.flexWrap};
  gap: ${containerProps.gap}px;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}
`.trim()

  const itemsCSS = items.map((item, index) => {
    const props = item.flexProps
    const widthValue = typeof props.width === 'number' ? `${props.width}px` : props.width
    const heightValue = typeof props.height === 'number' ? `${props.height}px` : props.height
    return `
.item-${index} {
  width: ${widthValue};
  height: ${heightValue};
  background-color: ${item.color};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  align-self: ${props.alignSelf};
  order: ${props.order};
  flex-grow: ${props.flexGrow};
  flex-shrink: ${props.flexShrink};
}
`.trim()
  })

  return { containerCSS, itemsCSS }
}

export function calcGridCSS(
  containerProps: GridContainerProps,
  items: LayoutItem[]
): { containerCSS: string; itemsCSS: string[] } {
  const containerCSS = `
.container {
  display: grid;
  grid-template-columns: ${containerProps.gridTemplateColumns};
  grid-template-rows: ${containerProps.gridTemplateRows};
  justify-items: ${containerProps.justifyItems};
  align-items: ${containerProps.alignItems};
  justify-content: ${containerProps.justifyContent};
  align-content: ${containerProps.alignContent};
  gap: ${containerProps.gap}px;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}
`.trim()

  const itemsCSS = items.map((item, index) => {
    const props = item.gridProps
    const widthValue = typeof props.width === 'number' ? `${props.width}px` : props.width
    const heightValue = typeof props.height === 'number' ? `${props.height}px` : props.height
    return `
.item-${index} {
  width: ${widthValue};
  height: ${heightValue};
  background-color: ${item.color};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  align-self: ${props.alignSelf};
  justify-self: ${props.justifySelf};
  order: ${props.order};
  grid-column: ${props.gridColumn};
  grid-row: ${props.gridRow};
}
`.trim()
  })

  return { containerCSS, itemsCSS }
}

export function generateFullCSS(
  layoutType: 'flex' | 'grid',
  flexContainer: FlexContainerProps,
  gridContainer: GridContainerProps,
  items: LayoutItem[]
): string {
  const result =
    layoutType === 'flex'
      ? calcFlexCSS(flexContainer, items)
      : calcGridCSS(gridContainer, items)

  return `/* ===== 容器样式 ===== */
${result.containerCSS}

/* ===== 子元素样式 ===== */
${result.itemsCSS.join('\n\n')}
`
}

export function getContainerStyle(
  layoutType: 'flex' | 'grid',
  flexContainer: FlexContainerProps,
  gridContainer: GridContainerProps
): React.CSSProperties {
  if (layoutType === 'flex') {
    return {
      display: 'flex',
      flexDirection: flexContainer.flexDirection,
      justifyContent: flexContainer.justifyContent,
      alignItems: flexContainer.alignItems,
      flexWrap: flexContainer.flexWrap,
      gap: `${flexContainer.gap}px`,
      width: '100%',
      height: '100%',
      padding: '20px',
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    }
  } else {
    return {
      display: 'grid',
      gridTemplateColumns: gridContainer.gridTemplateColumns,
      gridTemplateRows: gridContainer.gridTemplateRows,
      justifyItems: gridContainer.justifyItems,
      alignItems: gridContainer.alignItems,
      justifyContent: gridContainer.justifyContent,
      alignContent: gridContainer.alignContent,
      gap: `${gridContainer.gap}px`,
      width: '100%',
      height: '100%',
      padding: '20px',
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    }
  }
}

export function getItemStyle(
  layoutType: 'flex' | 'grid',
  item: LayoutItem
): React.CSSProperties {
  if (layoutType === 'flex') {
    const props = item.flexProps
    const widthValue = typeof props.width === 'number' ? `${props.width}px` : props.width
    const heightValue = typeof props.height === 'number' ? `${props.height}px` : props.height
    return {
      width: widthValue,
      height: heightValue,
      backgroundColor: item.color,
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      alignSelf: props.alignSelf,
      order: props.order,
      flexGrow: props.flexGrow,
      flexShrink: props.flexShrink,
      transition: 'all 0.3s ease',
      cursor: 'grab'
    }
  } else {
    const props = item.gridProps
    const widthValue = typeof props.width === 'number' ? `${props.width}px` : props.width
    const heightValue = typeof props.height === 'number' ? `${props.height}px` : props.height
    return {
      width: widthValue,
      height: heightValue,
      backgroundColor: item.color,
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      alignSelf: props.alignSelf,
      justifySelf: props.justifySelf,
      order: props.order,
      gridColumn: props.gridColumn,
      gridRow: props.gridRow,
      transition: 'all 0.3s ease',
      cursor: 'grab'
    }
  }
}
