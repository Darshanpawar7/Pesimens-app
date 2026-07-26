/**
 * Feature flags for the Chess game.
 * Toggle features on/off for phased rollout or MVP mode.
 *
 * ─── Phase 1 – Core MVP ───────────────────────────────────────────────────────
 * passAndPlay  – local two-player mode on the same device
 * chessBoard   – the chess board UI component
 * basicUI      – core UI chrome (headers, buttons, overlays)
 * ai           – play against the AI engine
 *
 * ─── Phase 2 – Multiplayer & Engagement ──────────────────────────────────────
 * multiplayer  – real-time online multiplayer via Supabase
 * leaderboard  – global win/streak leaderboard
 * stats        – per-user game statistics
 *
 * ─── Phase 3 – Discovery & Social Lite ───────────────────────────────────────
 * dailyChallenge – daily puzzle challenge with streak tracking
 * spectator      – watch live games in read-only mode
 * reactions      – in-game emoji reactions (requires multiplayer)
 *
 * ─── Phase 4 – Full Social ────────────────────────────────────────────────────
 * friends      – friends list with online presence indicators
 * invites      – send/receive game invites (requires multiplayer)
 * chat         – in-game text chat (requires multiplayer)
 * presence     – real-time online/offline status (requires multiplayer)
 * activityFeed – global activity feed of recent game events
 *
 * ─── Dependency map ──────────────────────────────────────────────────────────
 * invites      → requires multiplayer
 * chat         → requires multiplayer
 * presence     → requires multiplayer
 * reactions    → requires multiplayer
 * spectator    → requires multiplayer (reads live game sessions)
 */
export const CHESS_FEATURES = {
  // ── Phase 1: Core MVP ──────────────────────────────────────────────────────
  passAndPlay: true,
  chessBoard: true,
  basicUI: true,
  ai: true,

  // ── Phase 2: Multiplayer & Engagement ─────────────────────────────────────
  multiplayer: true,
  leaderboard: true,
  stats: true,

  // ── Phase 3: Discovery & Social Lite ──────────────────────────────────────
  dailyChallenge: false,
  spectator: false,
  reactions: false,

  // ── Phase 4: Full Social ───────────────────────────────────────────────────
  friends: false,
  invites: true,
  chat: false,
  presence: true,
  activityFeed: false,
} as const

/** Shape of the CHESS_FEATURES object for use in typed contexts. */
export type ChessFeatureFlags = typeof CHESS_FEATURES

/** Union of all valid feature flag keys. */
export type ChessFeatureKey = keyof ChessFeatureFlags
