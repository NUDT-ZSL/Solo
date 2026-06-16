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
  renderer.shadowMap