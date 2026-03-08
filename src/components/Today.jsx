import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Today({ schedule, sessions, todayStr, dailyHours, onUpdate, user }) {
  const [pendingItem, setPendingItem] = useState(null)
  const [actualHours, setActualHours] = useState('')
  const [saving, setSaving] = useState(false)
  const isSaturday = new Date().getDay() === 6

  if (isSaturday) return (
    <div className="shabbat">
      <h2>שבת שלום</h2>
      <p>שבת קודש - לא לומדים היום</p>
    </div>
  )

  function isDone(item) {
    const s = sessions.find(s => s.subject_id === item.id && s.date === todayStr)
    return s?.completed || false
  }

  async function confirmDone() {
    const hours = parseFloat(actualHours)
    if (!hours || hours <= 0) return alert('נא להזין שעות תקינות')
    setSaving(true)
    const item = pendingItem
    const existing = sessions.find(s => s.subject_id === item.id && s.date === todayStr)
    let error
    if (existing) {
      ({ error } = await supabase.from('sessions').update({ completed: true, hours }).eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('sessions').insert({ subject_id: item.id, date: todayStr, hours, completed: true, user_id: user.id }))
    }
    setSaving(false)
    if (error) return alert('שגיאה בשמירה: ' + error.message)
    setPendingItem(null)
    setActualHours('')
    onUpdate()
  }

  async function undoDone(item) {
    const existing = sessions.find(s => s.subject_id === item.id && s.date === todayStr)
    if (existing) {
      const { error } = await supabase.from('sessions').update({ completed: false }).eq('id', existing.id)
      if (error) return alert('שגיאה בביטול: ' + error.message)
    }
    onUpdate()
  }
  const urgentItems = schedule.filter(item => {
    if (item.event_type === 'בגרות') return item.daysLeft <= 7 && item.remaining > 7
    if (item.event_type === 'מתכונת') return item.daysLeft <= 3 && item.remaining > 3
    if (item.event_type === 'מבחן') return item.daysLeft <= 1 && item.remaining > 1
    return false
  })
  return (
    <div>
      {pendingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 28, width: 300, textAlign: 'center'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>כמה שעות למדת?</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 18 }}>
              {pendingItem.name} - הוצע {pendingItem.allocated} שע'
            </div>
            <input
              type="number"
              placeholder={`${pendingItem.allocated}`}
              value={actualHours}
              onChange={e => setActualHours(e.target.value)}
              min="0.5"
              step="0.5"
              style={{ marginBottom: 14, textAlign: 'center' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmDone} disabled={saving}>{saving ? 'שומר...' : 'אשר'}</button>
              <button className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }} onClick={() => { setPendingItem(null); setActualHours('') }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {urgentItems.length > 0 && (
        <div style={{
          background: 'rgba(255,71,87,0.1)',
          border: '1px solid rgba(255,71,87,0.4)',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 15 }}>
            אזהרה - אירועים קרובים
          </div>
          {urgentItems.map(item => (
            <div key={item.id} style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {item.name} ({item.event_type}) - עוד {item.daysLeft} ימים, נשארו {item.remaining} שעות
            </div>
          ))}
        </div>
      )}

      <div className="day-header">
        <div className="day-title">תוכנית ללימוד היום</div>
        <div className="hours-badge">{dailyHours} שעות פנויות</div>
      </div>

      {!schedule.length ? (
        <div className="empty">
          <div className="empty-icon">🎉</div>
          <div>אין מה ללמוד היום - כל המקצועות הושלמו</div>
        </div>
      ) : schedule.map(item => {
        const done = isDone(item)
        const session = sessions.find(s => s.subject_id === item.id && s.date === todayStr)
        return (
          <div key={item.id} className={`schedule-item ${done ? 'done' : ''}`}>
            <button className="check-btn" onClick={() => done ? undoDone(item) : (setPendingItem(item), setActualHours(String(item.allocated)))}>
              {done ? '✓' : ''}
            </button>
            <div className="subject-info">
              <div className="subject-name">{item.name}</div>
              <div className="subject-meta">
                <span style={{ color: item.daysLeft <= 7 ? '#ff4757' : item.daysLeft <= 21 ? '#ffa502' : '#7070a0' }}>
                  {item.daysLeft} ימים ל{item.event_type || 'מבחן'}
                </span>
                {done && session ? (
                  <span style={{ color: 'var(--accent3)' }}>למדת {session.hours} שע'</span>
                ) : (
                  <span>{item.remaining} שעות נשארו</span>
                )}
              </div>
              {item.notes && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6 }}>
                  {item.notes}
                </div>
              )}
            </div>
            <div className="hours-pill">{item.allocated} שע'</div>
          </div>
        )
      })}
    </div>
  )
}