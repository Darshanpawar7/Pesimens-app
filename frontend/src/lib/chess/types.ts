// Type definitions for Chess Game feature

export type GamePhase = 'home' | 'setup' | 'playing' | 'finished'
export type PlayerColour = 'w' | 'b'
export type GameMode = 'passAndPlay' | 'multiplayer' | 'spectator' | 'dailyChallenge' | 'ai'
export type GameResult = 'white' | 'black' | 'draw' | null

export interface ChessMoveRecord {
  from: string
  to: string
  san: string          // SAN notation from chess.js
  promotion?: string
}

export interface MultiplayerInfo {
  sessionId: string
  roomCode: string
  myColour: PlayerColour
  opponentName: string
}

export interface ChessGameStatePayload {
  fen: string
  moveHistory: ChessMoveRecord[]
  result?: GameResult
  rematchRequested?: boolean
}

export interface ChessGameState {
  phase: GamePhase
  mode: GameMode
  fen: string                        // current position FEN
  turn: PlayerColour                 // 'w' | 'b'
  selectedSquare: string | null      // e.g. 'e2'
  legalMoves: string[]               // destination squares for selectedSquare
  lastMove: { from: string; to: string } | null
  inCheck: boolean
  isGameOver: boolean
  result: GameResult
  moveHistory: ChessMoveRecord[]
  promotionPending: { from: string; to: string } | null
  multiplayer: MultiplayerInfo | null
  error: string | null
  rematchRequestedByOpponent: boolean
  onlineUsers: string[]              // user IDs currently online via Presence
  opponentDisconnected: boolean      // true when opponent's Realtime channel closes
  aiDifficulty: 'easy' | 'medium' | 'hard' | null
  rematchCountdown: number | null    // 3, 2, 1, 0 = "Go!", null = not counting
  rematchIntervalId: ReturnType<typeof setInterval> | null  // Interval ID for cleanup to prevent memory leaks
}

export interface FriendEntry {
  id: string
  name: string
  isOnline: boolean
}

export interface FriendsState {
  friends: FriendEntry[]
  loadFriends: () => Promise<void>
  sendFriendRequest: (friendId: string) => Promise<void>
  acceptFriendRequest: (friendId: string) => Promise<void>
}

// Payload broadcast over the game-invites:{userId} Realtime channel
export interface GameInvitePayload {
  roomCode: string
  fromUserId: string
  fromUserName: string
  gameType: 'chess'
  createdAt: string
}

// Chess notification types
export type ChessNotificationType =
  | 'game_invite'
  | 'match_found'
  | 'game_result'
  | 'rematch_request'
  | 'daily_challenge'

export interface ChessNotification {
  id: string
  type: ChessNotificationType
  title: string
  message: string
  /** Optional room code for invite/match notifications */
  roomCode?: string
  createdAt: string
}

export interface ChessStoreActions {
  initGame: (mode: GameMode, aiDifficulty?: 'easy' | 'medium' | 'hard') => void
  selectSquare: (square: string) => void
  executeMove: (from: string, to: string, promotion?: string, isAi?: boolean) => void
  cancelPromotion: () => void
  resetGame: () => void
  rematch: () => void
  requestRematch: () => void
  acceptRematch: () => void
  loadFromFen: (fen: string) => void
  setMultiplayerInfo: (info: MultiplayerInfo) => void
  applyRemoteMove: (fen: string, move: ChessMoveRecord) => void
  applyRemoteGameState: (gameState: { fen?: string; moveHistory?: ChessMoveRecord[]; result?: GameResult; rematchRequested?: boolean }) => void
  startSpectating: (sessionId: string, roomCode: string, fen?: string) => void
  sendGameInvite: (friendId: string, roomCode: string) => Promise<void>
  initPresence: (userId: string) => void
  cleanupPresence: () => void
  sendNotification: (userId: string, type: ChessNotificationType, title: string, message: string, roomCode?: string) => Promise<void>
  setOpponentDisconnected: (value: boolean) => void
  claimWinOnDisconnect: () => void
  triggerAiMove: () => Promise<void>
  startRematchCountdown: () => void
  cancelRematchCountdown: () => void
}

export interface IChessStore extends ChessGameState, ChessStoreActions, FriendsState {}
