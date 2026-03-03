import { useState, useEffect } from 'react'

export default function Notifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const [time, setTime] = useState(localStorage.getItem('notif_time') || '08:00')
  const [enabled, setEnabled] = useState(localStorage.getItem('notif_enabled') === 'true')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => {
      const now = new Date()
      const current = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      if (current === time && permission === 'granted') {
        new Notification('לוח זמנים חכם', {
          body: 'זמן ללמוד! פתח את האפליקציה לתוכנית היום שלך.',
          icon: '/favicon.ico'
        })
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [enabled, time, permission])

  async function requestPermission() {
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  function save() {
    localStorage.setItem('notif_time', time)
    localStorage.setItem('notif_enabled', enabled)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="form-card">
      <div className="form-title">התראות יומיות</div>

      {permission === 'denied' ? (
        <div style={{ color: 'var(--danger)', fontSize: 13 }}>
          חסמת התראות בדפדפן. כדי להפעיל - שנה בהגדרות הדפדפן.
        </div>
      ) : permission !== 'granted' ? (
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>
            צריך אישור לשלוח התראות
          </div>
          <button className="btn btn-primary" onClick={requestPermission}>
            אפשר התראות
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <label style={{ fontSize: 14, color: 'var(--text-dim)' }}>הפעל תזכורת יומית</label>
            <div
              onClick={() => setEnabled(!enabled)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: enabled ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                right: enabled ? 3 : 'auto',
                left: enabled ? 'auto' : 3,
                transition: 'all 0.2s'
              }} />
            </div>
          </div>

          {enabled && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>שעת התזכורת</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{ direction: 'ltr', width: 140 }}
              />
            </div>
          )}

          <button className="btn btn-primary" onClick={save}>
            {saved ? 'נשמר!' : 'שמור'}
          </button>

          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
            ההתראות פועלות רק כשהדפדפן פתוח
          </div>
        </div>
      )}
    </div>
  )
}