import { useState } from 'react'

const CONFIRM_PHRASE = 'DELETE'

interface DeleteAccountModalProps {
  isOpen: boolean
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteAccountModal({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('')

  if (!isOpen) return null

  const isMatch = confirmText.trim() === CONFIRM_PHRASE

  const handleCancel = () => {
    if (isDeleting) return
    setConfirmText('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-white">
          Delete your account
        </h2>
        <p className="mb-4 text-sm text-white/55">
          This will permanently delete your profile, resume, social links, and all
          associated data. This action cannot be undone.
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-200">
          Type <span className="font-semibold text-red-300">{CONFIRM_PHRASE}</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          disabled={isDeleting}
          placeholder={CONFIRM_PHRASE}
          autoFocus
          className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#222222] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
