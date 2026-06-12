import JSZip from 'jszip'
import type { ComponentMeta, StyleConfig } from '@/types'
import { transformComponent, generateCssFile } from './transformComponent'

export async function downloadComponentZip(components: ComponentMeta[], getStyleConfig: (id: string) => StyleConfig) {
  const zip = new JSZip()

  for (const component of components) {
    const styleConfig = getStyleConfig(component.id)
    const folder = zip.folder(component.category.replace(/^\//, ''))!
    const tsxContent = transformComponent(component, styleConfig)
    const cssContent = generateCssFile(component, styleConfig)
    folder.file(`${component.name}.tsx`, tsxContent)
    folder.file(`${component.name}.module.css`, cssContent)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ComponentVault.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
