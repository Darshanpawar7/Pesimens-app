import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserCheck, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { UserAvatar } from '@/components/ui/avatar'
import { KarmaBadge } from '@/components/common/KarmaBadge'
import { FollowButton } from '@/components/common/FollowButton'
import { Link, useSearchParams } from 'react-router-dom'
import { MentorsPage } from './MentorsPage'

interface Person {
  id: string
  display_name: string | null
  avatar_url: string | null
  headline: string | null
  branch: string | null
  semester: number | null
  campus: 'EC' | 'RR' | null
  karma: number
  open_to_work: boolean
  skills: string[]
  role: string
  is_following: boolean
}

export default function PeoplePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as 'students' | 'mentors') || 'students'

  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState<'All' | 'EC' | 'RR'>('All')
  const [branch, setBranch] = useState('All')
  const [lookingFor, setLookingFor] = useState('All')
  const [semester, setSemester] = useState('')

  const query = useQuery({
    queryKey: ['people-discover', search, campus, branch, lookingFor, semester],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      params.set('campus', campus)
      if (branch !== 'All') params.set('branch', branch)
      if (lookingFor !== 'All') params.set('looking_for', lookingFor)
      if (semester) params.set('semester', semester)
      return apiFetch<{ items: Person[]; totalUsers: number }>(`/api/profiles/discover?${params.toString()}`)
    },
  })

  const people = useMemo(() => query.data?.items ?? [], [query.data?.items])
  const visibleCount = people.length
  const totalUsers = (query.data?.totalUsers ?? 0) + 300
  // Only show the count once we have real data — avoids "0 out of 300" flash during refetch
  const showCount = !query.isLoading && query.data !== undefined

  const uniqueBranches = useMemo(() => {
    const set = new Set<string>()
    for (const person of people) if (person.branch) set.add(person.branch)
    return ['All', ...Array.from(set)]
  }, [people])

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">People</h1>
          <div className="flex w-fit gap-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-1">
            {(['students', 'mentors'] as const).map(item => (
              <button
                key={item}
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.set('tab', item)
                  setSearchParams(next, { replace: true })
                }}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
                  tab === item
                    ? 'bg-[#6366f1]/15 text-white ring-1 ring-[#6366f1]/30'
                    : 'text-white/60 hover:bg-[#242424] hover:text-white/90',
                ].join(' ')}
              >
                {item === 'students' ? 'Students' : 'Mentors'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'mentors' && <MentorsPage />}

        {tab === 'students' && (
          <>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by name, skill, or company"
                className="h-11 w-full rounded-xl border border-[#2a2a2a] bg-[#111111] px-3 text-sm"
              />

              <p className="mt-2 text-xs text-white/60">
                {showCount ? `Showing ${visibleCount} out of ${totalUsers} users` : '\u00A0'}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <select value={campus} onChange={event => setCampus(event.target.value as 'All' | 'EC' | 'RR')} className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm">
                  <option>All</option>
                  <option>EC</option>
                  <option>RR</option>
                </select>

                <select value={branch} onChange={event => setBranch(event.target.value)} className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm">
                  {uniqueBranches.map(item => <option key={item}>{item}</option>)}
                </select>

                <select value={lookingFor} onChange={event => setLookingFor(event.target.value)} className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm">
                  {['All', 'Project Partner', 'Internship', 'Full-time Referral', 'Resume Review', 'Mock Interview', 'Study Group'].map(item => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <select value={semester} onChange={event => setSemester(event.target.value)} className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm">
                  <option value="">All semesters</option>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <option key={idx + 1} value={String(idx + 1)}>{idx + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {people.map(person => (
                <div key={person.id} className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={person.display_name} avatarUrl={person.avatar_url} className="h-14 w-14" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/profile/${person.id}`} className="block w-full truncate text-base font-semibold hover:text-indigo-300">{person.display_name || 'Student'}</Link>
                      <p className="truncate text-xs text-white/60">{person.headline || `${person.branch || 'Branch'} · Sem ${person.semester ?? '--'}`}</p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-white/65">{person.branch || 'Branch'} · Sem {person.semester ?? '--'} · {person.campus || '--'}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(person.skills ?? []).slice(0, 3).map(skill => (
                      <span key={skill} className="rounded-full border border-[#2a2a2a] bg-[#111111] px-2 py-0.5 text-[11px] text-gray-300">{skill}</span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <KarmaBadge karma={person.karma} />
                    {person.open_to_work && <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">Open to Work</span>}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <FollowButton userId={person.id} initialFollowing={person.is_following} size="sm" />
                    {person.role === 'mentor' ? (
                      <Link to="/people?tab=mentors" className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-xs text-white/90 hover:bg-[#222222]">
                        <UserCheck className="h-3.5 w-3.5" />Book Session
                      </Link>
                    ) : (
                      <Link to={`/messages?user=${person.id}`} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-xs text-white/90 hover:bg-[#222222]">
                        <Users className="h-3.5 w-3.5" />Message
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {people.length === 0 && (
              <p className="py-12 text-center text-sm text-white/60">No people found for current filters.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
