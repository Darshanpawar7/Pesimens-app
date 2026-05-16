import { supabase } from './supabase'

const PROFILE_SCHEMA_CACHE_ERROR = /Could not find the '([^']+)' column of 'profiles' in the schema cache/i

type ProfileUpdateMap = Record<string, unknown>

function stripUndefinedValues(payload: ProfileUpdateMap): ProfileUpdateMap {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function extractMissingProfilesColumn(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null

  const maybeError = error as { message?: string; details?: string; hint?: string }
  const combined = [maybeError.message, maybeError.details, maybeError.hint]
    .filter(Boolean)
    .join(' ')

  const match = combined.match(PROFILE_SCHEMA_CACHE_ERROR)
  return match?.[1] ?? null
}

export interface SafeProfileUpdateResult {
  error: unknown
  strippedColumns: string[]
  skipped: boolean
}

export async function safeUpdateProfile(
  userId: string,
  updates: ProfileUpdateMap,
  maxStrips = 5,
): Promise<SafeProfileUpdateResult> {
  const strippedColumns: string[] = []
  const payload: ProfileUpdateMap = stripUndefinedValues({ ...updates })
  let remainingStrips = maxStrips

  // Keep retrying only when the API explicitly reports a missing profiles column.
  while (true) {
    if (Object.keys(payload).length === 0) {
      return { error: null, strippedColumns, skipped: true }
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    if (!error) {
      return { error: null, strippedColumns, skipped: false }
    }

    const missingColumn = extractMissingProfilesColumn(error)
    if (!missingColumn || !(missingColumn in payload) || remainingStrips <= 0) {
      return { error, strippedColumns, skipped: false }
    }

    delete payload[missingColumn]
    strippedColumns.push(missingColumn)
    remainingStrips -= 1
  }
}