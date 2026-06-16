import * as THREE from 'three'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { IWalletSettings, IExportParams, WALLET_STYLE_NAMES, TEXTURE_NAMES, STITCH_NAMES } from '@/types'

export async function exportSnapshot(
  scene: THREE.Scene,
  camera: THREE.Camera,
  settings: IWalletSettings,
): Promise<void> {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(800, 600)
  renderer.setPixelRatio(1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x0d0d0d, 1)

  renderer.render(scene, camera)

  const canvas = renderer.domElement
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to generate image blob'))
    }, 'image/png')
  })

  const exportParams: IExportParams = {
    styleName: WALLET_STYLE_NAMES[settings.style],
    colorHex: settings.color,
    textureName: TEXTURE_NAMES[settings.texture] || settings.texture,
    stitchType: STITCH_NAMES[settings.stitchType],
    timestamp: Date.now(),
  }

  const paramsJson = JSON.stringify(exportParams, null, 2)

  const zip = new JSZip()
  zip.file('preview.png', blob)
  zip.file('params.json', paramsJson)

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveAs(zipBlob, 'design_snapshot.zip')

  renderer.dispose()
}
