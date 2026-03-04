import { useState } from 'react'
import { supabase } from '../supabaseClient'

const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const TYPE_COLOR = {
  'בגרות': '#ff6584',
  'מתכונת': '#6c63ff',
  'מבחן': '#43e97b',
  'אירוע': '#ffa502',
  'יום הולדת': '#ff4757',
}

const EXAM_TYPES = ['מבחן', 'מתכונת', 'בגרות']
const EVENT_TYPES = ['אירוע', 'יום הולדת']

export default function Calendar({ subjects, sessions, onUpdate, user }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [addType, setAddType] = useState('אירוע')
  const [editItem, setEditItem] = useState(null)

  // טופס הוספה
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formExamType, setFormExamType] = useState('מבחן')
  const [formHours, setFormHours] = useState('')

  async function loadEvents() {
    if (eventsLoaded) return
    const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
    setEvents(data || [])
    setEventsLoaded(true)
  }

  useState(() => { loadEvents() }, [])

  // כל האירועים ביחד
  function getAllItemsForDate(dateStr) {
    const items = []

    // בחינות מ-subjects
    subjects.forEach(s => {
      if (s.exam_date === dateStr) {
        items.push({ ...s, _type: 'subject', color: TYPE_COLOR[s.event_type] || '#6c63ff', label: s.event_type })
      }
    })

    // אירועים רגילים
    const dateObj = new Date(dateStr)
    events.forEach(e => {
      const eDate = new Date(e.date)
      const matches = e.date === dateStr ||
        (e.recurring && eDate.getMonth() === dateObj.getMonth() && eDate.getDate() === dateObj.getDate())
      if (matches) {
        items.push({ ...e, _type: 'event', color: TYPE_COLOR[e.type] || '#ffa502', label: e.type })
      }
    })

    return items
  }

  function getStudyHoursForDate(dateStr) {
    return sessions
      .filter(s => s.date === dateStr && s.completed)
      .reduce((sum, s) => sum + s.hours, 0)
  }

  function navigate(dir) {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  function openAdd(dateStr) {
    setAddDate(dateStr)
    setFormDate(dateStr)
    setFormTitle('')
    setFormNotes('')
    setFormRecurring(false)
    setFormExamType('מבחן')
    setFormHours('')
    setAddType('אירוע')
    setEditItem(null)
    setShowAddModal(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setFormTitle(item.name || item.title)
    setFormDate(item.exam_date || item.date)
    setFormNotes(item.notes || '')
    setFormRecurring(item.recurring || false)
    setFormExamType(item.event_type || 'מבחן')
    setFormHours(item.total_hours || '')
    setAddType(item._type === 'subject' ? 'בחינה' : item.type)
    setShowAddModal(true)
  }

  async function saveItem() {
    if (!formTitle || !formDate) return alert('נא למלא שם ותאריך')

    if (editItem) {
      if (editItem._type === 'subject') {
        if (!formHours) return alert('נא למלא שעות למידה')
        await supabase.from('subjects').update({
          name: formTitle, exam_date: formDate,
          total_hours: parseFloat(formHours), event_type: formExamType, notes: formNotes
        }).eq('id', editItem.id)
      } else {
        await supabase.from('events').update({
          title: formTitle, date: formDate, type: addType, notes: formNotes, recurring: formRecurring
        }).eq('id', editItem.id)
        const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
        setEvents(data || [])
      }
    } else {
      if (EXAM_TYPES.includes(addType)) {
        if (!formHours) return alert('נא למלא שעות למידה')
        await supabase.from('subjects').insert({
          name: formTitle, exam_date: formDate,
          total_hours: parseFloat(formHours), event_type: addType, notes: formNotes, user_id: user.id
        })
      } else {
        await supabase.from('events').insert({
          title: formTitle, date: formDate, type: addType,
          notes: formNotes, recurring: addType === 'יום הולדת' ? true : formRecurring, user_id: user.id
        })
        const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
        setEvents(data || [])
      }
    }

    setShowAddModal(false)
    onUpdate()
  }

  async function deleteItem() {
    if (!editItem) return
    if (!confirm('למחוק?')) return
    if (editItem._type === 'subject') {
      await supabase.from('subjects').delete().eq('id', editItem.id)
    } else {
      await supabase.from('events').delete().eq('id', editItem.id)
      const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
      setEvents(data || [])
    }
    setShowAddModal(false)
    onUpdate()
  }

  // תצוגת חודש
  function MonthView() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let i = 1; i <= daysInMonth; i++) cells.push(i)

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DAYS_HE.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', padding: '6px 0', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const items = getAllItemsForDate(dateStr)
            const studyHours = getStudyHoursForDate(dateStr)
            const isToday = dateStr === today.toISOString().split('T')[0]
            const isPast = new Date(dateStr) < today

            return (
              <div key={i} onClick={() => { setSelectedDay(dateStr); setView('day'); setCurrentDate(new Date(dateStr)) }}
                style={{
                  minHeight: 70, background: isToday ? 'rgba(108,99,255,0.15)' : 'var(--surface)',
                  border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 6px', cursor: 'pointer', transition: 'border-color 0.2s'
                }}>
                <div style={{ fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-dim)', fontWeight: isToday ? 700 : 400, marginBottom: 2 }}>{day}</div>
                {studyHours > 0 && <div style={{ width: '100%', height: 3, background: 'var(--accent3)', borderRadius: 2, marginBottom: 2, opacity: 0.7 }} />}
                {items.slice(0, 2).map((item, j) => (
                  <div key={j} style={{
                    fontSize: 10, background: `${item.color}22`, color: item.color,
                    borderRadius: 3, padding: '1px 4px', marginBottom: 1, fontWeight: 600,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                  }}>
                    {item.name || item.title}
                  </div>
                ))}
                {items.length > 2 && <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>+{items.length - 2}</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // תצוגת שבוע
  function WeekView() {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0]
          const items = getAllItemsForDate(dateStr)
          const studyHours = getStudyHoursForDate(dateStr)
          const isToday = dateStr === today.toISOString().split('T')[0]

          return (
            <div key={i} onClick={() => { setCurrentDate(d); setView('day') }}
              style={{
                background: isToday ? 'rgba(108,99,255,0.15)' : 'var(--surface)',
                border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: 10, cursor: 'pointer', minHeight: 120
              }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{DAYS_HE[i]}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text)', marginBottom: 6 }}>{d.getDate()}</div>
              {studyHours > 0 && <div style={{ fontSize: 11, color: 'var(--accent3)', marginBottom: 4 }}>{studyHours} שע' למידה</div>}
              {items.map((item, j) => (
                <div key={j} onClick={e => { e.stopPropagation(); openEdit(item) }}
                  style={{
                    fontSize: 11, background: `${item.color}22`, color: item.color,
                    borderRadius: 4, padding: '3px 6px', marginBottom: 3, fontWeight: 600,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                  }}>
                  {item.name || item.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // תצוגת יום
  function DayView() {
    const dateStr = currentDate.toISOString().split('T')[0]
    const items = getAllItemsForDate(dateStr)
    const studyHours = getStudyHoursForDate(dateStr)
    const isFuture = currentDate > today
    const isToday = dateStr === today.toISOString().split('T')[0]

    const dayName = DAYS_FULL[currentDate.getDay()]
    const dateFormatted = currentDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>יום {dayName}, {dateFormatted}</div>
          {isToday && <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 4 }}>היום</div>}
        </div>

        {studyHours > 0 && (
          <div style={{ background: 'rgba(67,233,123,0.1)', border: '1px solid rgba(67,233,123,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--accent3)' }}>
            למדת {studyHours} שעות ביום זה
          </div>
        )}

        {!items.length ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 16 }}>אין אירועים ביום זה</div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {items.map((item, i) => (
              <div key={i} onClick={() => openEdit(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', background: 'var(--surface)',
                  border: `1px solid ${item.color}44`, borderRadius: 10,
                  marginBottom: 8, cursor: 'pointer'
                }}>
                <div style={{ width: 4, height: 40, background: item.color, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name || item.title}</div>
                  <div style={{ fontSize: 12, color: item.color, marginTop: 2 }}>{item.label}</div>
                  {item.notes && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{item.notes}</div>}
                  {item._type === 'subject' && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{item.total_hours} שעות למידה משוערות</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary" onClick={() => openAdd(dateStr)}>
          הוסף אירוע ליום זה
        </button>
      </div>
    )
  }

  // כותרת ניווט
  function getNavTitle() {
    if (view === 'month') return `${MONTHS_HE[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'week') {
      const start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.getDate()} - ${end.getDate()} ${MONTHS_HE[end.getMonth()]}`
    }
    return currentDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div>
      {/* מתג תצוגה */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 2 }}>
          {[['month','חודש'],['week','שבוע'],['day','יום']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif', fontSize: 13, fontWeight: 500,
              background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? 'white' : 'var(--text-dim)',
              transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn" onClick={() => navigate(-1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 14px' }}>הקודם</button>
          <div style={{ fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: 'center' }}>{getNavTitle()}</div>
          <button className="btn" onClick={() => navigate(1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 14px' }}>הבא</button>
        </div>

        <button className="btn" onClick={() => { setCurrentDate(new Date()); setView('day') }}
          style={{ background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '6px 14px' }}>
          היום
        </button>
      </div>

      {view === 'month' && <MonthView />}
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}

      {/* מקרא */}
      {view !== 'day' && (
        <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              {type}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ width: 20, height: 3, background: 'var(--accent3)', borderRadius: 2 }} />
            יום לימוד
          </div>
        </div>
      )}

      {/* מודל הוספה/עריכה */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>
              {editItem ? 'עריכת אירוע' : 'הוספת אירוע'}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>סוג</label>
              <select value={addType} onChange={e => setAddType(e.target.value)} style={{
                width: '100%', padding: '10px 14px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none'
              }}>
                <option value="אירוע">אירוע רגיל</option>
                <option value="יום הולדת">יום הולדת</option>
                <option value="מבחן">מבחן</option>
                <option value="מתכונת">מתכונת</option>
                <option value="בגרות">בגרות</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>שם</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={EXAM_TYPES.includes(addType) ? 'מתמטיקה' : 'תיאור האירוע'} />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>תאריך</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>

            {EXAM_TYPES.includes(addType) && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>שעות למידה משוערות</label>
                <input type="number" value={formHours} onChange={e => setFormHours(e.target.value)} placeholder="20" min="1" />
              </div>
            )}

            {addType === 'יום הולדת' && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12, padding: '6px 10px', background: 'rgba(108,99,255,0.1)', borderRadius: 6 }}>
                יום הולדת יחזור אוטומטית כל שנה
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label>הערות</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveItem}>
                {editItem ? 'שמור' : 'הוסף'}
              </button>
              {editItem && (
                <button className="btn btn-danger" onClick={deleteItem}>מחק</button>
              )}
              <button className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }} onClick={() => setShowAddModal(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}