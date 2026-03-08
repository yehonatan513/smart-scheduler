import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function History({ sessions, subjects, onUpdate }) {
  const [confirmId, setConfirmId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function deleteSession(id) {
    setSaving(true)
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    setSaving(false)
    if (error) return alert('שגיאה במחיקה: ' + error.message)
    setConfirmId(null)
    onUpdate()
  }

  function getSubjectName(id) {
    return subjects.find(s => s.id === id)?.name || 'מקצוע לא ידוע'
  }

  // קיבוץ לפי תאריך
  const completed = sessions.filter(s => s.completed)
  const byDate = {}
  completed.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  if (!sortedDates.length) return (
    <div className="empty">
      <div>אין היסטוריה עדיין. התחל ללמוד וסמן משימות כהושלמו.</div>
    </div>
  )

  return (
    <div>
      {confirmId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 28, width: 300, textAlign: 'center'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>למחוק את הרשומה?</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>
              פעולה זו לא ניתנת לביטול
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white', border: 'none' }} onClick={() => deleteSession(confirmId)} disabled={saving}>{saving ? 'מוחק...' : 'מחק'}</button>
              <button className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }} onClick={() => setConfirmId(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {sortedDates.map(date => {
        const daySessions = byDate[date]
        const totalHours = daySessions.reduce((sum, s) => sum + s.hours, 0)
        const d = new Date(date)
        const dateStr = d.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

        return (
          <div key={date} className="progress-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{dateStr}</div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                סה"כ {Math.round(totalHours * 10) / 10} שע'
              </div>
            </div>
            {daySessions.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--surface2)',
                borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)'
              }}>
                <div style={{ fontWeight: 500 }}>{getSubjectName(s.subject_id)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                    {s.hours} שע'
                  </span>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => setConfirmId(s.id)}
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}