import { useRef, useEffect } from 'react'
import { useDrawingStore } from '../../store/useDrawingStore'
import type { TextElement as TextEl } from '../../types/elements'

interface Props {
  el: TextEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function TextElement({ el, onMouseDown }: Props) {
  const { transform, style, content, fontFamily, fontSize, fontWeight, fontStyle, width, height, textAnchor } = el
  const editingTextId = useDrawingStore((s) => s.editingTextId)
  const setEditingTextId = useDrawingStore((s) => s.setEditingTextId)
  const updateElement = useDrawingStore((s) => s.updateElement)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEditing = editingTextId === el.id

  const cx = transform.x + width / 2
  const cy = transform.y + height / 2

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setEditingTextId(el.id)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    updateElement(el.id, { content: e.target.value } as Partial<TextEl>)
  }

  function handleBlur() {
    setEditingTextId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setEditingTextId(null)
    }
    e.stopPropagation()
  }

  return (
    <g
      data-element-id={el.id}
      transform={transform.rotation ? `rotate(${transform.rotation} ${cx} ${cy})` : undefined}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <foreignObject x={transform.x} y={transform.y} width={Math.max(width, 80)} height={Math.max(height, 30)}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              height: '100%',
              fontFamily,
              fontSize: `${fontSize}px`,
              fontWeight,
              fontStyle,
              color: style.fill === 'none' ? '#000' : style.fill,
              background: 'transparent',
              border: '1px dashed #3b82f6',
              outline: 'none',
              resize: 'none',
              padding: '2px',
              boxSizing: 'border-box',
            }}
          />
        </foreignObject>
      ) : (
        <text
          x={textAnchor === 'middle' ? cx : textAnchor === 'end' ? transform.x + width : transform.x}
          y={transform.y + fontSize}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          fill={style.fill}
          stroke={style.stroke === 'none' ? undefined : style.stroke}
          strokeWidth={style.stroke === 'none' ? undefined : style.strokeWidth}
          opacity={style.opacity}
          textAnchor={textAnchor}
          onMouseDown={onMouseDown}
          style={{ cursor: 'move', userSelect: 'none' }}
        >
          {content.split('\n').map((line, i) => (
            <tspan key={i} x={textAnchor === 'middle' ? cx : textAnchor === 'end' ? transform.x + width : transform.x} dy={i === 0 ? 0 : fontSize * 1.2}>
              {line || ' '}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}
