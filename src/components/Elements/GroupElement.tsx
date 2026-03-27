import type { GroupElement as GroupEl, DrawingElement } from '../../types/elements'
import { ElementRenderer } from './ElementRenderer'
import { getGroupBBox } from '../../utils/geometry'

interface Props {
  el: GroupEl
  elements: Record<string, DrawingElement>
  onMouseDown?: (e: React.MouseEvent) => void
}

export function GroupElement({ el, elements, onMouseDown }: Props) {
  const bbox = getGroupBBox(el, elements)
  const groupTransform = el.transform.rotation
    ? `rotate(${el.transform.rotation} ${bbox.cx} ${bbox.cy})`
    : undefined
  return (
    <g data-element-id={el.id} opacity={el.style.opacity} transform={groupTransform} onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      {el.childIds.map((childId) => {
        const child = elements[childId]
        if (!child || !child.visible) return null
        return (
          <ElementRenderer
            key={childId}
            el={child}
            elements={elements}
            onMouseDown={onMouseDown}
          />
        )
      })}
    </g>
  )
}
