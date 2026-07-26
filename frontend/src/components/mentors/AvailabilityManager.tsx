import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
}

export function AvailabilityManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch all availability slots for the mentor
  const { data, isLoading } = useQuery({
    queryKey: ['my-availability'],
    queryFn: () => apiFetch<{ slots: TimeSlot[] }>('/api/mentors/me/availability').catch(() => ({ slots: [] })),
  })

  const saveMutation = useMutation({
    mutationFn: (newSlot: Omit<TimeSlot, 'id'>) =>
      apiFetch('/api/mentors/me/availability', {
        method: 'POST',
        body: JSON.stringify(newSlot),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] })
      toast({ title: 'Availability updated', description: 'Your time slot has been added.' })
    },
    onError: () => {
      toast({ variant: 'error', title: 'Error', description: 'Failed to add time slot.' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/mentors/me/availability/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] })
      toast({ title: 'Slot removed' })
    }
  })

  const handleAddSlot = () => {
    if (!selectedDate || !startTime || !endTime) return
    const dateStr = selectedDate.toLocaleDateString('en-CA') // YYYY-MM-DD
    saveMutation.mutate({ date: dateStr, start_time: startTime, end_time: endTime })
  }

  const selectedDateStr = selectedDate.toLocaleDateString('en-CA')
  const slotsForDate = data?.slots?.filter(s => s.date === selectedDateStr) ?? []

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] lg:grid-cols-[300px_1fr]">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 flex flex-col items-center">
        <h3 className="mb-4 text-sm font-semibold self-start">Select Date</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
          className="rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] shadow-sm"
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <h3 className="text-sm font-semibold mb-4">Add Time Block for {selectedDate.toLocaleDateString()}</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px] space-y-1">
              <label className="text-xs text-white/60">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 min-w-[120px] space-y-1">
              <label className="text-xs text-white/60">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <Button onClick={handleAddSlot} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">Add Slot</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <h3 className="text-sm font-semibold mb-4">Existing Slots</h3>
          {isLoading ? (
            <div className="h-20 animate-pulse bg-[#2a2a2a] rounded-lg" />
          ) : slotsForDate.length === 0 ? (
            <div className="flex items-center justify-center p-6 border border-dashed border-[#2a2a2a] rounded-xl bg-[#0f0f0f]/50">
              <p className="text-sm text-white/50">No availability set for this date.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slotsForDate.map(slot => (
                <div key={slot.id} className="flex items-center justify-between rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-3 transition-colors hover:border-[#3a3a3a]">
                  <span className="text-sm font-medium">
                    {slot.start_time} - {slot.end_time}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => deleteMutation.mutate(slot.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
