import { useEffect, useRef, useCallback } from 'react'
import { Eraser, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CANVAS_COLORS, BRUSH_SIZES } from '@/lib/drawl/constants'
import type { Stroke } from '@/lib/drawl/types'

type BrushSize = 'small' | 'medium' | 'large'

export interface DrawCanvasProps {
  /** If true, the user can draw. If false, canvas is read-only (guesser view). */
  readOnly?: boolean
  /** Current strokes from game state — redrawn on every poll update */
  strokes: Stroke[]
  /** Called when the drawer completes a stroke (pointerup) */
  onStrokeComplete?: (stroke: Stroke) => void
  /** Called when the drawer hits Clear */
  onClear?: () => void
}

function normalize(px: number, total: number): number {
  return px / total
}

function denormalize(n: number, total: number): number {
  return n * total
}

function redrawStrokes(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, strokes: Stroke[]) {

  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.beginPath()
    ctx.strokeStyle = stroke.isEraser ? '#1e1e1e' : stroke.color
    ctx.lineWidth = stroke.size * (stroke.isEraser ? 2.5 : 1)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const [first, ...rest] = stroke.points
    ctx.moveTo(
      denormalize(first[0], canvas.width),
      denormalize(first[1], canvas.height),
    )
    for (const [x, y] of rest) {
      ctx.lineTo(denormalize(x, canvas.width), denormalize(y, canvas.height))
    }
    ctx.stroke()
  }
}

export function DrawCanvas({ readOnly = false, strokes, onStrokeComplete, onClear }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const currentPoints = useRef<[number, number][]>([])

  const [color, setColor] = useState(CANVAS_COLORS[1])
  const [brushSize, setBrushSize] = useState<BrushSize>('medium')
  const [erasing, setErasing] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    requestAnimationFrame(() => redrawStrokes(ctx, canvas, strokes))
  }, [strokes])
  const getNormalizedPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return [
      normalize(e.clientX - rect.left, rect.width),
      normalize(e.clientY - rect.top, rect.height),
    ]
  }, [])
  const drawSegment = useCallback(
    (from: [number, number], to: [number, number]) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const px = BRUSH_SIZES[brushSize]
      ctx.strokeStyle = erasing ? '#1e1e1e' : color
      ctx.lineWidth = px * (erasing ? 2.5 : 1)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(denormalize(from[0], canvas.width), denormalize(from[1], canvas.height))
      ctx.lineTo(denormalize(to[0], canvas.width), denormalize(to[1], canvas.height))
      ctx.stroke()
    },
    [color, brushSize, erasing],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (readOnly) return
      e.currentTarget.setPointerCapture(e.pointerId)
      isDrawing.current = true
      const pos = getNormalizedPos(e)
      currentPoints.current = [pos]
    },
    [readOnly, getNormalizedPos],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || readOnly) return
      const pos = getNormalizedPos(e)
      const prev = currentPoints.current[currentPoints.current.length - 1]
      if (prev) drawSegment(prev, pos)
      currentPoints.current.push(pos)
    },
    [readOnly, getNormalizedPos, drawSegment],
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current || readOnly) return
    isDrawing.current = false

    const points = currentPoints.current
    currentPoints.current = []

    if (points.length < 2) return
    const stroke: Stroke = {
      points,
      color: erasing ? '#1e1e1e' : color,
      size: BRUSH_SIZES[brushSize],
      isEraser: erasing,
    }
    onStrokeComplete?.(stroke)
  }, [readOnly, color, brushSize, erasing, onStrokeComplete])

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onClear?.()
  }, [onClear])

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-3">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full touch-none rounded-lg bg-[#1e1e1e]"
        style={{
          aspectRatio: '8 / 5',
          cursor: readOnly ? 'default' : erasing ? 'cell' : 'crosshair',
        }}
      />

      {/* Toolbar — only shown to the drawer */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Color palette */}
          <div className="flex flex-wrap gap-1.5">
            {CANVAS_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`color ${c}`}
                onClick={() => { setColor(c); setErasing(false) }}
                className={`h-7 w-7 rounded-md border-2 transition ${
                  color === c && !erasing
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Brush sizes */}
          <div className="flex items-center gap-1 rounded-md border border-white/[0.08] p-1">
            {(Object.keys(BRUSH_SIZES) as BrushSize[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setBrushSize(k); setErasing(false) }}
                className={`h-7 w-10 rounded text-xs font-semibold transition ${
                  brushSize === k && !erasing
                    ? 'bg-indigo-500 text-white'
                    : 'text-white/60 hover:bg-white/5'
                }`}
              >
                {k === 'small' ? 'S' : k === 'medium' ? 'M' : 'L'}
              </button>
            ))}
          </div>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setErasing((v) => !v)}
            className={`flex h-9 items-center gap-2 rounded-md border border-white/[0.08] px-3 text-sm transition ${
              erasing ? 'bg-indigo-500 text-white' : 'text-white/80 hover:bg-white/5'
            }`}
          >
            <Eraser className="h-4 w-4" />
            Eraser
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto flex h-9 items-center gap-2 rounded-md border border-white/[0.08] px-3 text-sm text-white/80 transition hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default DrawCanvas