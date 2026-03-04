import Calendar from './components/Calendar'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { calculateSchedule, getTodayHours } from './scheduler'
import Today from './components/Today'
import Subjects from './components/Subjects'
import Progress from './components/Progress'
import Stats from './components/Stats'
import History from './components/History'
import Notifications from './components/Notifications'
import './App.css'

const NAV_ITEMS = [
  { id: 'today', label: 'היום', icon: '📋' },
  { id: 'subjects', label: 'מקצועות', icon: '📚' },
  { id: 'progress', label: 'התקדמות', icon: '📈' },
  { id: 'stats', label: 'סטטיסטיקות', icon: '📊' },
  { id: 'calendar', label: 'לוח שנה', icon: '📅' },
  { id: 'history', label: 'היסטוריה', icon: '🕐' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

export default function App() {
  const [tab, setTab] = useState('today')
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchAll() }, [])

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

  function navigate(id) {
    setTab(id)
    setSidebarOpen(false)
  }

  return (
    <div className="layout">
      {/* Overlay למובייל */}
      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">לוח זמנים חכם</div>
        <div className="sidebar-date">יום {dayName}, {dateStr}</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <div className="topbar-title">
            {NAV_ITEMS.find(i => i.id === tab)?.label}
          </div>
        </div>

        <div className="content">
          {loading ? (
            <div className="loading">טוען...</div>
          ) : (
            <>
              {tab === 'today' && <Today schedule={schedule} sessions={sessions} todayStr={todayStr} dailyHours={getTodayHours()} onUpdate={fetchAll} />}
              {tab === 'subjects' && <Subjects subjects={subjects} sessions={sessions} onUpdate={fetchAll} />}
              {tab === 'progress' && <Progress subjects={subjects} sessions={sessions} />}
              {tab === 'stats' && <Stats sessions={sessions} subjects={subjects} />}
              {tab === 'calendar' && <Calendar subjects={subjects} />}
              {tab === 'history' && <History sessions={sessions} subjects={subjects} onUpdate={fetchAll} />}
              {tab === 'settings' && <Notifications />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}