import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { saveAuth, apiFetch } from '../utils/auth'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      saveAuth(data.token, data.role, data.name)
      if (data.role === 'family') navigate('/app/familia')
      else if (data.role === 'caretaker') navigate('/app/baba')
      else if (data.role === 'doctor') navigate('/app/medica')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} aria-hidden><div style={styles.blob1} /><div style={styles.blob2} /></div>
      <div style={styles.container}>
        <div className="animate-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo size={52} withText />
          <p style={styles.tagline}>o diario do seu bebe, sempre por perto</p>
        </div>
        <div className="card animate-up delay-1">
          <h2 style={styles.cardTitle}>Entrar</h2>
          {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleLogin} style={styles.form}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <div className="divider">primeira vez aqui?</div>
          <div style={styles.registerOptions}>
            <Link to="/cadastro/familia">
              <button className="btn btn-outline" style={styles.registerBtn}>
                <span style={styles.btnIcon}>👨‍👩‍👧</span>
                <span><strong>Sou pai ou mae</strong><small style={styles.btnSub}>Cadastrar minha familia</small></span>
              </button>
            </Link>
            <Link to="/cadastro/baba">
              <button className="btn btn-outline" style={styles.registerBtn}>
                <span style={styles.btnIcon}>🤱</span>
                <span><strong>Sou baba ou cuidadora</strong><small style={styles.btnSub}>Tenho um codigo de convite</small></span>
              </button>
            </Link>
            <Link to="/cadastro/medica">
              <button className="btn btn-outline" style={styles.registerBtn}>
                <span style={styles.btnIcon}>🩺</span>
                <span><strong>Sou pediatra / medica</strong><small style={styles.btnSub}>Tenho um codigo de convite</small></span>
              </button>
            </Link>
          </div>
        </div>
        <p className="animate-up delay-3" style={styles.footer}>naninha &copy; {new Date().getFullYear()} — feito com carinho</p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' },
  bg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' },
  blob1: { position: 'absolute', top: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(74,124,111,0.08)' },
  blob2: { position: 'absolute', bottom: '-15%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(232,137,106,0.07)' },
  container: { width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 },
  tagline: { color: '#9BB0AA', fontSize: 14, marginTop: 8, fontFamily: "'Nunito', sans-serif" },
  cardTitle: { fontSize: 22, marginBottom: '1.25rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  registerOptions: { display: 'flex', flexDirection: 'column', gap: 10 },
  registerBtn: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, textAlign: 'left', padding: '12px 16px' },
  btnIcon: { fontSize: 24, flexShrink: 0 },
  btnSub: { display: 'block', fontWeight: 400, fontSize: 12, color: '#9BB0AA', marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 12, color: '#9BB0AA', marginTop: '1.5rem' },
}
