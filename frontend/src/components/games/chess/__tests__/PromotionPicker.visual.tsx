import { useState } from 'react'
import { PromotionPicker } from '../PromotionPicker'

/**
 * Visual test component for PromotionPicker
 * 
 * This component demonstrates the PromotionPicker UI in isolation.
 * To view: Import and render this component in a test page or Storybook.
 */
export function PromotionPickerVisual() {
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [colour, setColour] = useState<'w' | 'b'>('w')

  const handleSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    setSelectedPiece(piece)
    setShowPicker(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <h1 style={{ color: '#ffffff', fontSize: 32, fontWeight: 700 }}>
        PromotionPicker Visual Test
      </h1>

      <div
        style={{
          background: '#1a1a1a',
          padding: 24,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minWidth: 300,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ color: '#ffffff', fontSize: 16 }}>Colour:</label>
          <button
            onClick={() => setColour('w')}
            style={{
              padding: '8px 16px',
              background: colour === 'w' ? '#6366f1' : '#2a2a2a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            White
          </button>
          <button
            onClick={() => setColour('b')}
            style={{
              padding: '8px 16px',
              background: colour === 'b' ? '#6366f1' : '#2a2a2a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Black
          </button>
        </div>

        <button
          onClick={() => setShowPicker(true)}
          style={{
            padding: '12px 24px',
            background: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Show Promotion Picker
        </button>

        {selectedPiece && (
          <div
            style={{
              padding: 16,
              background: '#2a2a2a',
              borderRadius: 8,
              color: '#ffffff',
            }}
          >
            <strong>Last selected:</strong> {selectedPiece.toUpperCase()}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#1a1a1a',
          padding: 24,
          borderRadius: 12,
          maxWidth: 600,
        }}
      >
        <h2 style={{ color: '#ffffff', fontSize: 20, marginBottom: 16 }}>
          Test Scenarios
        </h2>
        <ul style={{ color: '#9ca3af', lineHeight: 1.8 }}>
          <li>Click "Show Promotion Picker" to display the modal</li>
          <li>Verify the modal appears with a dark overlay</li>
          <li>Verify all four piece options are visible (Queen, Rook, Bishop, Knight)</li>
          <li>Hover over each button to see the hover effect</li>
          <li>Click a piece to select it and close the modal</li>
          <li>Toggle between White and Black to see different piece colors</li>
          <li>Verify the modal blocks interaction with the background</li>
        </ul>
      </div>

      {showPicker && (
        <PromotionPicker colour={colour} onSelect={handleSelect} />
      )}
    </div>
  )
}
