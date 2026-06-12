import type { ComponentMeta, StyleConfig } from '@/types'

export function transformComponent(component: ComponentMeta, styleConfig: StyleConfig): string {
  const { name, defaultProps } = component
  const propsStr = Object.entries(defaultProps)
    .map(([key, value]) => {
      if (typeof value === 'string') return `${key}="${value}"`
      if (typeof value === 'boolean') return value ? key : `${key}={false}`
      if (Array.isArray(value)) return `${key}={${JSON.stringify(value)}}`
      if (typeof value === 'object' && value !== null) return `${key}={${JSON.stringify(value)}}`
      return `${key}={${value}}`
    })
    .join('\n      ')

  const styleStr = Object.entries(styleConfig)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${cssKey}: ${typeof value === 'number' && key !== 'fontSize' ? `${value}px` : value}`
    })
    .join(',\n    ')

  return `import React from 'react'
import styles from './${name}.module.css'

interface ${name}Props {
${Object.entries(defaultProps)
  .map(([key, value]) => `  ${key}: ${typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'unknown'}`)
  .join('\n')}
}

const ${name}: React.FC<${name}Props> = ({
${Object.entries(defaultProps)
  .map(([key, value]) => `  ${key} = ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`)
  .join(',\n')}
}) => {
  return (
    <${name.toLowerCase()}
      className={styles.container}
      ${propsStr}
      style={{
        ${styleStr},
      }}
    >
      {${name} Content
    </${name.toLowerCase()}>
  )
}

export default ${name}`
}

export function generateCssFile(component: ComponentMeta, styleConfig: StyleConfig): string {
  return `.${component.name.toLowerCase()}-container {
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}`
}
