import { useState } from 'react'
import { supabase } from '../supabaseClient'


export default function Subjects({ subjects, sessions, onUpdate, user }) {
  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [hours, setHours] = useState('')
  const [eventType, setEventType] = useState('מבחן')
  const [notes, setNotes] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editEventType, setEditEventType] = useState('מבחן')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function addSubject() {
    if (!name || !examDate || !hours) return alert('נא למלא את כל השדות')
    setSaving(true)
    const { error } = await supabase.from('subjects').insert({ name, exam_date: examDate, total_hours: parseFloat(hours), event_type: eventType, notes, user_id: user.id })
    setSaving(false)
    if (error) return alert('שגיאה בהוספת מקצוע: ' + error.message)
    setName(''); setExamDate(''); setHours(''); setEventType('מבחן'); setNotes('')
    onUpdate()
  }

  async function deleteSubject(id) {
    if (!confirm('למחוק מקצוע זה?')) return
    setSaving(true)
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    setSaving(false)
    if (error) return alert('שגיאה במחיקה: ' + error.message)
    onUpdate()
  }

  function startEdit(s) {
    setEditId(s.id)
    setEditName(s.name)
    setEditDate(s.exam_date)
    setEditHours(s.total_hours)
    setEditEventType(s.event_type || 'מבחן')
    setEditNotes(s.notes || '')
  }

  async function saveEdit() {
    if (!editName || !editDate || !editHours) return alert('נא למלא את כל השדות')
    setSaving(true)
    const { error } = await supabase.from('subjects').update({
      name: editName,
      exam_date: editDate,
      total_hours: parseFloat(editHours),
      event_type: editEventType,
      notes: editNotes
    }).eq('id', editId)
    setSaving(false)
    if (error) return alert('שגיאה בעדכון: ' + error.message)
    setEditId(null)
    onUpdate()
  }

  return (
    <div>

      <div className="form-card">
        <div className="form-title">הוסף מקצוע</div>
        <div className="form-grid">
          <div className="form-group">
            <label>שם המקצוע</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="מתמטיקה" />
          </div>
          <div className="form-group">
            <label>תאריך בגרות</label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>שעות למידה משוערות</label>
            <input type="number" value={hours} onChange={e => setHours(e.target.value)} placeholder="20" min="1" />
          </div>
          <div className="form-group">
            <label>סוג אירוע</label>
            <select value={eventType} onChange={e => setEventType(e.target.value)} style={{
              width: '100%', padding: '10px 14px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
              fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none'
            }}>
              <option value="מבחן">מבחן</option>
              <option value="מתכונת">מתכונת</option>
              <option value="בגרות">בגרות</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>הערות</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="נושאים חשובים, מה צריך לחזור, חולשות..."
              rows={2}
              style={{
                width: '100%', padding: '10px 14px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={addSubject} disabled={saving}>{saving ? 'שומר...' : 'הוסף מקצוע'}</button>
      </div>

      {!subjects.length ? (
        <div className="empty"><div>אין מקצועות עדיין</div></div>
      ) : subjects.map(s => {
        const done = sessions.filter(se => se.subject_id === s.id && se.completed).reduce((sum, se) => sum + se.hours, 0)
        const daysLeft = Math.ceil((new Date(s.exam_date) - new Date()) / 86400000)

        if (editId === s.id) {
          return (
            <div key={s.id} className="form-card" style={{ marginBottom: 8 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>שם המקצוע</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>תאריך בגרות</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>שעות למידה</label>
                  <input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} min="1" />
                </div>
                <div className="form-group">
                  <label>סוג אירוע</label>
                  <select value={editEventType} onChange={e => setEditEventType(e.target.value)} style={{
                    width: '100%', padding: '10px 14px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                    fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none'
                  }}>
                    <option value="מבחן">מבחן</option>
                    <option value="מתכונת">מתכונת</option>
                    <option value="בגרות">בגרות</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>הערות</label>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                      fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit} disabled={saving}>{saving ? 'שומר...' : 'שמור'}</button>
                <button className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }} onClick={() => setEditId(null)}>ביטול</button>
              </div>
            </div>
          )
        }

        return (
          <div key={s.id} className="subject-row">
            <div>
              <div className="subject-row-name">{s.name}</div>
              {s.notes && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{s.notes.length > 60 ? s.notes.slice(0, 60) + '...' : s.notes}</div>}
            </div>
            <div className="subject-row-meta">
              <span>{new Date(s.exam_date).toLocaleDateString('he-IL')}</span>
              <span>{daysLeft > 0 ? `${daysLeft} ימים` : 'עבר'}</span>
              <span>{Math.round(done)}/{s.total_hours} שע'</span>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: s.event_type === 'בגרות' ? 'rgba(255,101,132,0.15)' : s.event_type === 'מתכונת' ? 'rgba(108,99,255,0.15)' : 'rgba(112,112,160,0.15)',
                color: s.event_type === 'בגרות' ? 'var(--accent2)' : s.event_type === 'מתכונת' ? 'var(--accent)' : 'var(--text-dim)'
              }}>
                {s.event_type || 'מבחן'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '6px 12px', fontSize: 12, borderRadius: 6 }} onClick={() => startEdit(s)}>עריכה</button>
              <button className="btn btn-danger" onClick={() => deleteSubject(s.id)} disabled={saving}>{saving ? '...' : 'הסר'}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}