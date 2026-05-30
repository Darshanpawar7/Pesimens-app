import { supabase } from '../supabase'

export type ChessEventType =
  | 'game_started'
  | 'game_finished'
  | 'rematch_clicked'
  | 'rematch_accepted'
  | 'invite_sent'
  | 'daily_challenge_completed'
  | 'matchmaking_joined'
  | 'spectator_joined'
  | 'leaderboard_preview_clicked'
  | 'quick_play_clicked'
  | 'ai_difficulty_selected'
  | 'multiplayer_joined'
  | 'error_retry'

export interface ChessEventPayload {
  [key: string]: unknown
}

export async function trackChessEvent(
  eventType: ChessEventType,
  payload?: ChessEventPayload,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (import.meta.env.DEV) {
      console.warn('[Chess Analytics]', eventType, payload)
      return
    }

    await supabase.from('chess_analytics').insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      payload: payload ?? {},
    })
  } catch (err) {
    // FIX: Handle all error types comprehensively with proper logging
    // This ensures monitoring gaps are closed and all errors are tracked
    if (err instanceof TypeError) {
      console.error('[analytics] Type error:', err.message)
    } else if (err instanceof Error) {
      console.error('[analytics] Error:', err.message, err.stack)
    } else {
      console.error('[analytics] Unknown error:', err)
    }
    
    // Don't throw - analytics failures shouldn't break app
    // But log for monitoring in both dev and production
  }
}
