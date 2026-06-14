import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { ModelData } from '@/types'
import { eventBus } from '@/utils/EventBus'
import { generateUUID } from '@/utils/uuid'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.gltf', '.glb']

class FileUploader {
  private loader: GLTFLoader
  private isLoading: boolean = false

  constructor() {
    this.loader = new GLTFLoader()
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `不支持的文件格式。仅支持 ${ALLOWED_EXTENSIONS.join('、')} 格式`,
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `文件过大。最大支持 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`,
      }
    }

    return { valid: true }
  }

  async loadModel(file: File): Promise<ModelData | null> {
    if (this.isLoading) {
      console.warn('[FileUploader] 已有文件正在加载中')
      return null
    }

    const validation = this.validateFile(file)
    if (!validation.valid) {
      eventBus.emit('model:error', { message: validation.error || '文件验证失败' })
      return null
    }

    this.isLoading = true

    try {
      const arrayBuffer = await file.arrayBuffer()
      const gltf = await this.parseGLTF(arrayBuffer, file.name)

      const modelData: ModelData = {
        id: generateUUID(),
        name: file.name,
        scene: gltf.scene,
        materials: gltf.materials || [],
        hasUVs: this.checkHasUVs(gltf.scene),
        fileSize: file.size,
      }

      eventBus.emit('model:loaded', modelData)
      return modelData
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '模型加载失败'
      eventBus.emit('model:error', { message: errorMessage })
      console.error('[FileUploader] 加载模型失败:', error)
      return null
    } finally {
      this.isLoading = false
    }
  }

  private parseGLTF(
    arrayBuffer: ArrayBuffer,
    fileName: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              resolve(gltf)
            },
            (error) => {
              reject(error)
            }
          )
    })
  }

  private checkHasUVs(scene: THREE.Group): boolean {
    let hasUVs = false

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry
        if (geometry.attributes.uv) {
          hasUVs = true
        }
      }
    })

    return hasUVs
  }

  getIsLoading(): boolean {
    return this.isLoading
  }
}

export const fileUploader = new FileUploader()
export default FileUploader
