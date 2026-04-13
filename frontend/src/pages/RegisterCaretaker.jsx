import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import { saveAuth, apiFetch } from '../utils/auth'

export default function RegisterCaretaker() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    inviteCode: params.get('codigo') || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [babyName, setBabyName] = useState('')
  const navigate = useNavigate()

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Informe seu nome')
    if (!form.email.trim()) return setError('Informe seu e-mail')
    if (form.password.length < 6) return setError('Senha deve ter pelo menos 6 caracteres')
    if (form.password !== form.confirmPassword) return setError('As senhas nao conferem')
    if (!form.inviteCode.trim()) return setError('Informe o codigo de convite')

    setLoading(true)
    try {
      const data = await apiFetch('/auth/register/caretaker', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          inviteCode: form.inviteCode.trim().toUpperCase(),
        })
      })
      saveAuth(data.token, data.role, data.caretakerName)
      navigate('/app/baba')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} aria-hidden><div style={styles.blob} /></div>

      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }} className="animate-up">
          <Logo size={40} />
        </div>

        <div className="card animate-up delay-1">
          <div style={styles.roleTag}>
            <span style={styles.roleIcon}>🤱</span>
            <span>Cadastro de baba / cuidadora</span>
          </div>

          <h2 style={styles.title}>Crie sua conta</h2>
          <p style={styles.subtitle}>Voce precisa de um codigo de convite enviado pelos pais.</p>

          {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Codigo de convite</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ex: AB12CD"
                value={form.inviteCode}
                onChange={set('inviteCode')}
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}
                maxLength={6}
              />
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">Seu nome</label>
              <input className="form-input" type="text" placeholder="Ex: Mirna" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="Minimo 6 caracteres" value={form.password} onChange={set('password')} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar senha</label>
              <input className="form-input" type="password" placeholder="Repita a senha" value={form.confirmPassword} onChange={set('confirmPassword')} />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p style={styles.footer}>
          Ja tem conta? <Link to="/">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden',
  },
  bg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' },
  blob: {
    position: 'absolute', bottom: '-20%', right: '-15%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'rgba(74,124,111,0.07)',
  },
  container: { width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 },
  roleTag: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'var(--green-bg)', color: 'var(--green-dark)',
    borderRadius: 100, padding: '6px 14px', fontSize: 13, fontWeight: 600,
    marginBottom: '1rem',
  },
  roleIcon: { fontSize: 16 },
  title: { fontSize: 20, marginBottom: '0.25rem' },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  footer: { textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: '1rem' },
}
