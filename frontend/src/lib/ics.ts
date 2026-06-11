export interface ICS_Event {
  id: string
  title: string
  description?: string
  date: string // YYYY-MM-DD
  time?: string | null // HH:mm or null
}

function generateUID(id: string) {
  return `${id}@pesimens.app`
}

function formatDate(dateStr: string, timeStr?: string | null): string {
  const d = new Date(`${dateStr}T${timeStr || '00:00:00'}`)
  
  const pad = (n: number) => String(n).padStart(2, '0')
  const YYYY = d.getUTCFullYear()
  const MM = pad(d.getUTCMonth() + 1)
  const DD = pad(d.getUTCDate())
  
  if (!timeStr) {
    return `${YYYY}${MM}${DD}`
  }

  const hh = pad(d.getUTCHours())
  const mm = pad(d.getUTCMinutes())
  const ss = pad(d.getUTCSeconds())

  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`
}

export function generateICS(events: ICS_Event[]): string {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PESimens//Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ].join('\r\n') + '\r\n'

  const now = formatDate(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[1].slice(0, 8))

  for (const event of events) {
    const dtstart = formatDate(event.date, event.time)
    
    // For all-day events, DTEND is exclusive so it must be the NEXT day.
    // For timed events, let's assume a default duration of 1 hour if not specified.
    let dtend = ''
    if (!event.time) {
      const nextDay = new Date(event.date)
      nextDay.setDate(nextDay.getDate() + 1)
      dtend = formatDate(nextDay.toISOString().split('T')[0])
    } else {
      const d = new Date(`${event.date}T${event.time}`)
      d.setHours(d.getHours() + 1)
      dtend = formatDate(d.toISOString().split('T')[0], d.toTimeString().slice(0, 8))
    }

    const uid = generateUID(event.id)
    const summary = event.title.replace(/[\r\n]/g, ' ')
    const description = (event.description || '').replace(/[\r\n]/g, '\\n')

    ics += [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART${!event.time ? ';VALUE=DATE' : ''}:${dtstart}`,
      `DTEND${!event.time ? ';VALUE=DATE' : ''}:${dtend}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : null,
      'END:VEVENT'
    ].filter(Boolean).join('\r\n') + '\r\n'
  }

  ics += 'END:VCALENDAR\r\n'

  return ics
}

export function downloadICS(events: ICS_Event[], filename = 'schedule.ics') {
  const icsData = generateICS(events)
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
