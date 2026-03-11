import { syncGoogleCalendar } from './components/GoogleCalendar'
import AuthPage from './components/Auth'
import WeeklySummary from './components/WeeklySummary'
import Calendar from './components/Calendar'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { calculateSchedule, getTodayHours } from './scheduler'
import { toLocalDateStr } from './utils'
import Today from './components/Today'
import Subjects from './components/Subjects'
import Progress from './components/Progress'
import Stats from './components/Stats'
import History from './components/History'
import Notifications from './components/Notifications'
import PomodoroTimer from './components/PomodoroTimer'
import './App.css'

const NAV_ITEMS = [
  { id: 'today', label: 'היום', icon: '📋' },
  { id: 'subjects', label: 'מקצועות', icon: '📚' },
  { id: 'progress', label: 'התקדמות', icon: '📈' },
  { id: 'stats', label: 'סטטיסטיקות', icon: '📊' },
  { id: 'weekly', label: 'סיכום שבועי', icon: '📆' },
  { id: 'calendar', label: 'לוח שנה', icon: '📅' },
  { id: 'history', label: 'היסטוריה', icon: '🕐' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

export default function App() {
  const [tab, setTab] = useState('today')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [settings, setSettings] = useState({ max_subjects_per_day: 3, min_hours_per_subject: 1 })
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    try {
      const [{ data: subs, error: e1 }, { data: sess, error: e2 }, { data: sets, error: e3 }] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id).order('exam_date'),
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      ])
      if (e1 || e2) {
        alert('שגיאה בטעינת הנתונים: ' + (e1?.message || e2?.message))
      }
      setSubjects(subs || [])
      setSessions(sess || [])
      if (sets && !e3) setSettings(sets)
    } catch (err) {
      alert('שגיאה בטעינת הנתונים')
    }
    setLoading(false)
  }

  const schedule = useMemo(() => calculateSchedule(subjects, sessions, settings), [subjects, sessions, settings])
  const todayStr = toLocalDateStr()
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const dayName = DAYS[new Date().getDay()]
  const dateStr = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  function navigate(id) {
    setTab(id)
    setSidebarOpen(false)
  }
  if (authLoading) return <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>טוען...</div>
  if (!user) return <AuthPage />
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
        <nav className="sidebar-nav" style={{ flex: 1 }}>
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
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, padding: '0 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <button className="nav-item" onClick={async () => {
            const { error } = await supabase.auth.signOut()
            if (error) alert('שגיאה בהתנתקות: ' + error.message)
          }}>
            <span className="nav-icon">🚪</span>
            <span>התנתק</span>
          </button>
        </div>
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
              {tab === 'today' && <Today schedule={schedule} sessions={sessions} todayStr={todayStr} dailyHours={getTodayHours()} onUpdate={fetchAll} user={user} />}
              {tab === 'subjects' && <Subjects subjects={subjects} sessions={sessions} onUpdate={fetchAll} user={user} />}
              {tab === 'progress' && <Progress subjects={subjects} sessions={sessions} />}
              {tab === 'stats' && <Stats sessions={sessions} subjects={subjects} />}
              {tab === 'weekly' && <WeeklySummary sessions={sessions} subjects={subjects} />}
              {tab === 'calendar' && <Calendar subjects={subjects} sessions={sessions} onUpdate={fetchAll} user={user} />}
              {tab === 'history' && <History sessions={sessions} subjects={subjects} onUpdate={fetchAll} />}
              {tab === 'settings' && <Notifications darkMode={darkMode} setDarkMode={setDarkMode} user={user} settings={settings} onSettingsUpdate={fetchAll} subjects={subjects} events={[]} />}            </>
          )}
        </div>
      </div>
      {user && !loading && (
        <PomodoroTimer user={user} subjects={subjects} sessions={sessions} onUpdate={fetchAll} />
      )}
    </div>
  )
}