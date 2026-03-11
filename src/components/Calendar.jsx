import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { toLocalDateStr } from '../utils'

const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

const TYPE_COLOR = {
  'בגרות': '#ff6584',
  'מתכונת': '#6c63ff',
  'מבחן': '#43e97b',
  'אירוע': '#ffa502',
  'יום הולדת': '#ff4757',
}

const EXAM_TYPES = ['מבחן', 'מתכונת', 'בגרות']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 40 // px per hour

export default function Calendar({ subjects, sessions, onUpdate, user }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [events, setEvents] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState('אירוע')
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formHours, setFormHours] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')

  async function loadEvents() {
    const { data, error } = await supabase.from('events').select('*').eq('user_id', user.id)
    if (error) return console.error('שגיאה בטעינת אירועים:', error.message)
    setEvents(data || [])
  }

  useEffect(() => { loadEvents() }, [])

  function getAllItemsForDate(dateStr) {
    const items = []
    subjects.forEach(s => {
      if (s.exam_date === dateStr)
        items.push({ ...s, _type: 'subject', color: TYPE_COLOR[s.event_type] || '#6c63ff', label: s.event_type })
    })
    const dateObj = new Date(dateStr)
    events.forEach(e => {
      const eDate = new Date(e.date)
      const matches = e.date === dateStr ||
        (e.recurring && eDate.getMonth() === dateObj.getMonth() && eDate.getDate() === dateObj.getDate())
      if (matches)
        items.push({ ...e, _type: 'event', color: TYPE_COLOR[e.type] || '#ffa502', label: e.type })
    })
    return items
  }

  function getStudyHoursForDate(dateStr) {
    return sessions.filter(s => s.date === dateStr && s.completed).reduce((sum, s) => sum + s.hours, 0)
  }

  function navigate(dir) {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  function openAdd(dateStr, hour = null) {
    setFormDate(dateStr)
    setFormTitle('')
    setFormNotes('')
    setFormRecurring(false)
    setFormHours('')
    setFormStartTime(hour !== null ? `${String(hour).padStart(2, '0')}:00` : '')
    setFormEndTime(hour !== null ? `${String(hour + 1).padStart(2, '0')}:00` : '')
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
    setFormHours(item.total_hours || '')
    setFormStartTime(item.start_time || '')
    setFormEndTime(item.end_time || '')
    setAddType(item._type === 'subject' ? (item.event_type || 'מבחן') : item.type)
    setShowAddModal(true)
  }

  async function saveItem() {
    if (!formTitle || !formDate) return alert('נא למלא שם ותאריך')
    setSaving(true)

    if (editItem) {
      if (editItem._type === 'subject') {
        if (!formHours) { setSaving(false); return alert('נא למלא שעות למידה') }
        const { error } = await supabase.from('subjects').update({
          name: formTitle, exam_date: formDate,
          total_hours: parseFloat(formHours), event_type: addType, notes: formNotes
        }).eq('id', editItem.id)
        if (error) { setSaving(false); return alert('שגיאה: ' + error.message) }
      } else {
        const { error } = await supabase.from('events').update({
          title: formTitle, date: formDate, type: addType, notes: formNotes,
          recurring: formRecurring, start_time: formStartTime || null, end_time: formEndTime || null
        }).eq('id', editItem.id)
        if (error) { setSaving(false); return alert('שגיאה: ' + error.message) }
        const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
        setEvents(data || [])
      }
    } else {
      if (EXAM_TYPES.includes(addType)) {
        if (!formHours) { setSaving(false); return alert('נא למלא שעות למידה') }
        const { error } = await supabase.from('subjects').insert({
          name: formTitle, exam_date: formDate,
          total_hours: parseFloat(formHours), event_type: addType, notes: formNotes, user_id: user.id
        })
        if (error) { setSaving(false); return alert('שגיאה: ' + error.message) }
      } else {
        const { error } = await supabase.from('events').insert({
          title: formTitle, date: formDate, type: addType,
          notes: formNotes, recurring: addType === 'יום הולדת' ? true : formRecurring,
          start_time: formStartTime || null, end_time: formEndTime || null, user_id: user.id
        })
        if (error) { setSaving(false); return alert('שגיאה: ' + error.message) }
        const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
        setEvents(data || [])
      }
    }

    setSaving(false)
    setShowAddModal(false)
    onUpdate()
  }

  async function deleteItem() {
    if (!editItem) return
    if (!confirm('למחוק?')) return
    setSaving(true)
    if (editItem._type === 'subject') {
      const { error } = await supabase.from('subjects').delete().eq('id', editItem.id)
      if (error) { setSaving(false); return alert('שגיאה: ' + error.message) }
    } else {
      const { error } = await supabase.from('events').delete().eq('id', editItem.id)
      if (error) { setSaving(false); return alert('שגיאה: ' + error.message) }
      const { data } = await supabase.from('events').select('*').eq('user_id', user.id)
      setEvents(data || [])
    }
    setSaving(false)
    setShowAddModal(false)
    onUpdate()
  }

  // המרת שעה "HH:MM" למספר דקות
  function timeToMinutes(t) {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  // קומפוננטת גריד שעות (משותפת ליום ושבוע)
  function TimeGrid({ days }) {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const todayStr = toLocalDateStr(today)

    return (
      <div style={{ display: 'flex', overflowY: 'auto', maxHeight: '80vh', position: 'relative' }}>
        {/* עמודת שעות */}
        <div style={{ width: 48, flexShrink: 0, paddingTop: 32 }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: -7 }}>
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* עמודות ימים */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, borderRight: '1px solid var(--border)' }}>
          {days.map((dayObj, di) => {
            const dateStr = toLocalDateStr(dayObj)
            const isToday = dateStr === todayStr
            const items = getAllItemsForDate(dateStr)
            const timedItems = items.filter(item => item.start_time)
            const allDayItems = items.filter(item => !item.start_time)

            return (
              <div key={di} style={{ borderLeft: '1px solid var(--border)', position: 'relative' }}>
                {/* כותרת יום */}
                <div style={{
                  height: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
                  background: 'var(--surface)', zIndex: 2
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{days.length > 1 ? DAYS_HE[dayObj.getDay()] : ''}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isToday ? 'white' : 'var(--text)',
                    background: isToday ? 'var(--accent)' : 'transparent',
                    borderRadius: '50%', width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{dayObj.getDate()}</span>
                </div>

                {/* אירועי כל היום */}
                {allDayItems.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--border)', padding: '2px 2px', minHeight: 24 }}>
                    {allDayItems.map((item, j) => (
                      <div key={j} onClick={() => openEdit(item)} style={{
                        fontSize: 10, background: item.color, color: 'white',
                        borderRadius: 3, padding: '1px 5px', marginBottom: 1,
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        cursor: 'pointer', fontWeight: 600
                      }}>
                        {item.name || item.title}
                      </div>
                    ))}
                  </div>
                )}

                {/* רשת שעות */}
                <div style={{ position: 'relative', height: HOUR_HEIGHT * 24 }}>
                  {HOURS.map(h => (
                    <div key={h} onClick={() => openAdd(dateStr, h)} style={{
                      position: 'absolute', top: h * HOUR_HEIGHT, left: 0, right: 0,
                      height: HOUR_HEIGHT, borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: h % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }} />
                  ))}

                  {/* קו "עכשיו" */}
                  {isToday && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0,
                      top: (nowMinutes / 60) * HOUR_HEIGHT,
                      height: 2, background: 'var(--accent)', zIndex: 3,
                      boxShadow: '0 0 6px var(--accent)'
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', marginTop: -4, marginRight: -5, float: 'right' }} />
                    </div>
                  )}

                  {/* אירועים עם שעה */}
                  {timedItems.map((item, j) => {
                    const start = timeToMinutes(item.start_time)
                    const end = timeToMinutes(item.end_time) || start + 60
                    const top = (start / 60) * HOUR_HEIGHT
                    const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 24)

                    return (
                      <div key={j} onClick={e => { e.stopPropagation(); openEdit(item) }}
                        style={{
                          position: 'absolute', left: 2, right: 2,
                          top, height,
                          background: item.color + 'dd',
                          borderRadius: 5, padding: '2px 6px',
                          overflow: 'hidden', cursor: 'pointer', zIndex: 1,
                          borderRight: `3px solid ${item.color}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                        }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name || item.title}
                        </div>
                        {height > 30 && (
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>
                            {item.start_time}{item.end_time ? ` - ${item.end_time}` : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const items = getAllItemsForDate(dateStr)
            const studyHours = getStudyHoursForDate(dateStr)
            const isToday = dateStr === toLocalDateStr(today)

            return (
              <div key={i} onClick={() => { setCurrentDate(new Date(dateStr)); setView('day') }}
                style={{
                  minHeight: 70, background: isToday ? 'rgba(108,99,255,0.15)' : 'var(--surface)',
                  border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 6px', cursor: 'pointer'
                }}>
                <div style={{ fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-dim)', fontWeight: isToday ? 700 : 400, marginBottom: 2 }}>{day}</div>
                {studyHours > 0 && <div style={{ width: '100%', height: 3, background: 'var(--accent3)', borderRadius: 2, marginBottom: 2, opacity: 0.7 }} />}
                {items.slice(0, 2).map((item, j) => (
                  <div key={j} style={{
                    fontSize: 10, background: `${item.color}22`, color: item.color,
                    borderRadius: 3, padding: '1px 4px', marginBottom: 1, fontWeight: 600,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                  }}>
                    {item.start_time && <span style={{ opacity: 0.7 }}>{item.start_time.slice(0, 5)} </span>}
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

  function WeekView() {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
    return <TimeGrid days={days} />
  }

  function DayView() {
    return <TimeGrid days={[currentDate]} />
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 2 }}>
          {[['month', 'חודש'], ['week', 'שבוע'], ['day', 'יום']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'Heebo, sans-serif', fontSize: 13, fontWeight: 500,
              background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? 'white' : 'var(--text-dim)', transition: 'all 0.2s'
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

      {view !== 'day' && view !== 'week' && (
        <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              {type}
            </div>
          ))}
        </div>
      )}

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

            {!EXAM_TYPES.includes(addType) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="form-group">
                  <label>שעת התחלה</label>
                  <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>שעת סיום</label>
                  <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
                </div>
              </div>
            )}

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
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveItem} disabled={saving}>
                {saving ? 'שומר...' : editItem ? 'שמור' : 'הוסף'}
              </button>
              {editItem && (
                <button className="btn btn-danger" onClick={deleteItem} disabled={saving}>{saving ? '...' : 'מחק'}</button>
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