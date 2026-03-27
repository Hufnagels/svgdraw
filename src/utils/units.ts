export const DPI_OPTIONS = [203, 300, 600] as const
export type DPI = typeof DPI_OPTIONS[number]

export function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm * dpi / 25.4)
}

export function pxToMm(px: number, dpi: number): number {
  return Math.round(px * 25.4 / dpi * 10) / 10
}
