import type { BarcodeSymbology } from '../types/elements'
import * as bwipjsModule from 'bwip-js'

// bwip-js exposes toSVG at runtime but the @types package is incomplete
interface BwipJsWithSVG {
  toSVG: (opts: Record<string, unknown>) => string
}

const bwipjs = bwipjsModule as unknown as BwipJsWithSVG

export interface BarcodeRenderResult {
  svgString: string
  rawWidth: number
  rawHeight: number
  innerSVG: string // stripped of outer <svg> tag
}

export async function renderBarcode(
  symbology: BarcodeSymbology,
  data: string,
  options: { includeText?: boolean; height?: number; scale?: number } = {}
): Promise<BarcodeRenderResult> {
  if (!data.trim()) {
    return { svgString: '', rawWidth: 200, rawHeight: 100, innerSVG: '' }
  }

  const svgString = bwipjs.toSVG({
    bcid: symbology,
    text: data,
    scale: options.scale ?? 3,
    height: options.height ?? 10,
    includetext: options.includeText ?? true,
    textxalign: 'center',
  })

  // Parse viewBox dimensions
  const viewBoxMatch = svgString.match(/viewBox="[^"]*?(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)"/)
  const rawWidth = viewBoxMatch ? parseFloat(viewBoxMatch[3]) : 200
  const rawHeight = viewBoxMatch ? parseFloat(viewBoxMatch[4]) : 100

  // Extract inner content (everything between <svg...> and </svg>)
  const innerSVG = svgString.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '')

  return { svgString, rawWidth, rawHeight, innerSVG }
}

export function extractInnerSVG(svgString: string): { innerSVG: string; rawWidth: number; rawHeight: number } {
  const viewBoxMatch = svgString.match(/viewBox="[^"]*?(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)"/)
  const rawWidth = viewBoxMatch ? parseFloat(viewBoxMatch[3]) : 200
  const rawHeight = viewBoxMatch ? parseFloat(viewBoxMatch[4]) : 100
  const innerSVG = svgString.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  return { innerSVG, rawWidth, rawHeight }
}
