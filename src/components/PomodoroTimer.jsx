import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { toLocalDateStr } from '../utils'

function Confetti({ active }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      r: Math.random() * 8 + 4,
      color: ['#6c63ff', '#ff6584', '#43e97b', '#ffa502', '#00d2ff'][Math.floor(Math.random() * 5)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 360,
      spin: Math.random() * 6 - 3,
    }))

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle * Math.PI / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6)
        ctx.restore()
        p.y += p.speed
        p.angle += p.spin
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width }
      })
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    const timeout = setTimeout(() => cancelAnimationFrame(animRef.current), 3500)
    return () => { cancelAnimationFrame(animRef.current); clearTimeout(timeout) }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }} />
}

export default function PomodoroTimer({ user, subjects, sessions, onUpdate }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | studying | break | done
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isBreak, setIsBreak] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [lastSavedHours, setLastSavedHours] = useState(0)
  const intervalRef = useRef(null)
  const audioCtx = useRef(null)
  const studiedSecondsRef = useRef(0)

  const todayStr = toLocalDateStr()

  function stopEarly() {
    const elapsed = studiedSecondsRef.current
    localStorage.removeItem('pomodoro_start')
    localStorage.removeItem('pomodoro_total')
    localStorage.removeItem('pomodoro_subject')
    localStorage.removeItem('pomodoro_is_break')
    if (elapsed > 60) endSession(elapsed)
    else { clearInterval(intervalRef.current); setPhase('idle') }
  }

  function playSound() {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch { }
  }

  const endSession = useCallback(async (studiedSeconds) => {
    clearInterval(intervalRef.current)
    const hours = Math.round((studiedSeconds / 3600) * 4) / 4
    if (hours < 0.25) {
      setPhase('idle')
      return
    }
    setSaving(true)
    const existing = sessions.find(s => s.subject_id === selectedSubject.id && s.date === todayStr)
    let error
    if (existing) {
      const newHours = Math.round((existing.hours + hours) * 4) / 4
        ; ({ error } = await supabase.from('sessions').update({ completed: true, hours: newHours }).eq('id', existing.id))
    } else {
      ; ({ error } = await supabase.from('sessions').insert({ subject_id: selectedSubject.id, date: todayStr, hours, completed: true, user_id: user.id }))
    }
    setSaving(false)
    if (error) { alert('שגיאה בשמירה: ' + error.message); return }
    setConfetti(true)
    playSound()
    setTimeout(() => setConfetti(false), 3500)
    setLastSavedHours(hours)
    setSavedMsg(true)
    setPhase('done')
    setModalOpen(true)
    onUpdate()
  }, [selectedSubject, sessions, todayStr, user, onUpdate])

  useEffect(() => {
    if (phase !== 'studying' && phase !== 'break') return
    clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      const start = Number(localStorage.getItem('pomodoro_start'))
      const total = Number(localStorage.getItem('pomodoro_total'))
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = Math.max(total - elapsed, 0)

      if (!isBreak) studiedSecondsRef.current = elapsed
      setSecondsLeft(remaining)

      if (remaining <= 0) {
        clearInterval(intervalRef.current)
        playSound()
        if (!isBreak) {
          const studiedSoFar = studiedSecondsRef.current
          const now = Date.now()
          localStorage.setItem('pomodoro_start', now)
          localStorage.setItem('pomodoro_total', breakMinutes * 60)
          localStorage.setItem('pomodoro_is_break', 'true')
          studiedSecondsRef.current = studiedSoFar
          setIsBreak(true)
          setPhase('break')
        } else {
          localStorage.removeItem('pomodoro_start')
          localStorage.removeItem('pomodoro_total')
          localStorage.removeItem('pomodoro_subject')
          localStorage.removeItem('pomodoro_is_break')
          endSession(studiedSecondsRef.current)
        }
      }
    }, 500)

    return () => clearInterval(intervalRef.current)
  }, [phase, isBreak, endSession, breakMinutes])

  useEffect(() => {
    const start = localStorage.getItem('pomodoro_start')
    const total = localStorage.getItem('pomodoro_total')
    const subject = localStorage.getItem('pomodoro_subject')
    const isBreakSaved = localStorage.getItem('pomodoro_is_break') === 'true'
    if (!start || !total || !subject) return

    const elapsed = Math.floor((Date.now() - Number(start)) / 1000)
    if (elapsed >= Number(total)) {
      localStorage.removeItem('pomodoro_start')
      return
    }
    setSelectedSubject(JSON.parse(subject))
    setIsBreak(isBreakSaved)
    setPhase(isBreakSaved ? 'break' : 'studying')
  }, [])

  const startTimeRef = useRef(null)
  const totalSecondsRef = useRef(0)

  function startStudying() {
    if (!selectedSubject) return
    setIsBreak(false)
    setSavedMsg(false)
    studiedSecondsRef.current = 0
    const now = Date.now()
    startTimeRef.current = now
    totalSecondsRef.current = workMinutes * 60
    localStorage.setItem('pomodoro_start', now)
    localStorage.setItem('pomodoro_total', workMinutes * 60)
    localStorage.setItem('pomodoro_break_total', breakMinutes * 60)
    localStorage.setItem('pomodoro_subject', JSON.stringify(selectedSubject))
    localStorage.setItem('pomodoro_is_break', 'false')
    setPhase('studying')
    setModalOpen(false)
  }

  function getNextSubject() {
    return subjects.find(s => s.id !== selectedSubject?.id &&
      (s.total_hours - sessions.filter(se => se.subject_id === s.id && se.completed).reduce((sum, se) => sum + se.hours, 0)) > 0
    ) || null
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const progress = isBreak
    ? 1 - secondsLeft / (breakMinutes * 60)
    : 1 - secondsLeft / (workMinutes * 60)
  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference * (1 - progress)

  const sortedSubjects = subjects.filter(s => {
    const remaining = s.total_hours - sessions.filter(se => se.subject_id === s.id && se.completed).reduce((sum, se) => sum + se.hours, 0)
    return remaining > 0 && new Date(s.exam_date) >= new Date()
  }).sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))

  const isActive = phase === 'studying' || phase === 'break'

  return (
    <>
      <Confetti active={confetti} />

      {/* Widget צף - תמיד מוצג */}
      {isActive ? (
        <div onClick={() => setModalOpen(true)} style={{
          position: 'fixed', bottom: 28, left: 28, zIndex: 200,
          background: isBreak ? 'var(--accent3)' : 'var(--accent)',
          borderRadius: 50, padding: '10px 18px',
          boxShadow: '0 4px 20px rgba(108,99,255,0.5)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          color: 'white', fontFamily: 'Heebo, sans-serif', userSelect: 'none',
          transition: 'all 0.2s'
        }}>
          <span style={{ fontSize: 18 }}>{isBreak ? '☕' : '⏱️'}</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            {isBreak ? 'הפסקה' : selectedSubject?.name}
          </span>
        </div>
      ) : (
        <button onClick={() => setModalOpen(true)} style={{
          position: 'fixed', bottom: 28, left: 28, width: 56, height: 56,
          borderRadius: '50%', background: 'var(--accent)', border: 'none',
          boxShadow: '0 4px 20px rgba(108,99,255,0.5)', cursor: 'pointer',
          fontSize: 24, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} title="פומודורו">
          ⏱️
        </button>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 20
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 32, width: '100%', maxWidth: 400,
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>טיימר פומודורו</div>
              <button onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-dim)' }}>
                ✕
              </button>
            </div>

            {phase === 'idle' && (
              <>
                <div className="form-group" style={{ marginBottom: 16, textAlign: 'right' }}>
                  <label>מקצוע</label>
                  <select value={selectedSubject?.id || ''} onChange={e => {
                    const found = subjects.find(s => String(s.id) === String(e.target.value))
                    setSelectedSubject(found)
                  }} style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none' }}>
                    <option value="">בחר מקצוע...</option>
                    {sortedSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.event_type})</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, textAlign: 'right' }}>
                  <div className="form-group">
                    <label>דקות לימוד</label>
                    <input type="number" min="5" max="90" value={workMinutes} onChange={e => setWorkMinutes(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>דקות הפסקה</label>
                    <input type="number" min="1" max="30" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} />
                  </div>
                </div>

                <button className="btn btn-primary" onClick={startStudying} disabled={!selectedSubject}>
                  התחל ללמוד
                </button>
              </>
            )}

            {isActive && (
              <>
                <div style={{ fontSize: 13, color: isBreak ? 'var(--accent3)' : 'var(--accent)', marginBottom: 16, fontWeight: 600 }}>
                  {isBreak ? 'הפסקה - נשום...' : `לומד: ${selectedSubject?.name}`}
                </div>

                <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 24px' }}>
                  <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="65" cy="65" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle cx="65" cy="65" r="54" fill="none"
                      stroke={isBreak ? 'var(--accent3)' : 'var(--accent)'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900 }}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                </div>

                {!isBreak && (
                  <button className="btn" onClick={stopEarly} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', width: '100%' }}>
                    עצור ושמור
                  </button>
                )}
              </>
            )}

            {phase === 'done' && (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>כל הכבוד!</div>
                {savedMsg && (
                  <div style={{ color: 'var(--accent3)', fontSize: 14, marginBottom: 20 }}>
                    נשמרו {lastSavedHours} שעות ל{selectedSubject?.name}
                  </div>
                )}

                {(() => {
                  const next = getNextSubject()
                  return next && (
                    <div style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>המקצוע הבא המומלץ:</div>
                      <div style={{ fontWeight: 700 }}>{next.name}</div>
                      <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => {
                        setSelectedSubject(next)
                        setSavedMsg(false)
                        setPhase('idle')
                      }}>
                        המשך ללמוד
                      </button>
                    </div>
                  )
                })()}

                <button className="btn" onClick={() => { setPhase('idle'); setSavedMsg(false); setModalOpen(false) }}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', width: '100%' }}>
                  סיימתי ללמוד
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}