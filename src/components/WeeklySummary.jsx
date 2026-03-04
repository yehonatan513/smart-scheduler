const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default function WeeklySummary({ sessions, subjects }) {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // תחילת השבוע הנוכחי (ראשון)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  // שעות מתוכננות לפי ימים שעברו השבוע
  const DAILY_PLANNED = { 0: 5.5, 1: 3.5, 2: 5.5, 3: 3.5, 4: 5.5, 5: 2.0, 6: 0 }
  let totalPlanned = 0
  for (let i = 0; i <= dayOfWeek; i++) {
    totalPlanned += DAILY_PLANNED[i] || 0
  }

  // שעות בפועל השבוע
  const weekSessions = sessions.filter(s => {
    const d = new Date(s.date)
    return s.completed && d >= startOfWeek && d <= endOfWeek
  })
  const totalActual = weekSessions.reduce((sum, s) => sum + s.hours, 0)

  // פירוט לפי יום
  const byDay = []
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const hours = sessions
      .filter(s => s.date === dateStr && s.completed)
      .reduce((sum, s) => sum + s.hours, 0)
    byDay.push({ day: DAYS_HE[i], hours, planned: DAILY_PLANNED[i] || 0 })
  }

  // פירוט לפי מקצוע
  const bySubject = subjects.map(s => {
    const hours = weekSessions
      .filter(se => se.subject_id === s.id)
      .reduce((sum, se) => sum + se.hours, 0)
    return { name: s.name, hours: Math.round(hours * 10) / 10 }
  }).filter(s => s.hours > 0).sort((a, b) => b.hours - a.hours)

  const pct = totalPlanned > 0 ? Math.min(100, Math.round(totalActual / totalPlanned * 100)) : 0
  const startStr = startOfWeek.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
  const endStr = endOfWeek.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })

  return (
    <div>
      {/* כותרת */}
      <div style={{ marginBottom: 20, color: 'var(--text-dim)', fontSize: 13 }}>
        {startStr} - {endStr}
      </div>

      {/* כרטיסי סיכום */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'שעות בפועל', value: Math.round(totalActual * 10) / 10 },
          { label: 'שעות מתוכננות', value: Math.round(totalPlanned * 10) / 10 },
          { label: 'אחוז ביצוע', value: `${pct}%` },
        ].map((item, i) => (
          <div key={i} className="progress-card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', marginBottom: 6 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* פס התקדמות כללי */}
      <div className="progress-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 700 }}>
          <span>התקדמות שבועית</span>
          <span style={{ color: pct >= 80 ? 'var(--accent3)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)' }}>{pct}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* פירוט יומי */}
      <div className="progress-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>פירוט יומי</div>
        {byDay.map((d, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{d.day}</span>
              <span style={{ color: 'var(--text-dim)' }}>{d.hours} / {d.planned} שע'</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{
                width: d.planned > 0 ? `${Math.min(100, d.hours / d.planned * 100)}%` : '0%',
                background: d.hours >= d.planned ? 'var(--accent3)' : 'linear-gradient(90deg, var(--accent), var(--accent2))'
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* פירוט לפי מקצוע */}
      {bySubject.length > 0 && (
        <div className="progress-card">
          <div style={{ fontWeight: 700, marginBottom: 14 }}>לפי מקצוע השבוע</div>
          {bySubject.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < bySubject.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 14 }}>
              <span>{s.name}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.hours} שע'</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}