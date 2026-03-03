import { useGoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { supabase } from '../supabaseClient'

const EXAM_KEYWORDS = ['בגרות', 'מבחן', 'בחינה', 'exam', 'test']

function isExamEvent(title) {
  const lower = title.toLowerCase()
  return EXAM_KEYWORDS.some(kw => lower.includes(kw))
}

function extractName(title) {
  let name = title
  EXAM_KEYWORDS.forEach(kw => {
    name = name.replace(new RegExp(kw, 'gi'), '')
  })
  return name.replace(/[-–,|]/g, ' ').replace(/\s+/g, ' ').trim() || title
}

export default function GoogleCalendar({ onUpdate }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [hours, setHours] = useState({})
  const [accessToken, setAccessToken] = useState(null)
  const [scanned, setScanned] = useState(false)

  async function scanCalendar(token) {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const future = new Date(Date.now() + 365 * 86400000).toISOString()

      const [calRes, { data: existingSubjects }] = await Promise.all([
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&maxResults=100&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        supabase.from('subjects').select('exam_date')
      ])

      const data = await calRes.json()
      const existingDates = new Set((existingSubjects || []).map(s => s.exam_date))

      const found = (data.items || [])
        .filter(e => e.summary && isExamEvent(e.summary))
        .map(e => ({
          title: e.summary,
          suggested: extractName(e.summary),
          date: (e.start.date || e.start.dateTime?.split('T')[0]),
          imported: false
        }))
        .filter(e => !existingDates.has(e.date))

      setEvents(found)
      setScanned(true)
    } catch (e) {
      alert('שגיאה בטעינת היומן')
    }
    setLoading(false)
  }

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
      await scanCalendar(tokenResponse.access_token)
    },
    onError: () => alert('ההתחברות נכשלה')
  })

  async function importEvent(e, i) {
    const h = parseFloat(hours[i])
    if (!h || !e.suggested) return alert('נא למלא שעות')
    await supabase.from('subjects').insert({
      name: e.suggested,
      exam_date: e.date,
      total_hours: h
    })
    setEvents(prev => prev.map((ev, idx) => idx === i ? { ...ev, imported: true } : ev))
    setHours(prev => { const next = { ...prev }; delete next[i]; return next })
  }

  const visibleEvents = events.filter(e => !e.imported)

  return (
    <div className="form-card">
      <div className="form-title">סנכרון עם Google Calendar</div>

      {!accessToken ? (
        <button className="btn btn-primary" onClick={() => login()} disabled={loading}>
          {loading ? 'טוען...' : 'התחבר וסרוק בגרויות'}
        </button>
      ) : loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>סורק...</div>
      ) : (
        <div>
          {scanned && !visibleEvents.length ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>
              לא נמצאו בגרויות חדשות ביומן
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
                נמצאו {visibleEvents.length} אירועים - הוסף שעות למידה לכל אחד
              </div>
              {visibleEvents.map((e, i) => (
                <div key={i} className="subject-row" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 600 }}>{e.suggested}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{e.title} - {e.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number"
                      placeholder="שעות"
                      style={{ width: 80 }}
                      value={hours[i] || ''}
                      onChange={ev => setHours(p => ({ ...p, [i]: ev.target.value }))}
                      min="1"
                    />
                    <button
                      className="btn btn-primary"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      onClick={() => importEvent(e, i)}
                    >
                      הוסף
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn"
            style={{ marginTop: 12, color: 'var(--text-dim)', background: 'transparent', border: '1px solid var(--border)' }}
            onClick={() => { onUpdate(); scanCalendar(accessToken) }}
          >
            סרוק שוב
          </button>
        </div>
      )}
    </div>
  )
}