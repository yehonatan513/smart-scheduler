import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { toLocalDateStr } from '../utils'

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default function Stats({ sessions, subjects }) {
  // שעות לפי יום השבוע האחרון
  const today = new Date()
  const weekData = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = toLocalDateStr(d)
    const hours = sessions
      .filter(s => s.date === dateStr && s.completed)
      .reduce((sum, s) => sum + s.hours, 0)
    weekData.push({
      day: DAYS_HE[d.getDay()],
      שעות: Math.round(hours * 10) / 10
    })
  }

  // סה"כ שעות השבוע
  const totalWeek = weekData.reduce((sum, d) => sum + d.שעות, 0)

  // סה"כ שעות כולל
  const totalAll = sessions
    .filter(s => s.completed)
    .reduce((sum, s) => sum + s.hours, 0)

  // מקצוע עם הכי הרבה שעות
  const subjectHours = subjects.map(s => {
    const done = sessions
      .filter(se => se.subject_id === s.id && se.completed)
      .reduce((sum, se) => sum + se.hours, 0)
    return { name: s.name, hours: Math.round(done * 10) / 10 }
  }).sort((a, b) => b.hours - a.hours)

  // ימים ברצף עם לימוד
  let streak = 0
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = toLocalDateStr(d)
    const studied = sessions.some(s => s.date === dateStr && s.completed)
    if (studied) streak++
    else break
  }

  return (
    <div>
      {/* כרטיסי סיכום */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'שעות השבוע', value: Math.round(totalWeek * 10) / 10 },
          { label: 'סה"כ שעות', value: Math.round(totalAll * 10) / 10 },
          { label: 'ימים ברצף', value: streak }
        ].map((item, i) => (
          <div key={i} className="progress-card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', marginBottom: 6 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* גרף שעות שבועי */}
      <div className="progress-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>שעות לימוד - 7 ימים אחרונים</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="שעות" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* התפלגות לפי מקצוע */}
      {subjectHours.length > 0 && (
        <div className="progress-card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>שעות לפי מקצוע</div>
          {subjectHours.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span>{s.name}</span>
                <span style={{ color: 'var(--accent)' }}>{s.hours} שע'</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: subjectHours[0].hours > 0 ? `${(s.hours / subjectHours[0].hours) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}