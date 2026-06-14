import jsPDF from 'jspdf'
import type { Annotation } from '@/types'
import { eventBus } from '@/utils/EventBus'
import { annotationEngine } from '@/modules/annotation/AnnotationEngine'

const SNAPSHOT_WIDTH = 1200
const SNAPSHOT_HEIGHT = 800
const A4_WIDTH = 210
const A4_HEIGHT = 297
const MARGIN = 15
const CIRCLE_IMAGE_SIZE = 30

class ReportExporter {
  private currentModelName: string = '未命名模型'
  private isExporting: boolean = false

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    eventBus.on('model:loaded', (modelData) => {
      this.currentModelName = modelData.name
    })

    eventBus.on('report:export', () => {
      this.exportAsPDF()
    })
  }

  async exportAsPDF(): Promise<boolean> {
    if (this.isExporting) {
      console.warn('[ReportExporter] 已有导出任务正在进行中')
      return false
    }

    this.isExporting = true

    try {
      const annotations = annotationEngine.getAllAnnotations()

      if (annotations.length === 0) {
        eventBus.emit('report:exported', {
          success: false,
          message: '没有批注可导出',
        })
        return false
      }

      eventBus.emit('viewer:request-snapshot', {
        width: SNAPSHOT_WIDTH,
        height: SNAPSHOT_HEIGHT,
      })

      const snapshotDataUrl = await this.waitForSnapshot()

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      this.addCoverPage(doc, annotations.length)

      annotations.forEach((annotation, index) => {
        this.addAnnotationPage(doc, annotation, index + 1, snapshotDataUrl)
      })

      const fileName = `${this.currentModelName.replace(/\.[^/.]+$/, '')}_审阅报告_${this.formatDate(new Date())}.pdf`
      doc.save(fileName)

      eventBus.emit('report:exported', {
        success: true,
        message: 'PDF 报告导出成功',
      })

      return true
    } catch (error) {
      console.error('[ReportExporter] 导出 PDF 失败:', error)
      eventBus.emit('report:exported', {
        success: false,
        message: error instanceof Error ? error.message : '导出失败',
      })
      return false
    } finally {
      this.isExporting = false
    }
  }

  private waitForSnapshot(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventBus.off('viewer:snapshot-ready', handler)
        reject(new Error('获取截图超时'))
      }, 5000)

      const handler = (dataUrl: string) => {
        clearTimeout(timeout)
        if (dataUrl) {
          resolve(dataUrl)
        } else {
          reject(new Error('截图数据为空'))
        }
      }

      eventBus.once('viewer:snapshot-ready', handler as any)
    })
  }

  private addCoverPage(doc: jsPDF, annotationCount: number): void {
    const pageWidth = A4_WIDTH
    const pageHeight = A4_HEIGHT

    doc.setFillColor(26, 32, 44)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    doc.setTextColor(226, 232, 240)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('模型审阅报告', pageWidth / 2, pageHeight / 2 - 20, {
      align: 'center',
    })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(this.currentModelName, pageWidth / 2, pageHeight / 2, {
      align: 'center',
    })

    doc.setFontSize(12)
    doc.setTextColor(113, 128, 150)
    doc.text(
      `批注数量：${annotationCount} 条`,
      pageWidth / 2,
      pageHeight / 2 + 15,
      { align: 'center' }
    )

    doc.text(
      `导出时间：${this.formatDateTime(new Date())}`,
      pageWidth / 2,
      pageHeight / 2 + 25,
      { align: 'center' }
    )

    doc.addPage()
  }

  private addAnnotationPage(
    doc: jsPDF,
    annotation: Annotation,
    pageNum: number,
    snapshotDataUrl: string
  ): void {
    const pageWidth = A4_WIDTH
    const pageHeight = A4_HEIGHT
    const contentTop = MARGIN + 20
    const contentWidth = pageWidth - MARGIN * 2

    this.addHeader(doc, pageNum)

    const imgWidth = CIRCLE_IMAGE_SIZE
    const imgHeight = CIRCLE_IMAGE_SIZE
    const imgX = MARGIN
    const imgY = contentTop

    const circleImg = this.createCircleImage(snapshotDataUrl, annotation)
    if (circleImg) {
      doc.addImage(circleImg, 'PNG', imgX, imgY, imgWidth, imgHeight)
    } else {
      doc.setFillColor(247, 37, 133)
      doc.ellipse(
        imgX + imgWidth / 2,
        imgY + imgHeight / 2,
        imgWidth / 2,
        imgHeight / 2,
        'F'
      )
    }

    const textX = imgX + imgWidth + 10
    const textWidth = contentWidth - imgWidth - 10

    doc.setTextColor(226, 232, 240)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`批注 #${pageNum}`, textX, contentTop + 5)

    doc.setTextColor(148, 163, 184)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `作者：${annotation.author}`,
      textX,
      contentTop + 12
    )

    doc.text(
      `时间：${this.formatDateTime(new Date(annotation.timestamp))}`,
      textX,
      contentTop + 18
    )

    doc.text(
      `UV坐标：(${annotation.uvCoord.u.toFixed(3)}, ${annotation.uvCoord.v.toFixed(3)})`,
      textX,
      contentTop + 24
    )

    const dividerY = contentTop + 30
    doc.setDrawColor(74, 85, 104)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, dividerY, pageWidth - MARGIN, dividerY)

    doc.setTextColor(226, 232, 240)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    const textContent = annotation.text || '（无批注内容）'
    const splitText = doc.splitTextToSize(textContent, textWidth)
    doc.text(splitText, MARGIN, dividerY + 10)

    const fullImgWidth = contentWidth
    const fullImgHeight = (fullImgWidth * SNAPSHOT_HEIGHT) / SNAPSHOT_WIDTH
    const fullImgY = pageHeight - MARGIN - fullImgHeight

    if (fullImgY > dividerY + 40) {
      doc.addImage(
        snapshotDataUrl,
        'PNG',
        MARGIN,
        Math.max(fullImgY, dividerY + 40),
        fullImgWidth,
        fullImgHeight
      )
    }

    this.addFooter(doc, pageNum)
  }

  private addHeader(doc: jsPDF, pageNum: number): void {
    const pageWidth = A4_WIDTH

    doc.setFillColor(45, 55, 72)
    doc.rect(0, 0, pageWidth, MARGIN + 5, 'F')

    doc.setTextColor(226, 232, 240)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(this.currentModelName, MARGIN, 12)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(
      this.formatDateTime(new Date()),
      pageWidth - MARGIN,
      12,
      { align: 'right' }
    )
  }

  private addFooter(doc: jsPDF, pageNum: number): void {
    const pageWidth = A4_WIDTH
    const pageHeight = A4_HEIGHT

    doc.setTextColor(113, 128, 150)
    doc.setFontSize(8)
    doc.text(
      `ModelPin 审阅报告 · 第 ${pageNum} 页`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  private createCircleImage(
    _snapshotDataUrl: string,
    _annotation: Annotation
  ): string | null {
    return null
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  getIsExporting(): boolean {
    return this.isExporting
  }
}

export const reportExporter = new ReportExporter()
export default ReportExporter
