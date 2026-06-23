export type DrawlPhase = 'lobby' | 'word_select' | 'drawing' | 'round_end' | 'finished'
 
export type DrawlPlayer = {
  id: string
  name: string
  score: number
  hasGuessedThisRound: boolean
}
 
export type Stroke = {
  points: [number, number][]
  color: string
  size: number
  isEraser: boolean
}
 
export type ChatMessage = {
  playerId: string
  playerName: string
  text: string
  isCorrectGuess: boolean
  timestamp: number
}
 
export type RoundSummary = {
  round: number
  drawerId: string
  word: string
  correctGuessers: { id: string; timeMs: number }[]
}
 
export type DrawlGameState = {
  phase: DrawlPhase
  locked: boolean
  turnOrder: string[]
  currentDrawerIndex: number
  players: Record<string, DrawlPlayer>
  currentWord: string | null
  wordChoices: string[] | null
  strokes: Stroke[]
  roundStartedAt: number | null
  roundDuration: number
  correctGuessers: string[]
  chatMessages: ChatMessage[]
  roundHistory: RoundSummary[]
}
 