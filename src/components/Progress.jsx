export default function Progress({ subjects, sessions }) {
  if (!subjects.length) return (
    <div className="empty"><div>אין מקצועות עדיין</div></div>
  )

  return (
    <div>
      {subjects.map(s => {
        const done = sessions
          .filter(se => se.subject_id === s.id && se.completed)
          .reduce((sum, se) => sum + se.hours, 0)
        const pct = Math.min(100, Math.round(done / s.total_hours * 100))
        const daysLeft = Math.ceil((new Date(s.exam_date) - new Date()) / 86400000)
        const daysClass = daysLeft <= 7 ? 'days-urgent' : daysLeft <= 21 ? 'days-warn' : 'days-ok'

        return (
          <div key={s.id} className="progress-card">
            <div className="progress-header">
              <div className="progress-name">{s.name}</div>
              <div className="progress-pct">{pct}%</div>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-footer">
              <span>{Math.round(done)} מתוך {s.total_hours} שעות</span>
              <span className={`days-left ${daysClass}`}>{Math.max(0, daysLeft)} ימים ל{s.event_type || 'מבחן'}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}