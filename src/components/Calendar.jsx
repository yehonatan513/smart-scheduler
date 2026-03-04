import { useState } from 'react'

const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const TYPE_COLOR = {
  'בגרות': 'var(--accent2)',
  'מתכונת': 'var(--accent)',
  'מבחן': 'var(--accent3)',
}

export default function Calendar({ subjects }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const examsByDate = {}
  subjects.forEach(s => {
    const d = new Date(s.exam_date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!examsByDate[day]) examsByDate[day] = []
      examsByDate[day].push(s)
    }
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn" onClick={nextMonth} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px' }}>
          הבא
        </button>
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          {MONTHS_HE[month]} {year}
        </div>
        <button className="btn" onClick={prevMonth} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px' }}>
          הקודם
        </button>
      </div>

      {/* ימי שבוע */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAYS_HE.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', padding: '6px 0', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      {/* תאים */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => (
          <div key={i} style={{
            minHeight: 64,
            background: day && isToday(day) ? 'rgba(108,99,255,0.15)' : 'var(--surface)',
            border: `1px solid ${day && isToday(day) ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
            padding: '6px 8px',
          }}>
            {day && (
              <>
                <div style={{ fontSize: 12, color: isToday(day) ? 'var(--accent)' : 'var(--text-dim)', fontWeight: isToday(day) ? 700 : 400, marginBottom: 4 }}>
                  {day}
                </div>
                {(examsByDate[day] || []).map((s, j) => (
                  <div key={j} style={{
                    fontSize: 10,
                    background: `${TYPE_COLOR[s.event_type] || 'var(--accent)'}22`,
                    color: TYPE_COLOR[s.event_type] || 'var(--accent)',
                    borderRadius: 4,
                    padding: '2px 4px',
                    marginBottom: 2,
                    fontWeight: 600,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}>
                    {s.name}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      {/* מקרא */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {type}
          </div>
        ))}
      </div>
    </div>
  )
}