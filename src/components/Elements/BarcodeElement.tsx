import type { BarcodeElement as BarcodeEl } from '../../types/elements'
import { extractInnerSVG } from '../../utils/barcodeRenderer'

interface Props {
  el: BarcodeEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function BarcodeElement({ el, onMouseDown }: Props) {
  const { transform, style, width, height, cachedSvg, _rawWidth, _rawHeight } = el
  const cx = transform.x + width / 2
  const cy = transform.y + height / 2

  if (!cachedSvg) {
    return (
      <g
        data-element-id={el.id}
        transform={transform.rotation ? `rotate(${transform.rotation} ${cx} ${cy})` : undefined}
        onMouseDown={onMouseDown}
        style={{ cursor: 'move' }}
      >
        <rect x={transform.x} y={transform.y} width={width} height={height} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#64748b" fontSize={12}>Barcode</text>
      </g>
    )
  }

  const { innerSVG, rawWidth, rawHeight } = extractInnerSVG(cachedSvg)
  const rw = _rawWidth || rawWidth
  const rh = _rawHeight || rawHeight

  const scaleX = width / rw
  const scaleY = height / rh

  return (
    <g
      data-element-id={el.id}
      transform={transform.rotation ? `rotate(${transform.rotation} ${cx} ${cy})` : undefined}
      opacity={style.opacity}
      onMouseDown={onMouseDown}
      style={{ cursor: 'move' }}
    >
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${scaleX}, ${scaleY})`}
         dangerouslySetInnerHTML={{ __html: innerSVG }}
      />
    </g>
  )
}
