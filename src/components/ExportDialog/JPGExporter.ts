import { exportSVG } from './SVGExporter'
import type { CanvasSettings } from '../../store/useDrawingStore'

export async function downloadJPG(
  svgEl: SVGSVGElement,
  canvas: CanvasSettings,
  filename = 'drawing.jpg',
  quality = 0.92
): Promise<void> {
  const svgStr = exportSVG(svgEl, canvas)
  const dataUrl = await svgToJPGDataUrl(svgStr, canvas.width, canvas.height, canvas.backgroundColor, quality)

  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export async function svgToJPGDataUrl(
  svgStr: string,
  width: number,
  height: number,
  backgroundColor: string,
  quality: number
): Promise<string> {
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const img = new Image()
  img.src = url

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    setTimeout(reject, 5000) // timeout
  })

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const ctx = offscreen.getContext('2d')!

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  URL.revokeObjectURL(url)
  return offscreen.toDataURL('image/jpeg', quality)
}
