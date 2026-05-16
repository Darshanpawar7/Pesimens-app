import { useExploreUIStore } from '@/store/exploreUI'
import {
  PreviewCard as PreviewCardType,
  PlacementMetadata,
  ConfessionMetadata,
  NoteMetadata,
  MentorMetadata,
} from '@/types/explore'
import { MessageCircle, Download, Calendar, Lock } from 'lucide-react'

interface PreviewCardProps {
  card: PreviewCardType
}

export function PreviewCard({ card }: PreviewCardProps) {
  const openLoginSheet = useExploreUIStore(state => state.openLoginSheet)

  const renderMetadata = () => {
    if (!card.metadata) return null

    switch (card.type) {
      case 'placement': {
        const meta = card.metadata as PlacementMetadata
        return (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
            <span>{meta.company}</span>
            <span>•</span>
            <span>{meta.role}</span>
            {meta.package && (
              <>
                <span>•</span>
                <span>{meta.package}</span>
              </>
            )}
            <span>•</span>
            <span>{meta.year}</span>
          </div>
        )
      }
      case 'confession': {
        const meta = card.metadata as ConfessionMetadata
        return (
          <div className="mt-2 flex gap-4 text-xs text-gray-400">
            <span>{meta.upvotes} upvotes</span>
            <span>{meta.comments} comments</span>
            <span>{meta.timestamp}</span>
          </div>
        )
      }
      case 'note': {
        const meta = card.metadata as NoteMetadata
        return (
          <div className="mt-2 flex gap-2 text-xs text-gray-400">
            <span>{meta.subject}</span>
            <span>•</span>
            <span>Semester {meta.semester}</span>
            <span>•</span>
            <span className="capitalize">{meta.type}</span>
          </div>
        )
      }
      case 'mentor': {
        const meta = card.metadata as MentorMetadata
        return (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-1">
              {meta.expertise.map((skill, idx) => (
                <span
                  key={idx}
                  className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-400">
              {meta.company && <span>{meta.company} • </span>}
              <span>{meta.availability}</span>
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  const renderActionButtons = () => {
    return (
      <div className="mt-3 flex gap-2">
        {/* Comment button for all card types */}
        <button
          onClick={() => openLoginSheet()}
          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10"
        >
          <MessageCircle size={16} />
          <span>Comment</span>
        </button>

        {/* Download button for Notes cards */}
        {card.type === 'note' && (
          <button
            onClick={() => openLoginSheet()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-sm text-indigo-300 transition-colors hover:bg-indigo-500/30"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
        )}

        {/* Booking button for Mentor cards */}
        {card.type === 'mentor' && (
          <button
            onClick={() => openLoginSheet()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-600"
          >
            <Calendar size={16} />
            <span>Book Session</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-[#1a1a1a] p-4">
      {/* Card content */}
      <div>
        <h3 className="text-base font-semibold text-white">{card.title}</h3>
        {card.subtitle && (
          <p className="mt-1 text-sm text-gray-400">{card.subtitle}</p>
        )}
        <p className="mt-2 text-sm text-gray-300">{card.content}</p>
        {renderMetadata()}
        {renderActionButtons()}
      </div>

      {/* Blur overlay for locked cards */}
      {card.locked && (
        <div
          onClick={() => {
            openLoginSheet()
            // Analytics tracking
            if (typeof window !== 'undefined' && (window as any).gtag) {
              (window as any).gtag('event', 'locked_card_click', {
                card_type: card.type,
                card_id: card.id,
              })
            }
          }}
          className="absolute inset-0 flex cursor-pointer items-center justify-center transition-all hover:scale-105"
          style={{
            backdropFilter: 'blur(8px)',
            background: 'linear-gradient(to bottom, rgba(15,15,15,0.7), rgba(15,15,15,0.85))',
            animation: 'fadeIn 0.3s ease-in',
          }}
          role="button"
          aria-label="Sign in to unlock this content"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openLoginSheet()
              // Analytics tracking
              if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('event', 'locked_card_click', {
                  card_type: card.type,
                  card_id: card.id,
                })
              }
            }
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-indigo-500/20 p-3">
              <Lock size={24} className="text-indigo-400" />
            </div>
            <button className="min-h-[44px] min-w-[44px] rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105">
              Sign in to unlock
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
