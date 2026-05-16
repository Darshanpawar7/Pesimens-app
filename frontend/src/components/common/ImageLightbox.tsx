import { useMemo, useRef, useState, useCallback, type TouchEvent } from 'react'
import { X } from 'lucide-react'

type ImageLightboxProps = {
  isOpen: boolean
  src: string | null | undefined
  alt: string
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function distance(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.hypot(dx, dy)
}

export function ImageLightbox({ isOpen, src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isHaptic, setIsHaptic] = useState(false)

  const pinchStartDistanceRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef(1)
  const panStartTouchRef = useRef<{ x: number; y: number } | null>(null)
  const panStartTranslateRef = useRef({ x: 0, y: 0 })
  const lastTapRef = useRef(0)

  const transformStyle = useMemo(
    () => ({
      transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale}${isHaptic ? ', 0.96' : ''})`,
      transformOrigin: 'center center',
      transition:
        (isHaptic
          ? 'transform 80ms cubic-bezier(.4,1.6,.6,1)'
          : (pinchStartDistanceRef.current === null && !panStartTouchRef.current ? 'transform 120ms ease-out' : 'none')
        ),
    }),
    [scale, translate.x, translate.y, isHaptic]
  )


  // Haptic-like feedback animation
  const triggerHaptic = useCallback(() => {
    setIsHaptic(true)
    setTimeout(() => setIsHaptic(false), 80)
  }, [])

  function resetTransform(withHaptic = false) {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    pinchStartDistanceRef.current = null
    panStartTouchRef.current = null
    if (withHaptic) triggerHaptic()
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const now = Date.now()
    if (event.touches.length === 1) {
      if (now - lastTapRef.current < 260) {
        event.preventDefault()
        if (scale > 1.05) {
          resetTransform(true) // haptic on reset
        } else {
          setScale(2)
          setTranslate({ x: 0, y: 0 })
        }
      }
      lastTapRef.current = now
    }

    if (event.touches.length === 2) {
      pinchStartDistanceRef.current = distance(event.touches[0], event.touches[1])
      pinchStartScaleRef.current = scale
      panStartTouchRef.current = null
      return
    }

    if (event.touches.length === 1 && scale > 1) {
      const touch = event.touches[0]
      panStartTouchRef.current = { x: touch.clientX, y: touch.clientY }
      panStartTranslateRef.current = translate
    }
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2 && pinchStartDistanceRef.current) {
      event.preventDefault()
      const nextDistance = distance(event.touches[0], event.touches[1])
      const ratio = nextDistance / pinchStartDistanceRef.current
      const nextScale = clamp(pinchStartScaleRef.current * ratio, MIN_SCALE, MAX_SCALE)
      setScale(nextScale)
      if (nextScale <= 1.01) {
        setTranslate({ x: 0, y: 0 })
      }
      return
    }

    if (event.touches.length === 1 && panStartTouchRef.current && scale > 1) {
      event.preventDefault()
      const touch = event.touches[0]
      const deltaX = touch.clientX - panStartTouchRef.current.x
      const deltaY = touch.clientY - panStartTouchRef.current.y
      const maxOffset = 180 * Math.max(1, scale - 1)
      setTranslate({
        x: clamp(panStartTranslateRef.current.x + deltaX, -maxOffset, maxOffset),
        y: clamp(panStartTranslateRef.current.y + deltaY, -maxOffset, maxOffset),
      })
    }
  }

  function handleTouchEnd() {
    pinchStartDistanceRef.current = null
    panStartTouchRef.current = null

    if (scale < 1.01) {
      setScale(1)
      setTranslate({ x: 0, y: 0 })
    }
  }

  if (!isOpen || !src) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-4 touch-none select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
    >
      <button
        type="button"
        aria-label="Close image preview"
        className="absolute inset-0 cursor-zoom-out"
        onClick={() => {
          resetTransform()
          onClose()
        }}
        tabIndex={-1}
        style={{ background: 'transparent', border: 0, padding: 0 }}
      />

      <div
        className="relative mx-auto flex w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-black/0 shadow-lg sm:mt-10 h-[80vh] sm:h-[calc(100vh-5rem)]"
        style={{ maxWidth: '100vw', maxHeight: '100vh' }}
      >
        <button
          type="button"
          onClick={() => {
            resetTransform()
            onClose()
          }}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/55 p-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Close"
          style={{ touchAction: 'manipulation' }}
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className="h-full w-full flex items-center justify-center touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full w-auto h-auto select-none object-contain m-auto"
            style={transformStyle}
            draggable={false}
          />
        </div>

        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[12px] text-white/80 shadow-md max-w-[90vw] text-center whitespace-pre-line">
          Pinch to zoom • Drag to pan\nDouble-tap to reset
        </p>
      </div>
    </div>
  )
}
