import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    if (!email || !password) return setError('נא למלא אימייל וסיסמה')
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('נשלח אימייל אימות - בדוק את תיבת הדואר שלך')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('אימייל או סיסמה שגויים')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 400, background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32
      }}>
        <div style={{
          fontSize: 22, fontWeight: 900, marginBottom: 8, textAlign: 'center',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          לוח זמנים חכם
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 28 }}>
          {isSignUp ? 'צור חשבון חדש' : 'כניסה לחשבון'}
        </div>

        <button onClick={handleGoogle} style={{
          width: '100%', padding: '11px', border: '1px solid var(--border)',
          borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)',
          fontFamily: 'Heebo, sans-serif', fontSize: 14, cursor: 'pointer',
          marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          המשך עם Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>או</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>אימייל</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ direction: 'ltr' }} />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>סיסמה</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ direction: 'ltr' }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
        {message && <div style={{ color: 'var(--accent3)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{message}</div>}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'טוען...' : isSignUp ? 'הרשמה' : 'כניסה'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
          {isSignUp ? 'יש לך חשבון?' : 'אין לך חשבון?'}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', marginRight: 4 }} onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}>
            {isSignUp ? 'כנס' : 'הירשם'}
          </span>
        </div>
      </div>
    </div>
  )
}