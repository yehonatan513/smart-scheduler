import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import GoogleCalendarSync from './GoogleCalendar'

export default function Notifications({ darkMode, setDarkMode, user, settings, onSettingsUpdate, subjects, events }) {
  const [time, setTime] = useState(() => { try { return localStorage.getItem('notif_time') || '08:00' } catch { return '08:00' } })
  const [enabled, setEnabled] = useState(() => { try { return localStorage.getItem('notif_enabled') === 'true' } catch { return false } })
  const [saved, setSaved] = useState(false)
  const [permission, setPermission] = useState(() => {
    try { return Notification.permission } catch { return 'default' }
  })

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => {
      const now = new Date()
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      if (current === time && permission === 'granted') {
        new Notification('לוח זמנים חכם', {
          body: 'זמן ללמוד! פתח את האפליקציה לתוכנית היום שלך.',
          icon: '/favicon.ico'
        })
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [enabled, time, permission])

  async function requestPermission() {
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  function save() {
    localStorage.setItem('notif_time', time)
    localStorage.setItem('notif_enabled', enabled)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <GoogleCalendarSync user={user} onUpdate={onSettingsUpdate} />
      <div className="form-card">
        <div className="form-title">מצב תצוגה</div>
        <button onClick={() => setDarkMode(!darkMode)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)',
          color: 'var(--text)', fontFamily: 'Heebo, sans-serif', fontSize: 14,
          cursor: 'pointer', width: '100%'
        }}>
          <span>{darkMode ? '☀️' : '🌙'}</span>
          <span>{darkMode ? 'עבור למצב בהיר' : 'עבור למצב כהה'}</span>
        </button>
      </div>
      <div className="form-card">
        <div className="form-title">הגדרות לוח זמנים</div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>מספר מקצועות מקסימלי ביום</label>
          <input
            type="number" min="1" max="6"
            defaultValue={settings?.max_subjects_per_day ?? 3}
            id="maxSubjects"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>מינימום שעות למקצוע</label>
          <input
            type="number" min="0.5" max="4" step="0.5"
            defaultValue={settings?.min_hours_per_subject ?? 1}
            id="minHours"
          />
        </div>
        <button className="btn btn-primary" onClick={async () => {
          const max = parseInt(document.getElementById('maxSubjects').value)
          const min = parseFloat(document.getElementById('minHours').value)
          const existing = settings?.id
          let error
          if (existing) {
            ({ error } = await supabase.from('user_settings').update({ max_subjects_per_day: max, min_hours_per_subject: min }).eq('id', existing))
          } else {
            ({ error } = await supabase.from('user_settings').insert({ user_id: user.id, max_subjects_per_day: max, min_hours_per_subject: min }))
          }
          if (error) return alert('שגיאה בשמירת הגדרות: ' + error.message)
          onSettingsUpdate()
        }}>
          שמור הגדרות
        </button>
      </div>
      <div className="form-card">
        <div className="form-title">התראות יומיות</div>

        {permission === 'denied' ? (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>
            חסמת התראות בדפדפן. כדי להפעיל - שנה בהגדרות הדפדפן.
          </div>
        ) : permission !== 'granted' ? (
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>
              צריך אישור לשלוח התראות
            </div>
            <button className="btn btn-primary" onClick={requestPermission}>
              אפשר התראות
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: 'var(--text-dim)' }}>הפעל תזכורת יומית</label>
              <div
                onClick={() => setEnabled(!enabled)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: enabled ? 'var(--accent)' : 'var(--border)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  right: enabled ? 3 : 'auto',
                  left: enabled ? 'auto' : 3,
                  transition: 'all 0.2s'
                }} />
              </div>
            </div>

            {enabled && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>שעת התזכורת</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  style={{ direction: 'ltr', width: 140 }}
                />
              </div>
            )}

            <button className="btn btn-primary" onClick={save}>
              {saved ? 'נשמר!' : 'שמור'}
            </button>

            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
              ההתראות פועלות רק כשהדפדפן פתוח
            </div>
          </div>
        )}
      </div>
    </>
  )
}