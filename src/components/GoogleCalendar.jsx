import { useState } from 'react'
import { supabase } from '../supabaseClient'

const EXAM_TYPE_MAP = {
  'בגרות': 'בגרות',
  'מועד א': 'בגרות',
  'מועד ב': 'בגרות',
  'מועד ג': 'בגרות',
  'bagrut': 'בגרות',
  'מתכונת': 'מתכונת',
  'mock exam': 'מתכונת',
  'mock': 'מתכונת',
  'מבחן': 'מבחן',
  'בחינה': 'מבחן',
  'test': 'מבחן',
  'exam': 'מבחן',
  'quiz': 'מבחן',
}

const BIRTHDAY_KEYWORDS = [
  'יום הולדת', 'יומהולדת', 'מזל טוב', 'birthday', 'bday', 'b-day', 'happy birthday'
]

const EXAM_KEYWORDS = Object.keys(EXAM_TYPE_MAP)

function detectExamType(title) {
  const lower = title.toLowerCase()
  for (const [keyword, type] of Object.entries(EXAM_TYPE_MAP)) {
    if (lower.includes(keyword)) return type
  }
  return null
}

function detectBirthday(title) {
  const lower = title.toLowerCase()
  return BIRTHDAY_KEYWORDS.some(k => lower.includes(k))
}

function cleanTitle(title) {
  let clean = title
  for (const keyword of EXAM_KEYWORDS) {
    clean = clean.replace(new RegExp(keyword, 'gi'), '').trim()
  }
  return clean || title
}

function getOriginalDate(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  if (date.getFullYear() > today.getFullYear() + 1) {
    date.setFullYear(today.getFullYear())
    if (date < today) date.setFullYear(today.getFullYear())
  }
  return date.toISOString().split('T')[0]
}

function extractTime(dateTimeStr) {
  if (!dateTimeStr || !dateTimeStr.includes('T')) return null
  const date = new Date(dateTimeStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export async function syncGoogleCalendar(accessToken, userId) {
  const results = { added: 0, skipped: 0, errors: 0 }

  try {
    const { data: existingEvents } = await supabase.from('events').select('*').eq('user_id', userId)
    const { data: existingSubjectsDB } = await supabase.from('subjects').select('*').eq('user_id', userId)

    const allExistingEvents = existingEvents || []
    const allExistingSubjects = existingSubjectsDB || []

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=500&orderBy=startTime&singleEvents=true&timeMin=' +
      new Date().toISOString(),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await response.json()
    if (!data.items) return results

    for (const event of data.items) {
      const isAllDay = !!event.start?.date
      const rawDate = event.start?.date || event.start?.dateTime?.split('T')[0]
      if (!rawDate) continue

      const title = event.summary || 'אירוע'
      const examType = detectExamType(title)
      const isBirthday = detectBirthday(title)
      const date = isBirthday ? getOriginalDate(rawDate) : rawDate

      // שעות - רק לאירועים שאינם כל היום
      const startTime = isAllDay ? null : extractTime(event.start?.dateTime)
      const endTime = isAllDay ? null : extractTime(event.end?.dateTime)

      if (examType) {
        const exists = allExistingSubjects.some(s =>
          s.exam_date === date &&
          s.name.toLowerCase().includes(cleanTitle(title).toLowerCase().slice(0, 4))
        )
        if (exists) { results.skipped++; continue }

        const { error } = await supabase.from('subjects').insert({
          name: cleanTitle(title),
          exam_date: date,
          total_hours: 20,
          event_type: examType,
          notes: '',
          user_id: userId
        })
        if (error) results.errors++
        else {
          results.added++
          allExistingSubjects.push({ exam_date: date, name: cleanTitle(title) })
        }

      } else {
        const exists = allExistingEvents.some(e => {
          if (isBirthday) {
            const eDate = new Date(e.date)
            const checkDate = new Date(date)
            return e.title === title &&
              eDate.getMonth() === checkDate.getMonth() &&
              eDate.getDate() === checkDate.getDate()
          }
          return e.date === date && e.title === title
        })
        if (exists) { results.skipped++; continue }

        const { error } = await supabase.from('events').insert({
          title,
          date,
          type: isBirthday ? 'יום הולדת' : 'אירוע',
          notes: event.description || '',
          recurring: isBirthday,
          start_time: startTime,
          end_time: endTime,
          user_id: userId
        })
        if (error) results.errors++
        else {
          results.added++
          allExistingEvents.push({ title, date })
        }
      }
    }
  } catch (e) {
    results.errors++
  }

  return results
}

export default function GoogleCalendarSync({ user, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [accessToken, setAccessToken] = useState(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)

    try {
      let token = accessToken

      if (!token) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: async (response) => {
            if (response.access_token) {
              setAccessToken(response.access_token)
              const res = await syncGoogleCalendar(response.access_token, user.id)
              setResult(res)
              onUpdate()
            }
            setLoading(false)
          }
        })
        client.requestAccessToken({ prompt: 'select_account' })
        return
      }

      const res = await syncGoogleCalendar(token, user.id)
      setResult(res)
      onUpdate()
    } catch (e) {
      setResult({ error: true })
    }

    setLoading(false)
  }

  return (
    <div className="form-card">
      <div className="form-title">סנכרון Google Calendar</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
        מייבא בגרויות ואירועים מיומן Google שלך. בגרויות ומבחנים יתווספו למקצועות, שאר האירועים ללוח השנה.
      </div>
      <button className="btn btn-primary" onClick={handleSync} disabled={loading}>
        {loading ? 'מסנכרן...' : 'סנכרן עם Google Calendar'}
      </button>
      {result && !result.error && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--accent3)' }}>
          סנכרון הושלם - נוספו {result.added} אירועים, דולגו {result.skipped} כפולים
          {result.errors > 0 && <span style={{ color: 'var(--danger)' }}>, {result.errors} שגיאות</span>}
        </div>
      )}
      {result?.error && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)' }}>שגיאה בסנכרון, נסה שוב</div>
      )}
    </div>
  )
}