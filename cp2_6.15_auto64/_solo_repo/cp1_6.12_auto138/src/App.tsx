import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useComponents } from '@/hooks/useComponents'
import SidebarTree from '@/components/SidebarTree'
import PreviewCanvas from '@/components/PreviewCanvas'
import PropertyPanel from '@/components/PropertyPanel'
import Toast from '@/components/Toast'
import { transformComponent } from '@/utils/transformComponent'
import { downloadComponentZip } from '@/utils/downloadZip'
import { Download, Package } from 'lucide-react'

export default function App() {
  const {
    components,
    selectedComponentId,
    styleConfig,
    isDrawerOpen,
    toastMessage,
    selectComponent,
    updateStyleConfig,
    resetStyleConfig,
    setDrawerOpen,
    showToast,
    hideToast,
  } = useAppStore()

  useComponents()

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const selectedComponent = useMemo(
    () => components.find((c) => c.id === selectedComponentId) || null,
    [components, selectedComponentId]
  )

  const handleSelect = useCallback(
    (id: string) => {
      selectComponent(id)
      const comp = components.find((c) => c.id === id)
      if (comp) {
        resetStyleConfig(comp.styleConfig)
      }
    },
    [components, selectComponent, resetStyleConfig]
  )

  const handleStyleChange = useCallback(
    (config: Partial<typeof styleConfig>) => {
      updateStyleConfig(config)
    },
    [updateStyleConfig]
  )

  const handleCopyCode = useCallback(() => {
    if (!selectedComponent) return
    const code = transformComponent(selectedComponent, styleConfig)
    navigator.clipboard.writeText(code).then(() => {
      showToast('已复制到剪贴板')
    })
  }, [selectedComponent, styleConfig, showToast])

  const handleDownloadZip = useCallback(async () => {
    await downloadComponentZip(components, (id) => {
      const comp = components.find((c) => c.id === id)
      return comp?.id === selectedComponentId ? styleConfig : comp?.styleConfig || styleConfig
    })
    showToast('组件包已下载')
  }, [components, selectedComponentId, styleConfig, showToast])

  return (
    <div className="h-screen flex flex-col" style={{ background: '#f5f7fa' }}>
      <nav
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 56, backgroundColor: '#2c3e50' }}
      >
        <div className="flex items-center gap-2.5">
          <Package size={22} className="text-white" />
          <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            ComponentVault
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #4A90D9, #50C878)' }}
          >
            CV
          </div>
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        <aside
          className="bg-white border-r border-gray-200 flex flex-col shrink-0"
          style={{ width: 260, minWidth: 260 }}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              组件目录
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarTree
              components={components}
              selectedId={selectedComponentId}
              onSelect={handleSelect}
            />
          </div>
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleDownloadZip}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-white text-xs font-semibold rounded-md transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#50C878', borderRadius: 6, fontFamily: 'DM Sans, sans-serif' }}
            >
              <Download size={14} />
              下载组件包
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-1 min-h-0">
            <PreviewCanvas
              component={selectedComponent}
              styleConfig={styleConfig}
              onCopyCode={handleCopyCode}
            />

            {!isMobile && (
              <PropertyPanel
                styleConfig={styleConfig}
                onChange={handleStyleChange}
              />
            )}
          </div>

          {isMobile && (
            <PropertyPanel
              styleConfig={styleConfig}
              onChange={handleStyleChange}
              isDrawer
              isOpen={isDrawerOpen}
              onToggle={() => setDrawerOpen(!isDrawerOpen)}
            />
          )}
        </main>
      </div>

      <Toast message={toastMessage} onHide={hideToast} />
    </div>
  )
}
