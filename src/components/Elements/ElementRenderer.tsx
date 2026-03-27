import type { DrawingElement } from '../../types/elements'
import { CircleElement } from './CircleElement'
import { RectElement } from './RectElement'
import { LineElement } from './LineElement'
import { TextElement } from './TextElement'
import { ImageElement } from './ImageElement'
import { BarcodeElement } from './BarcodeElement'
import { QRElement } from './QRElement'
import { FreehandElement } from './FreehandElement'
import { GroupElement } from './GroupElement'

interface Props {
  el: DrawingElement
  elements: Record<string, DrawingElement>
  onMouseDown?: (e: React.MouseEvent) => void
}

export function ElementRenderer({ el, elements, onMouseDown }: Props) {
  if (!el.visible) return null
  switch (el.type) {
    case 'circle':    return <CircleElement el={el} onMouseDown={onMouseDown} />
    case 'rect':      return <RectElement el={el} onMouseDown={onMouseDown} />
    case 'line':      return <LineElement el={el} onMouseDown={onMouseDown} />
    case 'text':      return <TextElement el={el} onMouseDown={onMouseDown} />
    case 'image':     return <ImageElement el={el} onMouseDown={onMouseDown} />
    case 'barcode':   return <BarcodeElement el={el} onMouseDown={onMouseDown} />
    case 'qr':        return <QRElement el={el} onMouseDown={onMouseDown} />
    case 'freehand':  return <FreehandElement el={el} onMouseDown={onMouseDown} />
    case 'group':     return <GroupElement el={el} elements={elements} onMouseDown={onMouseDown} />
    default:          return null
  }
}
