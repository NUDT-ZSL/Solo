import * as THREE from 'three'
import { GalleryScene } from './galleryScene'
import { ArtworkManager } from './artworkManager'
import { InteractionController } from './interactionController'
import { eventBus, ArtworkClickPayload } from './eventBus'

class GalleryWalkApp {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private galleryScene: GalleryScene
  private artworkManager: ArtworkManager
  private interactionController: InteractionController
  private clock: THREE.Clock
  private infoPanel: HTMLElement | null = null
  private navBar: HTMLElement | null = null

  constructor() {
    const container = document.getElementById('app')!

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.scene.fog = new THREE.Fog(0x1a1a2e, 15, 25)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(0, 1.6, 5)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    container.appendChild(this.renderer.domElement)

    this.clock = new THREE.Clock()

    this.galleryScene = new GalleryScene(this.scene)
    this.artworkManager = new ArtworkManager()
    this.interactionController = new InteractionController(
      this.camera,
      this.renderer.domElement,
      this.galleryScene
    )

    this.createUI()
    this.setupEventListeners()
    this.setupResize()
    this.animate()
  }

  private createUI(): void {
    this.createNavBar()
    this.createInfoPanel()
  }

  private createNavBar(): void {
    const nav = document.createElement('div')
    nav.id = 'gallery-nav'
    nav.innerHTML = `
      <style>
        #gallery-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(245, 240, 225, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          z-index: 10;
          border-bottom: 1px solid rgba(139, 115, 85, 0.2);
        }
        .nav-tab {
          position: relative;
          padding: 8px 16px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #4a4535;
          cursor: pointer;
          transition: color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          background: none;
          border: none;
          outline: none;
        }
        .nav-tab::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 3px;
          background: #ffd700;
          transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          border-radius: 2px;
        }
        .nav-tab:hover {
          color: #1a1a2e;
        }
        .nav-tab.active {
          color: #1a1a2e;
          font-weight: 600;
        }
        .nav-tab.active::after {
          width: 100%;
        }
        @media (max-width: 768px) {
          .nav-tab {
            font-size: 14px;
          }
          #gallery-nav {
            gap: 20px;
          }
        }
      </style>
    `

    const seriesNames = this.artworkManager.getSeriesNames()
    seriesNames.forEach(name => {
      const tab = document.createElement('button')
      tab.className = 'nav-tab'
      tab.textContent = name
      if (name === this.artworkManager.getCurrentSeries()) {
        tab.classList.add('active')
      }
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        eventBus.emit('series-change-request', { seriesName: name })
      })
      nav.appendChild(tab)
    })

    document.getElementById('app')!.appendChild(nav)
    this.navBar = nav
  }

  private createInfoPanel(): void {
    const panel = document.createElement('div')
    panel.id = 'info-panel'
    panel.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%) translateY(120%);
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      z-index: 10;
      min-width: 360px;
      max-width: 480px;
      transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 0;
      border: 1px solid rgba(255, 215, 0, 0.2);
    `

    panel.innerHTML = `
      <style>
        #info-panel .panel-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #ffd700;
        }
        #info-panel .panel-meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 12px;
        }
        #info-panel .panel-desc {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 16px;
        }
        #info-panel .panel-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        #info-panel .panel-btn {
          width: 120px;
          height: 36px;
          border-radius: 8px;
          background: #ffd700;
          color: #1a1a2e;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        #info-panel .panel-btn:hover {
          background: #e6c200;
        }
        #info-panel .panel-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        #info-panel .panel-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      </style>
      <button class="panel-close" id="panel-close-btn">&times;</button>
      <div class="panel-title" id="panel-title"></div>
      <div class="panel-meta" id="panel-meta"></div>
      <div class="panel-desc" id="panel-desc"></div>
      <div class="panel-buttons">
        <button class="panel-btn" id="prev-btn">上一幅</button>
        <button class="panel-btn" id="next-btn">下一幅</button>
      </div>
    `

    document.getElementById('app')!.appendChild(panel)
    this.infoPanel = panel

    document.getElementById('panel-close-btn')!.addEventListener('click', () => {
      this.hideInfoPanel()
    })

    document.getElementById('prev-btn')!.addEventListener('click', () => {
      const currentIndex = this.interactionController.getFocusedIndex()
      const count = this.galleryScene.getFrameCount()
      const prevIndex = (currentIndex - 1 + count) % count
      eventBus.emit('navigate-artwork', { fromIndex: currentIndex, toIndex: prevIndex })
    })

    document.getElementById('next-btn')!.addEventListener('click', () => {
      const currentIndex = this.interactionController.getFocusedIndex()
      const count = this.galleryScene.getFrameCount()
      const nextIndex = (currentIndex + 1) % count
      eventBus.emit('navigate-artwork', { fromIndex: currentIndex, toIndex: nextIndex })
    })
  }

  private showInfoPanel(artwork: ArtworkClickPayload): void {
    const data = this.artworkManager.getArtwork(artwork.index)
    if (!data || !this.infoPanel) return

    document.getElementById('panel-title')!.textContent = data.title
    document.getElementById('panel-meta')!.textContent = `${data.author} · ${data.year} · ${data.seriesName}`
    document.getElementById('panel-desc')!.textContent = data.description

    this.infoPanel.style.transform = 'translateX(-50%) translateY(0)'
    this.infoPanel.style.opacity = '1'
  }

  private hideInfoPanel(): void {
    if (!this.infoPanel) return
    this.infoPanel.style.transform = 'translateX(-50%) translateY(120%)'
    this.infoPanel.style.opacity = '0'
    eventBus.emit('close-panel')
  }

  private setupEventListeners(): void {
    eventBus.on('artwork-clicked', (payload: ArtworkClickPayload) => {
      this.showInfoPanel(payload)
    })

    eventBus.on('series-changed', () => {
      this.hideInfoPanel()
    })
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.fov = window.innerWidth < 768 ? 75 : 60
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const delta = this.clock.getDelta()
    const clampedDelta = Math.min(delta, 0.1)

    this.galleryScene.update(clampedDelta)
    this.interactionController.update(clampedDelta)

    this.renderer.render(this.scene, this.camera)
  }
}

new GalleryWalkApp()
