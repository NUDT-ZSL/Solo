import { SceneSetup } from '@/scene/SceneSetup'

let sceneSetup: SceneSetup | null = null

function init(): void {
  sceneSetup = new SceneSetup('canvas-container')
  sceneSetup.start()

  window.addEventListener('beforeunload', () => {
    if (sceneSetup) {
      sceneSetup.dispose()
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
