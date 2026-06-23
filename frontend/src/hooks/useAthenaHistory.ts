import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import type { AthenaPayload, AthenaAnswerMode, AITask } from '../services/aiService'

export interface AthenaHistoryMessage {
  id: string
  user_id: string
  task_type: AITask
  role: 'user' | 'assistant'
  content: string
  provider?: 'groq' | 'gemini' | null
  mode?: AthenaAnswerMode | null
  athena_payload?: AthenaPayload | null
  created_at: string
}

export function useAthenaHistory(taskType: AITask) {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['athena_history', taskType],
    queryFn: async (): Promise<AthenaHistoryMessage[]> => {
      if (!user) return []

      const { data, error } = await supabase
        .from('athena_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_type', taskType)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        console.warn('Failed to fetch athena history. Table might not exist yet:', error.message)
        return []
      }

      return data as AthenaHistoryMessage[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 mins
  })
}

export function useInsertAthenaHistory() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (message: Omit<AthenaHistoryMessage, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) return null

      const { data, error } = await supabase
        .from('athena_history')
        .insert([{ ...message, user_id: user.id }])
        .select()
        .single()

      if (error) {
        console.warn('Failed to insert athena history. Table might not exist yet:', error.message)
        return null
      }

      return data as AthenaHistoryMessage
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['athena_history', variables.task_type] })
    },
  })
}

export function useClearAthenaHistory() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (taskType: AITask) => {
      if (!user) return

      const { error } = await supabase
        .from('athena_history')
        .delete()
        .eq('user_id', user.id)
        .eq('task_type', taskType)

      if (error) {
        console.warn('Failed to clear athena history:', error.message)
      }
    },
    onSuccess: (_, taskType) => {
      queryClient.invalidateQueries({ queryKey: ['athena_history', taskType] })
    },
  })
}
