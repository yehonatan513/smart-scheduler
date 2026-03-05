import { useState } from 'react'
import { supabase } from '../supabaseClient'

const EXAM_KEYWORDS = ['בגרות', 'מתכונת', 'מבחן', 'בחינה', 'exam', 'test']
const EXAM_TYPE_MAP = { 'בגרות': 'בגרות', 'מתכונת': 'מתכונת', 'מבחן': 'מבחן', 'בחינה': 'מבחן', 'exam': 'מבחן', 'test': 'מבחן' }

function detectExamType(title) {
  const lower = title.toLowerCase()
  for (const [keyword, type] of Object.entries(EXAM_TYPE_MAP)) {
    if (lower.includes(keyword)) return type
  }
  return null
}

function cleanTitle(title) {
  let clean = title
  for (const keyword of EXAM_KEYWORDS) {
    clean = clean.replace(new RegExp(keyword, 'gi'), '').trim()
  }
  return clean || title
}

export async function syncGoogleCalendar(accessToken, userId, existingSubjects, existingEvents) {
  const results = { added: 0, skipped: 0, errors: 0 }

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=500&orderBy=startTime&singleEvents=true&timeMin=' +
      new Date().toISOString(),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await response.json()
    if (!data.items) return results

    for (const event of data.items) {
      const date = event.start?.date || event.start?.dateTime?.split('T')[0]
      if (!date) continue

      const title = event.summary || 'אירוע'
      const examType = detectExamType(title)

      if (examType) {
        // בדוק אם כבר קיים ב-subjects
        const exists = existingSubjects.some(s =>
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
        else results.added++

      } else {
        // בדוק אם כבר קיים ב-events
        const exists = existingEvents.some(e =>
          e.date === date && e.title === title
        )
        if (exists) { results.skipped++; continue }

        const { error } = await supabase.from('events').insert({
          title,
          date,
          type: 'אירוע',
          notes: event.description || '',
          recurring: false,
          user_id: userId
        })
        if (error) results.errors++
        else results.added++
      }
    }
  } catch (e) {
    results.errors++
  }

  return results
}

export default function GoogleCalendarSync({ user, subjects, events, onUpdate }) {
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
              const res = await syncGoogleCalendar(response.access_token, user.id, subjects, events)
              setResult(res)
              onUpdate()
            }
            setLoading(false)
          }
        })
        client.requestAccessToken({ prompt: 'select_account' })
        return
      }

      const res = await syncGoogleCalendar(token, user.id, subjects, events)
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