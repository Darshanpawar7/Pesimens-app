import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useCreateClub } from '../../hooks/useClubs'
import { useToast } from '../ui/use-toast'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  category: z.enum(['academic', 'technical', 'cultural', 'sports', 'social', 'social_service', 'entrepreneurship', 'arts', 'other']),
  instagram: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  linkedin: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface CreateClubModalProps {
  onClose: () => void
  onSuccess?: () => void
}

export function CreateClubModal({ onClose, onSuccess }: CreateClubModalProps) {
  const { toast } = useToast()
  const createClub = useCreateClub()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'academic' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createClub.mutateAsync(data)
      toast({ variant: 'success', title: 'Club created', description: 'Your club is pending approval.' })
      onSuccess?.()
      onClose()
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to create club', description: (err as Error).message })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Club</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Club Name *</label>
            <input {...register('name')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
            <select {...register('category')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['academic', 'technical', 'cultural', 'sports', 'social', 'social_service', 'entrepreneurship', 'arts', 'other'].map(c => (
                <option key={c} value={c} className="capitalize">{c.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Social Links (optional)</p>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Instagram URL</label>
              <input {...register('instagram')} placeholder="https://instagram.com/..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.instagram && <p className="mt-1 text-xs text-red-500">{errors.instagram.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">LinkedIn URL</label>
              <input {...register('linkedin')} placeholder="https://linkedin.com/..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.linkedin && <p className="mt-1 text-xs text-red-500">{errors.linkedin.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Website URL</label>
              <input {...register('website')} placeholder="https://..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.website && <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
              {isSubmitting ? 'Creating...' : 'Create Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
