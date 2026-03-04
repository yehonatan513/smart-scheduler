import History from './components/History'
import Notifications from './components/Notifications'
import Stats from './components/Stats'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { calculateSchedule, getTodayHours } from './scheduler'
import Today from './components/Today'
import Subjects from './components/Subjects'
import Progress from './components/Progress'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('today')
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: subs }, { data: sess }] = await Promise.all([
      supabase.from('subjects').select('*').order('exam_date'),
      supabase.from('sessions').select('*')
    ])
    setSubjects(subs || [])
    setSessions(sess || [])
    setLoading(false)
  }

  const schedule = calculateSchedule(subjects, sessions)
  const todayStr = new Date().toISOString().split('T')[0]
  const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
  const dayName = DAYS[new Date().getDay()]
  const dateStr = new Date().toLocaleDateString('he-IL', { year:'numeric', month:'long', day:'numeric' })

  return (
    <div className="app">
      <header>
        <div className="logo">לוח זמנים חכם</div>
        <div className="date-badge">יום {dayName}, {dateStr}</div>
      </header>

      <div className="tabs">
        {[['today','היום'],['subjects','מקצועות'],['progress','התקדמות'],['stats','סטטיסטיקות'],['history','היסטוריה'],['settings','הגדרות']].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">טוען...</div>
      ) : (
        <>
          {tab === 'today' && <Today schedule={schedule} sessions={sessions} todayStr={todayStr} dailyHours={getTodayHours()} onUpdate={fetchAll} />}
          {tab === 'subjects' && <Subjects subjects={subjects} sessions={sessions} onUpdate={fetchAll} />}
          {tab === 'progress' && <Progress subjects={subjects} sessions={sessions} />}
          {tab === 'stats' && <Stats sessions={sessions} subjects={subjects} />}
          {tab === 'history' && <History sessions={sessions} subjects={subjects} onUpdate={fetchAll} />}
          {tab === 'settings' && <Notifications />}
        </>
      )}
    </div>
  )
}