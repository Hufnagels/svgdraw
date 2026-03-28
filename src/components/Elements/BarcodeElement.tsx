import type { BarcodeElement as BarcodeEl } from '../../types/elements'
import { extractInnerSVG } from '../../utils/barcodeRenderer'

interface Props {
  el: BarcodeEl
  onMouseDown?: (e: React.MouseEvent) => void
}

/** Split innerSVG into bars (no <text>) and text-only parts.
 *  Returns rawBarsH = the Y position in raw coords where text begins. */
function splitBarcodeContent(innerSVG: string, rh: number) {
  const textMatches = [...innerSVG.matchAll(/<text\b[^>]*>[\s\S]*?<\/text>/g)]
  if (textMatches.length === 0) return null

  const rawBarsH = Math.min(
    ...textMatches.map((m) => {
      const y = m[0].match(/\by="([0-9.]+)"/)
      return y ? parseFloat(y[1]) : rh
    }),
  )
  if (rawBarsH >= rh) return null  // text starts at/after bottom — treat as no-text

  const barsInner = innerSVG.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, '')
  const textInner = textMatches
    .map((m) => m[0].replace(/\by="([0-9.]+)"/g, (_, y) => `y="${parseFloat(y) - rawBarsH}"`))
    .join('')

  return { barsInner, textInner, rawBarsH }
}

export function BarcodeElement({ el, onMouseDown }: Props) {
  const { transform, style, width, height, cachedSvg, _rawWidth, _rawHeight } = el
  const cx = transform.x + width / 2
  const cy = transform.y + height / 2

  const outerTransform = transform.rotation
    ? `translate(${transform.x}, ${transform.y}) rotate(${transform.rotation} ${width / 2} ${height / 2})`
    : `translate(${transform.x}, ${transform.y})`

  if (!cachedSvg) {
    return (
      <g
        data-element-id={el.id}
        transform={outerTransform}
        onMouseDown={onMouseDown}
        style={{ cursor: 'move' }}
      >
        <rect x={0} y={0} width={width} height={height} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
        <text x={width / 2} y={height / 2 + 5} textAnchor="middle" fill="#64748b" fontSize={12}>Barcode</text>
      </g>
    )
  }

  const { innerSVG, rawWidth, rawHeight } = extractInnerSVG(cachedSvg)
  const rw = _rawWidth || rawWidth
  const rh = _rawHeight || rawHeight
  const scaleX = width / rw

  const split = splitBarcodeContent(innerSVG, rh)

  if (!split) {
    // No text present — uniform scaling
    return (
      <g
        data-element-id={el.id}
        transform={outerTransform}
        opacity={style.opacity}
        onMouseDown={onMouseDown}
        style={{ cursor: 'move' }}
      >
        <g
          transform={`scale(${scaleX}, ${height / rh})`}
          dangerouslySetInnerHTML={{ __html: innerSVG }}
        />
      </g>
    )
  }

  const { barsInner, textInner, rawBarsH } = split
  const rawTextH = rh - rawBarsH

  // Text scales only with width (same X scale both axes → preserves text aspect ratio)
  const textRenderedH = rawTextH * scaleX
  const barsRenderedH = Math.max(1, height - textRenderedH)
  const barsScaleY = rawBarsH > 0 ? barsRenderedH / rawBarsH : scaleX

  const clipId = `bc-clip-${el.id}`

  return (
    <g
      data-element-id={el.id}
      transform={outerTransform}
      opacity={style.opacity}
      onMouseDown={onMouseDown}
      style={{ cursor: 'move' }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={barsRenderedH} />
        </clipPath>
      </defs>

      {/* Bars — Y-scale is independent of text, stretches/shrinks with height */}
      <g clipPath={`url(#${clipId})`}>
        <g
          transform={`scale(${scaleX}, ${barsScaleY})`}
          dangerouslySetInnerHTML={{ __html: barsInner }}
        />
      </g>

      {/* Text — only scales proportionally with width, fixed height */}
      <g
        transform={`translate(0, ${barsRenderedH}) scale(${scaleX}, ${scaleX})`}
        dangerouslySetInnerHTML={{ __html: textInner }}
      />
    </g>
  )
}
