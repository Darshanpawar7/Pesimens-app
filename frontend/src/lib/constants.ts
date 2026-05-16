/**
 * Frontend Application Constants
 * Centralized configuration values to avoid magic numbers throughout the codebase
 */

// ─── Timing Constants ─────────────────────────────────────────────────────────
export const HEARTBEAT_INTERVAL_MS = 60 * 1000 // 1 minute
export const DEBOUNCE_DELAY_MS = 300 // 300ms for search inputs
export const TOAST_DURATION_MS = 1500 // 1.5 seconds
export const HIGHLIGHT_DURATION_MS = 2500 // 2.5 seconds
export const SCROLL_DELAY_MS = 80 // Delay before scrolling to element
export const TOKEN_REFRESH_RETRY_DELAY_MS = 1500 // Delay before retrying token refresh
export const MIN_TOKEN_REFRESH_INTERVAL_MS = 1000 // Minimum time between token refreshes

// ─── Chess Game Constants ─────────────────────────────────────────────────────
export const CHESS_AI_MOVE_DELAY_MS = 500 // Delay before AI makes a move
export const CHESS_REMATCH_COUNTDOWN_SECONDS = 3
export const CHESS_REMATCH_COUNTDOWN_INTERVAL_MS = 1000

// ─── UI Constants ─────────────────────────────────────────────────────────────
export const MOBILE_BREAKPOINT_PX = 1024 // Breakpoint for mobile vs desktop
export const LUDO_BOARD_DIMENSION_PX = 600 // Ludo board size

// ─── Notification Constants ───────────────────────────────────────────────────
export const NOTIFICATION_CHECK_INTERVAL_MS = 60 * 1000 // 1 minute

// ─── Confession Reset Constants ───────────────────────────────────────────────
export const CONFESSION_RESET_CHECK_INTERVAL_MS = 60 * 1000 // 1 minute

// ─── Swipe Navigation Constants ───────────────────────────────────────────────
export const SWIPE_NAVIGATE_DELAY_MS = 300 // Delay before navigating after swipe
