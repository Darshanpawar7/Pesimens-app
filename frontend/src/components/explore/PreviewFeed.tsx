import { exploreMockData } from '@/data/exploreMockData'
import { PreviewCard } from './PreviewCard'

export function PreviewFeed() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 pb-24 pt-20">
      {/* Placements Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-white">Placements</h2>
        <div className="space-y-4">
          {exploreMockData.placements.map(card => (
            <PreviewCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* Confessions Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-white">Confessions</h2>
        <div className="space-y-4">
          {exploreMockData.confessions.map(card => (
            <PreviewCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* Notes/PYQs Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-white">Notes/PYQs</h2>
        <div className="space-y-4">
          {exploreMockData.notes.map(card => (
            <PreviewCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* Mentors Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-white">Mentors</h2>
        <div className="space-y-4">
          {exploreMockData.mentors.map(card => (
            <PreviewCard key={card.id} card={card} />
          ))}
        </div>
      </section>
    </div>
  )
}
