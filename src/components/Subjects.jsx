import { useState } from 'react'
import { supabase } from '../supabaseClient'
import GoogleCalendar from './GoogleCalendar'

export default function Subjects({ subjects, sessions, onUpdate }) {
  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [hours, setHours] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editHours, setEditHours] = useState('')

  async function addSubject() {
    if (!name || !examDate || !hours) return alert('נא למלא את כל השדות')
    await supabase.from('subjects').insert({ name, exam_date: examDate, total_hours: parseFloat(hours) })
    setName(''); setExamDate(''); setHours('')
    onUpdate()
  }

  async function deleteSubject(id) {
    if (!confirm('למחוק מקצוע זה?')) return
    await supabase.from('subjects').delete().eq('id', id)
    onUpdate()
  }

  function startEdit(s) {
    setEditId(s.id)
    setEditName(s.name)
    setEditDate(s.exam_date)
    setEditHours(s.total_hours)
  }

  async function saveEdit() {
    if (!editName || !editDate || !editHours) return alert('נא למלא את כל השדות')
    await supabase.from('subjects').update({
      name: editName,
      exam_date: editDate,
      total_hours: parseFloat(editHours)
    }).eq('id', editId)
    setEditId(null)
    onUpdate()
  }

  return (
    <div>
      <GoogleCalendar onUpdate={onUpdate} />

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
        </div>
        <button className="btn btn-primary" onClick={addSubject}>הוסף מקצוע</button>
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
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit}>שמור</button>
                <button className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }} onClick={() => setEditId(null)}>ביטול</button>
              </div>
            </div>
          )
        }

        return (
          <div key={s.id} className="subject-row">
            <div className="subject-row-name">{s.name}</div>
            <div className="subject-row-meta">
              <span>{new Date(s.exam_date).toLocaleDateString('he-IL')}</span>
              <span>{daysLeft} ימים</span>
              <span>{Math.round(done)}/{s.total_hours} שע'</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '6px 12px', fontSize: 12, borderRadius: 6 }} onClick={() => startEdit(s)}>עריכה</button>
              <button className="btn btn-danger" onClick={() => deleteSubject(s.id)}>הסר</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}