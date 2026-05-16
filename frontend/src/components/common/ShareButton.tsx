import { useState } from 'react'
import { Share2, Link, MessageCircle, Twitter, Linkedin } from 'lucide-react'
import { useToast } from '../ui/use-toast'

interface ShareButtonProps {
  title: string
  text?: string
  url?: string
  className?: string
}

export function ShareButton({ title, text, url, className = '' }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const shareUrl = url ?? window.location.href

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl })
        setOpen(false)
      } catch {
        // User cancelled — no-op
      }
      return
    }
    setOpen(o => !o)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({ variant: 'success', title: 'Link copied to clipboard' })
    } catch {
      toast({ variant: 'error', title: 'Failed to copy link' })
    }
    setOpen(false)
  }

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`, '_blank')
    setOpen(false)
  }

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
    setOpen(false)
  }

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
            <button onClick={copyLink} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Link className="h-4 w-4 text-gray-400" /> Copy link
            </button>
            <button onClick={shareWhatsApp} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
            </button>
            <button onClick={shareTwitter} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Twitter className="h-4 w-4 text-sky-500" /> Twitter
            </button>
            <button onClick={shareLinkedIn} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
            </button>
          </div>
        </>
      )}
    </div>
  )
}
